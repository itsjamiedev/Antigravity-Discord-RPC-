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

export interface ActiveAgentInfo {
  conversationId: string;
  lastActiveMs: number;
  model: string;
  stepIndex?: number;
  tokens: TokenUsageRecord;
}

export interface AgentWatcherState {
  activeAgentCount: number;
  activeModels: string[];
  totalTokens: TokenUsageRecord;
  isAgentActive: boolean;
  agents: ActiveAgentInfo[];
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

/**
 * Extracts the real model name for a conversation by scanning the binary protobuf
 * metadata from its SQLite DB / WAL file with zero native dependencies.
 *
 * Antigravity records generation metadata with wire tag 19 (0x9a 0x01) followed by
 * the model slug (e.g. `gemini-3.8-flash-n`, `gemini-4-argon-a`) and wire tag 20 (0xa2 0x01).
 * This binary match is 100% immune to user chat prompts and assistant text.
 */
export function extractModelForConversation(conversationId: string): string {
  const convDir = path.join(os.homedir(), '.gemini', 'antigravity', 'conversations');
  const candidates = [
    path.join(convDir, `${conversationId}.db-wal`),
    path.join(convDir, `${conversationId}.db`),
  ];

  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    try {
      const size = fs.statSync(f).size;
      if (size === 0) continue;

      const readLen = Math.min(size, 1024 * 1024); // scan up to 1 MB from tail
      const buf = Buffer.alloc(readLen);
      const fd = fs.openSync(f, 'r');
      try {
        fs.readSync(fd, buf, 0, readLen, size - readLen);
      } finally {
        fs.closeSync(fd);
      }

      const str = buf.toString('latin1');
      // Exact protobuf sequence: \x9a\x01 [len] (gemini-... | claude-...) \xa2\x01
      const pbRegex = /\x9a\x01[\x01-\x30]((?:gemini|claude)[a-z0-9\.\-]+)\xa2\x01/g;
      let match: RegExpExecArray | null;
      let lastPbModel: string | null = null;
      while ((match = pbRegex.exec(str)) !== null) {
        if (match[1]) lastPbModel = match[1];
      }

      if (lastPbModel) {
        const lower = lastPbModel.toLowerCase();
        if (lower.includes('flash-lite')) return 'Gemini 3.5 Flash Lite';
        if (lower.includes('flash')) return 'Gemini 3.8 Flash';
        if (lower.includes('argon')) return 'Gemini 4 Argon';
        if (lower.includes('sonnet')) return 'Claude Sonnet 3.5';
        if (lower.includes('opus')) return 'Claude Opus 3.5';
        return lastPbModel.trim();
      }

      // Secondary fallback: exact internal slugs only (reject chat prose words)
      const slugMatches = str.match(
        /(?:gemini-(?:3\.8-flash|4-argon|3\.5-flash-lite)[a-z0-9\-]*|claude-(?:sonnet|opus)[a-z0-9\-]*)/gi
      );
      if (slugMatches && slugMatches.length > 0) {
        const raw = slugMatches[slugMatches.length - 1] ?? '';
        const lower = raw.toLowerCase();
        if (lower.includes('flash-lite')) return 'Gemini 3.5 Flash Lite';
        if (lower.includes('flash')) return 'Gemini 3.8 Flash';
        if (lower.includes('argon')) return 'Gemini 4 Argon';
        if (lower.includes('sonnet')) return 'Claude Sonnet 3.5';
        if (lower.includes('opus')) return 'Claude Opus 3.5';
        return raw.trim();
      }
    } catch {
      // ignore read error
    }
  }

  return 'Gemini 3.8 Flash';
}

