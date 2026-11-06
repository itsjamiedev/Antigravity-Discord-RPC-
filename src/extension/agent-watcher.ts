/**
 * AgentWatcher — Hookless Antigravity Agent Activity Monitor
 *
 * Discovers and tracks active agents across all Antigravity workspaces
 * by reading transcript timestamps, conversation database metadata, and exact tokens.
 * Requires 0 hooks and 0 native C++ dependencies.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import type { TokenUsageRecord } from '../shared/types.js';
import { formatModelDisplayName } from '../discord/presence-manager.js';

export interface ActiveAgentInfo {
  conversationId: string;
  lastActiveMs: number;
  model: string;
  stepIndex?: number;
  tokens: TokenUsageRecord;
  modelTokens?: Record<string, TokenUsageRecord>;
  modelsUsed?: string[];
  dailyTokens?: Record<string, TokenUsageRecord>;
  activeTool?: string | null;
  status?: 'thinking' | 'running_tool' | 'idle' | 'error';
  recentEvents?: Array<{
    type: string;
    toolName?: string | null;
    timestamp: string;
  }>;
}

export interface AgentWatcherState {
  activeAgentCount: number;
  activeModels: string[];
  totalTokens: TokenUsageRecord;
  isAgentActive: boolean;
  agents: ActiveAgentInfo[];
  allConversations?: ActiveAgentInfo[];
}

export interface AgentWatcherOptions {
  brainDir?: string;
  pollIntervalMs?: number;
  activeThresholdMs?: number;
  summariesDbDir?: string;
}

/**
 * Pure TypeScript SQLite B-Tree Leaf Reader for `conversation_summaries.db`
 * and its `-wal` file with ZERO native C++ dependencies and ZERO child processes.
 *
 * Ground truth: Antigravity IDE writes `CASCADE_RUN_STATUS_RUNNING` to this table
 * whenever an agent begins running/thinking/tool execution, and `CASCADE_RUN_STATUS_IDLE`
 * the moment it completes its turn or is stopped by the user.
 */
export function getGroundTruthConversationStatuses(customDbDir?: string): Map<string, string> {
  const dirPath = customDbDir ?? path.join(os.homedir(), '.gemini', 'antigravity');
  const dbFile = path.join(dirPath, 'conversation_summaries.db');
  const walFile = path.join(dirPath, 'conversation_summaries.db-wal');
  const runningMap = new Map<string, string>();

  function readVarint(buf: Buffer, offset: number): { val: number; len: number } {
    let val = 0;
    let len = 0;
    for (let i = 0; i < 9; i++) {
      if (offset + i >= buf.length) break;
      const b = buf[offset + i]!;
      len++;
      if (i === 8) {
        val = (val << 8) | b;
        break;
      }
      val = (val << 7) | (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return { val, len };
  }

  function parseLeafPage(buf: Buffer, offset: number): void {
    if (offset + 8 > buf.length) return;
    const pageHeaderType = buf[offset];
    if (pageHeaderType !== 0x0d) return; // Only table leaf B-tree pages

    const cellCount = buf.readUInt16BE(offset + 3);
    for (let c = 0; c < cellCount; c++) {
      const ptrOffset = offset + 8 + c * 2;
      if (ptrOffset + 2 > buf.length) break;
      const cellOffset = offset + buf.readUInt16BE(ptrOffset);
      if (cellOffset >= buf.length) continue;

      let ptr = cellOffset;
      const payloadSize = readVarint(buf, ptr);
      ptr += payloadSize.len;
      const rowId = readVarint(buf, ptr);
      ptr += rowId.len;

      const recordStart = ptr;
      const headerSize = readVarint(buf, ptr);
      ptr += headerSize.len;

      const serialTypes: number[] = [];
      while (ptr < recordStart + headerSize.val && ptr < buf.length) {
        const st = readVarint(buf, ptr);
        serialTypes.push(st.val);
        ptr += st.len;
      }

      // Col 0: conversation_id (Text of length 36 => serial type 36*2 + 13 = 85)
      if (serialTypes.length >= 7 && serialTypes[0] === 85) {
        const bodyPtr = recordStart + headerSize.val;
        if (bodyPtr + 36 <= buf.length) {
          const convId = buf.subarray(bodyPtr, bodyPtr + 36).toString('utf8');
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(convId)) {
            let colPtr = bodyPtr + 36;
            let status = '';
            for (let col = 1; col < serialTypes.length; col++) {
              const st = serialTypes[col]!;
              let len = 0;
              if (st >= 12 && st % 2 === 0) len = (st - 12) / 2;
              else if (st >= 13 && st % 2 === 1) len = (st - 13) / 2;
              else if (st === 1) len = 1;
              else if (st === 2) len = 2;
              else if (st === 3) len = 3;
              else if (st === 4) len = 4;
              else if (st === 5) len = 6;
              else if (st === 6 || st === 7) len = 8;

              if (col === 6 && colPtr + len <= buf.length) {
                status = buf.subarray(colPtr, colPtr + len).toString('utf8');
              }
              colPtr += len;
            }

            if (status.startsWith('CASCADE_RUN_STATUS_')) {
              runningMap.set(convId, status);
            }
          }
        }
      }
    }
  }

  try {
    if (fs.existsSync(dbFile)) {
      const buf = fs.readFileSync(dbFile);
      if (buf.length >= 4096) {
        const pageSize = buf.readUInt16BE(16);
        if (pageSize >= 512) {
          const totalPages = Math.floor(buf.length / pageSize);
          for (let p = 1; p <= totalPages; p++) {
            parseLeafPage(buf, (p - 1) * pageSize);
          }
        }
      }
    }

    if (fs.existsSync(walFile)) {
      const walBuf = fs.readFileSync(walFile);
      const pageSize = 4096;
      if (walBuf.length >= 32 + 24 + pageSize) {
        let ptr = 32;
        while (ptr + 24 + pageSize <= walBuf.length) {
          parseLeafPage(walBuf, ptr + 24);
          ptr += 24 + pageSize;
        }
      }
    }
  } catch {
    // Fail-open: return whatever was extracted
  }

  return runningMap;
}

function normalizeModelName(raw: string): string {
  return formatModelDisplayName(raw);
}

/**
 * Extracts the real model name for a conversation by:
 * 1. Parsing SQLite B-Tree leaf cells (`0x0d`) of `gen_metadata` in `.db` and `.db-wal`
 *    (validating active WAL header `salt-1`/`salt-2` so stale WAL frames are skipped)
 *    and selecting the protobuf model slug with the strictly highest `rowid` (`idx`).
 *    (Fixes the bug where SQLite downward cell allocation placed older rows at higher
 *    byte offsets than newer rows within a 4096-byte page.)
 * 2. Checking the tail of `transcript_full.jsonl` for an explicit `<USER_SETTINGS_CHANGE>`
 *    model switch in the latest user turn.
 */
export function extractModelForConversation(conversationId: string): string {
  const antigravityDir = path.join(os.homedir(), '.gemini', 'antigravity');
  const convDir = path.join(antigravityDir, 'conversations');
  const dbFile = path.join(convDir, `${conversationId}.db`);
  const walFile = path.join(convDir, `${conversationId}.db-wal`);

  // 1. Check USER_INPUT steps in transcript_full.jsonl for <USER_SETTINGS_CHANGE>
  // Antigravity logs every model selection & mid-conversation model switch in USER_INPUT at t=0ms.
  const fullTranscript = path.join(
    antigravityDir,
    'brain',
    conversationId,
    '.system_generated',
    'logs',
    'transcript_full.jsonl'
  );
  let settingsChangeModel: string | null = null;
  let lastUserInputHadSettingsChange = false;
  if (fs.existsSync(fullTranscript)) {
    try {
      const fStat = fs.statSync(fullTranscript);
      if (fStat.size > 0) {
        const readLen = Math.min(fStat.size, 262144); // last 256 KB
        const buf = Buffer.alloc(readLen);
        const fd = fs.openSync(fullTranscript, 'r');
        try {
          fs.readSync(fd, buf, 0, readLen, fStat.size - readLen);
        } finally {
          fs.closeSync(fd);
        }
        const lines = buf.toString('utf8').split('\n');
        const changeRegex =
          /<USER_SETTINGS_CHANGE>[\s\S]*?The user changed setting `Model Selection` from [^\r\n]+? to ([^\r\n]+?)\. No need to comment[\s\S]*?<\/USER_SETTINGS_CHANGE>/;
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || !line.includes('USER_INPUT')) {
            continue;
          }
          try {
            const parsed = JSON.parse(line);
            if (
              parsed &&
              parsed.type === 'USER_INPUT' &&
              typeof parsed.content === 'string'
            ) {
              const m = changeRegex.exec(parsed.content);
              if (m && m[1]) {
                settingsChangeModel = normalizeModelName(m[1]);
                lastUserInputHadSettingsChange = true;
              } else {
                lastUserInputHadSettingsChange = false;
              }
            }
          } catch {
            // ignore partial line
          }
        }
      }
    } catch {
      // ignore read error
    }
  }

  // 2. Scan SQLite B-Tree leaf cells (0x0d) for highest rowid (idx) in gen_metadata
  let maxIdx = -1;
  let latestBtreeModel: string | null = null;
  const pbSingleRegex = /\x9a\x01[\x01-\x30]((?:gemini|claude)[a-z0-9\.\-]+)\xa2\x01/;

  function readVarint(buf: Buffer, offset: number): { val: number; len: number } {
    let val = 0;
    let len = 0;
    for (let i = 0; i < 9; i++) {
      if (offset + i >= buf.length) break;
      const b = buf[offset + i]!;
      len++;
      if (i === 8) {
        val = val * 256 + b;
        break;
      }
      val = val * 128 + (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return { val, len };
  }

  function scanLeafPage(buf: Buffer, offset: number, pageSize: number): void {
    if (offset + 8 > buf.length) return;
    if (buf[offset] !== 0x0d) return;

    const cellCount = buf.readUInt16BE(offset + 3);
    for (let c = 0; c < cellCount; c++) {
      const ptrPos = offset + 8 + c * 2;
      if (ptrPos + 2 > buf.length) break;
      const cellRel = buf.readUInt16BE(ptrPos);
      const cellOffset = offset + cellRel;
      if (cellOffset >= offset + pageSize || cellOffset >= buf.length) continue;

      let ptr = cellOffset;
      const payloadSize = readVarint(buf, ptr);
      ptr += payloadSize.len;
      const rowId = readVarint(buf, ptr);
      ptr += rowId.len;

      if (rowId.val < maxIdx) continue;

      const cellEnd = Math.min(offset + pageSize, buf.length, ptr + payloadSize.val);
      const sliceStr = buf.subarray(ptr, cellEnd).toString('latin1');
      const m = pbSingleRegex.exec(sliceStr);
      if (m && m[1]) {
        maxIdx = rowId.val;
        latestBtreeModel = m[1];
      }
    }
  }

  try {
    let pageSize = 4096;
    if (fs.existsSync(dbFile)) {
      const buf = fs.readFileSync(dbFile);
      if (buf.length >= 4096) {
        pageSize = buf.readUInt16BE(16) || 4096;
        if (pageSize >= 512) {
          const totalPages = Math.floor(buf.length / pageSize);
          for (let p = 1; p <= totalPages; p++) {
            scanLeafPage(buf, (p - 1) * pageSize, pageSize);
          }
        }
      }
    }

    if (fs.existsSync(walFile)) {
      const walBuf = fs.readFileSync(walFile);
      if (walBuf.length >= 32 + 24 + pageSize) {
        const walPageSize = walBuf.readUInt32BE(8) || pageSize;
        const salt1 = walBuf.readUInt32BE(16);
        const salt2 = walBuf.readUInt32BE(20);
        if (walPageSize >= 512) {
          let ptr = 32;
          while (ptr + 24 + walPageSize <= walBuf.length) {
            const fSalt1 = walBuf.readUInt32BE(ptr + 8);
            const fSalt2 = walBuf.readUInt32BE(ptr + 12);
            if (fSalt1 === salt1 && fSalt2 === salt2) {
              scanLeafPage(walBuf, ptr + 24, walPageSize);
            }
            ptr += 24 + walPageSize;
          }
        }
      }
    }
  } catch {
    // ignore B-Tree scan errors
  }

  if (latestBtreeModel) {
    return normalizeModelName(latestBtreeModel);
  }

  if (settingsChangeModel) {
    return settingsChangeModel;
  }

  // 3. Fallback: raw buffer protobuf scan
  for (const f of [walFile, dbFile]) {
    if (!fs.existsSync(f)) continue;
    try {
      const size = fs.statSync(f).size;
      if (size === 0) continue;

      const readLen = Math.min(size, 1024 * 1024);
      const buf = Buffer.alloc(readLen);
      const fd = fs.openSync(f, 'r');
      try {
        fs.readSync(fd, buf, 0, readLen, size - readLen);
      } finally {
        fs.closeSync(fd);
      }

      const str = buf.toString('latin1');
      const pbRegex = /\x9a\x01[\x01-\x30]((?:gemini|claude)[a-z0-9\.\-]+)\xa2\x01/g;
      let match: RegExpExecArray | null;
      let lastPbModel: string | null = null;
      while ((match = pbRegex.exec(str)) !== null) {
        if (match[1]) lastPbModel = match[1];
      }

      if (lastPbModel) {
        return normalizeModelName(lastPbModel);
      }
    } catch {
      // ignore read error
    }
  }

  return 'Gemini 3.8 Flash';
}

/**
 * Extracts a complete mapping of step index -> model name for a conversation
 * by scanning the SQLite B-tree leaf cells in `gen_metadata`.
 */
export function getConversationStepModelMap(conversationId: string): Map<number, string> {
  const stepMap = new Map<number, string>();
  const antigravityDir = path.join(os.homedir(), '.gemini', 'antigravity');
  const convDir = path.join(antigravityDir, 'conversations');
  const dbFile = path.join(convDir, `${conversationId}.db`);
  const walFile = path.join(convDir, `${conversationId}.db-wal`);

  const pbSingleRegex = /\x9a\x01[\x01-\x30]((?:gemini|claude)[a-z0-9\.\-]+)\xa2\x01/;

  function readVarint(buf: Buffer, offset: number): { val: number; len: number } {
    let val = 0;
    let len = 0;
    for (let i = 0; i < 9; i++) {
      if (offset + i >= buf.length) break;
      const b = buf[offset + i]!;
      len++;
      if (i === 8) {
        val = val * 256 + b;
        break;
      }
      val = val * 128 + (b & 0x7f);
      if ((b & 0x80) === 0) break;
    }
    return { val, len };
  }

  function scanLeafPage(buf: Buffer, offset: number, pageSize: number): void {
    if (offset + 8 > buf.length) return;
    if (buf[offset] !== 0x0d) return;

    const cellCount = buf.readUInt16BE(offset + 3);
    for (let c = 0; c < cellCount; c++) {
      const ptrPos = offset + 8 + c * 2;
      if (ptrPos + 2 > buf.length) break;
      const cellRel = buf.readUInt16BE(ptrPos);
      const cellOffset = offset + cellRel;
      if (cellOffset >= offset + pageSize || cellOffset >= buf.length) continue;

      let ptr = cellOffset;
      const payloadSize = readVarint(buf, ptr);
      ptr += payloadSize.len;
      const rowId = readVarint(buf, ptr);
      ptr += rowId.len;

      const cellEnd = Math.min(offset + pageSize, buf.length, ptr + payloadSize.val);
      const sliceStr = buf.subarray(ptr, cellEnd).toString('latin1');
      const m = pbSingleRegex.exec(sliceStr);
      if (m && m[1]) {
        stepMap.set(rowId.val, normalizeModelName(m[1]));
      }
    }
  }

  try {
    let pageSize = 4096;
    if (fs.existsSync(dbFile)) {
      const buf = fs.readFileSync(dbFile);
      if (buf.length >= 4096) {
        pageSize = buf.readUInt16BE(16) || 4096;
        if (pageSize >= 512) {
          const totalPages = Math.floor(buf.length / pageSize);
          for (let p = 1; p <= totalPages; p++) {
            scanLeafPage(buf, (p - 1) * pageSize, pageSize);
          }
        }
      }
    }

    if (fs.existsSync(walFile)) {
      const walBuf = fs.readFileSync(walFile);
      if (walBuf.length >= 32 + 24 + pageSize) {
        const walPageSize = walBuf.readUInt32BE(8) || pageSize;
        const salt1 = walBuf.readUInt32BE(16);
        const salt2 = walBuf.readUInt32BE(20);
        if (walPageSize >= 512) {
          let ptr = 32;
          while (ptr + 24 + walPageSize <= walBuf.length) {
            const fSalt1 = walBuf.readUInt32BE(ptr + 8);
            const fSalt2 = walBuf.readUInt32BE(ptr + 12);
            if (fSalt1 === salt1 && fSalt2 === salt2) {
              scanLeafPage(walBuf, ptr + 24, walPageSize);
            }
            ptr += 24 + walPageSize;
          }
        }
      }
    }
  } catch {
    // ignore B-tree errors
  }

  return stepMap;
}

interface TranscriptCacheEntry {
  fileSize: number;
  mtimeMs: number;
  model: string | null;
  stepIndex?: number;
  tokens: TokenUsageRecord;
  modelTokens: Record<string, TokenUsageRecord>;
  modelsUsed: string[];
  dailyTokens: Record<string, TokenUsageRecord>;
  isExecuting: boolean;
  activeTool: string | null;
  recentEvents: Array<{
    type: string;
    toolName?: string | null;
    timestamp: string;
  }>;
}

export class AgentWatcher extends EventEmitter {
  private brainDir: string;
  private intervalTimer: NodeJS.Timeout | null = null;
  private watcher: fs.FSWatcher | null = null;
  private transcriptCache: Map<string, TranscriptCacheEntry> = new Map();
  private stepModelCache = new Map<string, { mtimeMs: number; map: Map<number, string> }>();
  private state: AgentWatcherState = {
    activeAgentCount: 0,
    activeModels: [],
    totalTokens: {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      source: 'unavailable',
    },
    isAgentActive: false,
    agents: [],
    allConversations: [],
  };
  private pollIntervalMs: number;
  private activeThresholdMs: number;
  private summariesDbDir?: string;
  private activeAgentsGrace = new Map<string, number>();
  private hasEmittedInitial = false;

  constructor(options?: AgentWatcherOptions) {
    super();
    this.brainDir = options?.brainDir ?? path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    this.pollIntervalMs = options?.pollIntervalMs ?? 1000; // Poll every 1.0s for real-time RPC updates
    this.activeThresholdMs = options?.activeThresholdMs ?? 120000; // 120s active turn threshold
    this.summariesDbDir = options?.summariesDbDir;
  }

  private getStepModelMap(conversationId: string): Map<number, string> {
    const dbFile = path.join(os.homedir(), '.gemini', 'antigravity', 'conversations', `${conversationId}.db`);
    let mtime = 0;
    if (fs.existsSync(dbFile)) {
      try {
        mtime = fs.statSync(dbFile).mtimeMs;
      } catch {}
    }

    const cached = this.stepModelCache.get(conversationId);
    if (cached && cached.mtimeMs === mtime) {
      return cached.map;
    }

    const map = getConversationStepModelMap(conversationId);
    this.stepModelCache.set(conversationId, { mtimeMs: mtime, map });
    return map;
  }

  public start(): void {
    if (!fs.existsSync(this.brainDir)) {
      try {
        fs.mkdirSync(this.brainDir, { recursive: true });
      } catch {
        // fail-open
      }
    }

    // Initial scan
    this.scan();

    // Poll periodically
    this.intervalTimer = setInterval(() => this.scan(), this.pollIntervalMs);

    // Watch directory if possible
    try {
      this.watcher = fs.watch(this.brainDir, { persistent: false }, () => {
        this.scan();
      });
      this.watcher.on('error', () => {
        // fail-open on watch errors
      });
    } catch {
      // directory watching might fail on some platforms/permissions
    }
  }

  public stop(): void {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {}
      this.watcher = null;
    }
  }

  public getState(): AgentWatcherState {
    return this.state;
  }

  public scan(): void {
    if (!fs.existsSync(this.brainDir)) return;

    try {
      const items = fs.readdirSync(this.brainDir);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const conversationDirs = items.filter((item) => {
        try {
          const fullPath = path.join(this.brainDir, item);
          return uuidRegex.test(item) && fs.statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      });

      const groundTruthStatuses = getGroundTruthConversationStatuses(this.summariesDbDir);
      const now = Date.now();
      const activeAgents: ActiveAgentInfo[] = [];
      const allConversations: ActiveAgentInfo[] = [];
      const modelsSet = new Set<string>();

      let aggInput = 0;
      let aggCache = 0;
      let aggOutput = 0;
      let hasTokens = false;

      for (const dir of conversationDirs) {
        const transcriptPath = path.join(this.brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
        const transcriptExists = fs.existsSync(transcriptPath);

        try {
          let statSize = 0;
          let lastActiveMs = 0;

          if (transcriptExists) {
            const stat = fs.statSync(transcriptPath);
            statSize = stat.size;
            lastActiveMs = stat.mtimeMs;
          }

          // Track multi-file activity across transcript, database WAL, and steps
          const convDir = path.join(os.homedir(), '.gemini', 'antigravity', 'conversations');
          const walFile = path.join(convDir, `${dir}.db-wal`);
          const dbFile = path.join(convDir, `${dir}.db`);

          for (const f of [walFile, dbFile]) {
            if (fs.existsSync(f)) {
              try {
                const fStat = fs.statSync(f);
                if (fStat.mtimeMs > lastActiveMs) {
                  lastActiveMs = fStat.mtimeMs;
                }
              } catch {}
            }
          }

          // Read the transcript for accurate token summation and execution state
          const parsedTail = transcriptExists
            ? this.readTranscriptTail(transcriptPath, statSize, lastActiveMs, dir)
            : null;

          if (parsedTail && parsedTail.tokens.totalTokens > 0) {
            hasTokens = true;
            aggInput += parsedTail.tokens.inputTokens;
            aggCache += parsedTail.tokens.cacheReadTokens;
            aggOutput += parsedTail.tokens.outputTokens;
          }

          // Ground-Truth Active State:
          // 1. If conversation_summaries.db indicates CASCADE_RUN_STATUS_RUNNING => ALWAYS ACTIVE
          // 2. If parsedTail exists:
          //    - isExecuting = true (USER_INPUT, tool running, tool result) => ACTIVE
          //    - isExecuting = false (PLANNER_RESPONSE with no tool calls, completed response) => INSTANT IDLE (0s delay)
          // 3. Fall back to active grace period (5s) only when in-progress turn has brief file system delay
          let isActive = false;
          const isGroundTruthRunning = groundTruthStatuses.get(dir) === 'CASCADE_RUN_STATUS_RUNNING';
          const isGroundTruthIdle = groundTruthStatuses.get(dir) === 'CASCADE_RUN_STATUS_IDLE';

          if (isGroundTruthRunning) {
            isActive = true;
          } else if (parsedTail) {
            if (parsedTail.isExecuting) {
              isActive = now - lastActiveMs < this.activeThresholdMs;
            } else {
              // Turn explicitly finished (PLANNER_RESPONSE with 0 tool calls) => instant 0s idle!
              isActive = false;
            }
          } else if (lastActiveMs > 0 && now - lastActiveMs < 5000 && !isGroundTruthIdle) {
            isActive = true;
          }

          if (isActive) {
            this.activeAgentsGrace.set(dir, now);
          } else {
            this.activeAgentsGrace.delete(dir);
          }

          const model = parsedTail?.model ?? extractModelForConversation(dir);
          const agentStatus: 'thinking' | 'running_tool' | 'idle' | 'error' = isActive
            ? (parsedTail?.activeTool ? 'running_tool' : 'thinking')
            : 'idle';

          const convInfo: ActiveAgentInfo = {
            conversationId: dir,
            lastActiveMs: lastActiveMs || now,
            model,
            stepIndex: parsedTail?.stepIndex,
            tokens: parsedTail?.tokens ?? {
              inputTokens: 0,
              cacheReadTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              estimated: false,
              source: 'unavailable',
            },
            modelTokens: parsedTail?.modelTokens,
            modelsUsed: parsedTail?.modelsUsed,
            dailyTokens: parsedTail?.dailyTokens,
            activeTool: parsedTail?.activeTool ?? null,
            status: agentStatus,
            recentEvents: parsedTail?.recentEvents ?? [],
          };

          allConversations.push(convInfo);

          if (isActive) {
            modelsSet.add(model);
            activeAgents.push(convInfo);
          }
        } catch {
          // ignore individual conversation read failures
        }
      }

      const isAgentActive = activeAgents.length > 0;
      const activeModels = Array.from(modelsSet);

      const totalTokens: TokenUsageRecord = hasTokens
        ? {
            inputTokens: aggInput,
            cacheReadTokens: aggCache,
            outputTokens: aggOutput,
            totalTokens: aggInput + aggCache + aggOutput,
            estimated: false,
            source: 'transcript_exact',
          }
        : this.state.totalTokens;

      const previousState = this.state;
      this.state = {
        activeAgentCount: activeAgents.length,
        activeModels,
        totalTokens,
        isAgentActive,
        agents: activeAgents,
        allConversations,
      };

      // Emit if state changed (active state, agent count, active models, tokens, or on initial scan)
      const prevAgentKey = previousState.agents.map((a) => `${a.conversationId}:${a.model}`).join('|');
      const nextAgentKey = this.state.agents.map((a) => `${a.conversationId}:${a.model}`).join('|');
      if (
        !this.hasEmittedInitial ||
        previousState.isAgentActive !== this.state.isAgentActive ||
        previousState.activeAgentCount !== this.state.activeAgentCount ||
        previousState.activeModels.join(',') !== this.state.activeModels.join(',') ||
        previousState.totalTokens.totalTokens !== this.state.totalTokens.totalTokens ||
        prevAgentKey !== nextAgentKey
      ) {
        this.hasEmittedInitial = true;
        this.emit('change', this.state);
      }
    } catch {
      // fail-open
    }
  }

  private readTranscriptTail(
    filePath: string,
    fileSize: number,
    mtimeMs: number,
    conversationId: string
  ): TranscriptCacheEntry | null {
    if (fileSize <= 0) return null;

    const cached = this.transcriptCache.get(filePath);
    if (cached && cached.fileSize === fileSize && cached.mtimeMs === mtimeMs) {
      return cached;
    }

    try {
      // Read up to 4MB to sum tokens accurately across turns
      const readLength = Math.min(fileSize, 4194304);
      const buffer = Buffer.alloc(readLength);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, readLength, fileSize - readLength);
      } finally {
        fs.closeSync(fd);
      }

      const text = buffer.toString('utf8');
      const allLines = text.trim().split('\n');
      const lines = fileSize > readLength && allLines.length > 1 ? allLines.slice(1) : allLines;

      const stepModelMap = this.getStepModelMap(conversationId);
      const activeGroundTruthModel = extractModelForConversation(conversationId);
      let latestModel: string = activeGroundTruthModel;
      let plannerTurnIndex = 0;

      let maxStepIndex: number | undefined;
      let isExecuting = false;
      let activeTool: string | null = null;
      let sumInput = 0;
      let sumCache = 0;
      let sumOutput = 0;
      let hasTokens = false;
      const seenSteps = new Set<number>();
      const allEvents: Array<{ type: string; toolName?: string | null; timestamp: string }> = [];

      const modelTokensMap: Record<string, TokenUsageRecord> = {};
      const dailyTokensMap: Record<string, TokenUsageRecord> = {};

      for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        if (!rawLine) continue;
        const line = rawLine.trim();
        if (!line) continue;

        try {
          const parsed = JSON.parse(line);
          if (typeof parsed !== 'object' || parsed === null) continue;

          if (typeof parsed.step_index === 'number') {
            const idx = parsed.step_index;
            if (maxStepIndex === undefined || idx > maxStepIndex) {
              maxStepIndex = idx;
            }
          }

          if (parsed.type === 'PLANNER_RESPONSE') {
            const stepKey = typeof parsed.step_index === 'number' ? parsed.step_index : seenSteps.size;
            if (!seenSteps.has(stepKey)) {
              seenSteps.add(stepKey);
              const inTok = typeof parsed.input_tokens === 'number' ? parsed.input_tokens : 0;
              const cacheTok = typeof parsed.cache_read_tokens === 'number' ? parsed.cache_read_tokens : 0;
              const outTok = typeof parsed.output_tokens === 'number' ? parsed.output_tokens : 0;

              if (inTok > 0 || cacheTok > 0 || outTok > 0) {
                hasTokens = true;
                sumInput += inTok;
                sumCache += cacheTok;
                sumOutput += outTok;
              }

              // Determine exact model for this generation turn
              const turnRawModel =
                stepModelMap.get(plannerTurnIndex) ||
                (typeof parsed.model === 'string' ? parsed.model : activeGroundTruthModel);
              const turnModel = formatModelDisplayName(turnRawModel);
              latestModel = turnModel;
              plannerTurnIndex++;

              if (!modelTokensMap[turnModel]) {
                modelTokensMap[turnModel] = {
                  inputTokens: 0,
                  cacheReadTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
                  estimated: false,
                  source: 'transcript_exact',
                };
              }
              modelTokensMap[turnModel].inputTokens += inTok;
              modelTokensMap[turnModel].cacheReadTokens += cacheTok;
              modelTokensMap[turnModel].outputTokens += outTok;
              modelTokensMap[turnModel].totalTokens += inTok + cacheTok + outTok;

              // Record daily usage bucket if created_at is present
              const dateStr = typeof parsed.created_at === 'string' ? parsed.created_at.slice(0, 10) : '';
              if (dateStr && dateStr.startsWith('20')) {
                if (!dailyTokensMap[dateStr]) {
                  dailyTokensMap[dateStr] = {
                    inputTokens: 0,
                    cacheReadTokens: 0,
                    outputTokens: 0,
                    totalTokens: 0,
                    estimated: false,
                    source: 'transcript_exact',
                  };
                }
                dailyTokensMap[dateStr].inputTokens += inTok;
                dailyTokensMap[dateStr].cacheReadTokens += cacheTok;
                dailyTokensMap[dateStr].outputTokens += outTok;
                dailyTokensMap[dateStr].totalTokens += inTok + cacheTok + outTok;
              }
            }
          }

          if (typeof parsed.model === 'string' && parsed.model) {
            latestModel = formatModelDisplayName(parsed.model);
          }

          const eventType = typeof parsed.type === 'string' ? parsed.type : 'UNKNOWN';
          const toolCallName =
            Array.isArray(parsed.tool_calls) &&
            parsed.tool_calls.length > 0 &&
            typeof parsed.tool_calls[0]?.name === 'string'
              ? parsed.tool_calls[0].name
              : null;
          const eventTs =
            typeof parsed.created_at === 'string' ? parsed.created_at : new Date().toISOString();

          allEvents.push({
            type: eventType,
            toolName: toolCallName,
            timestamp: eventTs,
          });
        } catch {
          // ignore partial line
        }
      }

      // Determine active execution and tool name from recent non-system steps
      for (let i = allEvents.length - 1; i >= 0; i--) {
        const ev = allEvents[i];
        if (!ev) continue;
        if (ev.type === 'SYSTEM_MESSAGE') continue;
        if (ev.type === 'PLANNER_RESPONSE') {
          if (ev.toolName) {
            isExecuting = true;
            activeTool = ev.toolName;
          } else {
            isExecuting = false;
            activeTool = null;
          }
          break;
        } else if (ev.type === 'USER_INPUT' || ev.type === 'GENERIC') {
          isExecuting = true;
          activeTool = null;
          break;
        }
      }

      const tokens: TokenUsageRecord = {
        inputTokens: sumInput,
        cacheReadTokens: sumCache,
        outputTokens: sumOutput,
        totalTokens: sumInput + sumCache + sumOutput,
        estimated: false,
        source: hasTokens ? 'transcript_exact' : 'unavailable',
      };

      const recentEvents = allEvents.slice(-10).reverse();
      const modelsUsed = Object.keys(modelTokensMap);

      const result: TranscriptCacheEntry = {
        fileSize,
        mtimeMs,
        model: latestModel,
        stepIndex: maxStepIndex,
        tokens,
        modelTokens: modelTokensMap,
        modelsUsed: modelsUsed.length > 0 ? modelsUsed : [latestModel],
        dailyTokens: dailyTokensMap,
        isExecuting,
        activeTool,
        recentEvents,
      };

      this.transcriptCache.set(filePath, result);
      return result;
    } catch {
      return null;
    }
  }
}