export class AgentWatcher extends EventEmitter {
  private brainDir: string;
  private intervalTimer: NodeJS.Timeout | null = null;
  private watcher: fs.FSWatcher | null = null;
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
  };
  private pollIntervalMs: number;
  private activeThresholdMs: number;
  private summariesDbDir?: string;

  constructor(options?: AgentWatcherOptions) {
    super();
    this.brainDir = options?.brainDir ?? path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    this.pollIntervalMs = options?.pollIntervalMs ?? 1500; // Poll every 1.5s
    this.activeThresholdMs = options?.activeThresholdMs ?? 120000; // 120s active turn threshold
    this.summariesDbDir = options?.summariesDbDir;
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

          // Read the tail of the transcript for tokens and execution state
          const parsedTail = transcriptExists ? this.readTranscriptTail(transcriptPath, statSize, dir) : null;
          if (parsedTail && parsedTail.tokens.totalTokens > 0) {
            hasTokens = true;
            aggInput += parsedTail.tokens.inputTokens;
            aggCache += parsedTail.tokens.cacheReadTokens;
            aggOutput += parsedTail.tokens.outputTokens;
          }

          // Ground-Truth Active State:
          // 1. If conversation_summaries.db contains this conversation:
          //    - CASCADE_RUN_STATUS_RUNNING => ALWAYS ACTIVE (immune to slow thinking/tool runs!)
          //    - CASCADE_RUN_STATUS_IDLE => ALWAYS IDLE (instant 0s stop!)
          // 2. Otherwise fall back to transcript turn heuristic:
          let isActive = false;
          if (groundTruthStatuses.has(dir)) {
            isActive = groundTruthStatuses.get(dir) === 'CASCADE_RUN_STATUS_RUNNING';
          } else if (parsedTail) {
            isActive = parsedTail.isExecuting && (now - lastActiveMs < this.activeThresholdMs);
          } else if (lastActiveMs > 0 && now - lastActiveMs < 5000) {
            isActive = true;
          }

          if (isActive) {
            const model = parsedTail?.model ?? extractModelForConversation(dir);
            modelsSet.add(model);
            activeAgents.push({
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
            });
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
      };

      // Emit if state changed
      if (
        previousState.isAgentActive !== this.state.isAgentActive ||
        previousState.activeAgentCount !== this.state.activeAgentCount ||
        previousState.activeModels.join(',') !== this.state.activeModels.join(',')
      ) {
        this.emit('change', this.state);
      }
    } catch {
      // fail-open
    }
  }

  private readTranscriptTail(
    filePath: string,
    fileSize: number,
    conversationId: string
  ): { model: string; stepIndex?: number; tokens: TokenUsageRecord; isExecuting: boolean } | null {
    if (fileSize <= 0) return null;

    try {
      // Use 128 KB buffer to safely handle large tool outputs, code diffs, and responses
      const readLength = Math.min(fileSize, 131072);
      const buffer = Buffer.alloc(readLength);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, readLength, fileSize - readLength);
      } finally {
        fs.closeSync(fd);
      }

      const text = buffer.toString('utf8');
      const allLines = text.trim().split('\n');
      // If we read from the middle of the file (fileSize > readLength), the first line
      // may be truncated; discard it if there are multiple lines.
      const lines = fileSize > readLength && allLines.length > 1 ? allLines.slice(1) : allLines;

      let model = extractModelForConversation(conversationId);
      let stepIndex: number | undefined;
      let isExecuting = true;
      let tokens: TokenUsageRecord = {
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: false,
        source: 'unavailable',
      };

      // Check steps from newest to oldest
      for (let i = lines.length - 1; i >= 0; i--) {
        const rawLine = lines[i];
        if (!rawLine) continue;
        const line = rawLine.trim();
        if (!line) continue;

        try {
          const parsed = JSON.parse(line);
          if (typeof parsed === 'object' && parsed !== null) {
            // Skip SYSTEM_MESSAGE when determining if agent is executing,
            // because SYSTEM_MESSAGE can be injected asynchronously by background tasks while agent is idle
            if (stepIndex === undefined && parsed.type !== 'SYSTEM_MESSAGE' && typeof parsed.step_index === 'number') {
              stepIndex = parsed.step_index;

              // If the latest step is a completed PLANNER_RESPONSE with no tool calls,
              // the agent has finished answering and is waiting for user input.
              if (
                parsed.type === 'PLANNER_RESPONSE' &&
                (!Array.isArray(parsed.tool_calls) || parsed.tool_calls.length === 0)
              ) {
                isExecuting = false;
              } else if (
                parsed.type === 'USER_INPUT' ||
                parsed.type === 'GENERIC' ||
                (parsed.type === 'PLANNER_RESPONSE' && Array.isArray(parsed.tool_calls) && parsed.tool_calls.length > 0)
              ) {
                isExecuting = true;
              }
            }

            // Extract model override if explicitly embedded in JSON
            if (typeof parsed.model === 'string' && parsed.model) {
              const lower = parsed.model.toLowerCase();
              if (lower.includes('flash-lite')) model = 'Gemini 3.5 Flash Lite';
              else if (lower.includes('flash')) model = 'Gemini 3.8 Flash';
              else if (lower.includes('argon')) model = 'Gemini 4 Argon';
              else if (lower.includes('sonnet')) model = 'Claude Sonnet 3.5';
              else if (lower.includes('opus')) model = 'Claude Opus 3.5';
              else model = parsed.model;
            }

            // Extract tokens
            if (
              tokens.source === 'unavailable' &&
              (typeof parsed.input_tokens === 'number' ||
                typeof parsed.cache_read_tokens === 'number' ||
                typeof parsed.output_tokens === 'number')
            ) {
              const inTok = parsed.input_tokens ?? 0;
              const cacheTok = parsed.cache_read_tokens ?? 0;
              const outTok = parsed.output_tokens ?? 0;
              tokens = {
                inputTokens: inTok,
                cacheReadTokens: cacheTok,
                outputTokens: outTok,
                totalTokens: inTok + cacheTok + outTok,
                estimated: false,
                source: 'transcript_exact',
              };
            }

            if (stepIndex !== undefined && tokens.source === 'transcript_exact') {
              break;
            }
          }
        } catch {
          // not JSON or partial line, continue
        }
      }

      return { model, stepIndex, tokens, isExecuting };
    } catch {
      return null;
    }
  }
}
