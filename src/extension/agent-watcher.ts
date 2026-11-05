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

/**
 * Extracts the real model name for a conversation by scanning the tail
 * of its SQLite DB / WAL file (gen_metadata buffer) with zero native dependencies.
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

      const readLen = Math.min(size, 512 * 1024);
      const buf = Buffer.alloc(readLen);
      const fd = fs.openSync(f, 'r');
      try {
        fs.readSync(fd, buf, 0, readLen, size - readLen);
      } finally {
        fs.closeSync(fd);
      }

      const str = buf.toString('latin1');
      const matches = str.match(
        /(Gemini [0-9\.]+ [a-zA-Z]+( \([a-zA-Z]+\))?|gemini-[0-9\.]+[a-zA-Z0-9\-]+|Claude [0-9\.]+ [a-zA-Z]+|claude-[0-9a-zA-Z\-]+)/gi
      );

      if (matches && matches.length > 0) {
        const raw = matches[matches.length - 1] ?? '';
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

  return 'Gemini 4 Argon';
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

  constructor(options?: { brainDir?: string; pollIntervalMs?: number; activeThresholdMs?: number }) {
    super();
    this.brainDir = options?.brainDir ?? path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    this.pollIntervalMs = options?.pollIntervalMs ?? 1500; // Poll every 1.5s
    this.activeThresholdMs = options?.activeThresholdMs ?? 8000; // 8s idle threshold
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

      const now = Date.now();
      const activeAgents: ActiveAgentInfo[] = [];
      const modelsSet = new Set<string>();

      let aggInput = 0;
      let aggCache = 0;
      let aggOutput = 0;
      let hasTokens = false;

      for (const dir of conversationDirs) {
        const transcriptPath = path.join(this.brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(transcriptPath)) continue;

        try {
          const stat = fs.statSync(transcriptPath);

          // Read the tail of the transcript for tokens and execution state
          const parsedTail = this.readTranscriptTail(transcriptPath, stat.size, dir);
          if (parsedTail) {
            if (parsedTail.tokens.totalTokens > 0) {
              hasTokens = true;
              aggInput += parsedTail.tokens.inputTokens;
              aggCache += parsedTail.tokens.cacheReadTokens;
              aggOutput += parsedTail.tokens.outputTokens;
            }

            // An agent is active ONLY if:
            // 1. Transcript was modified within the active threshold (8s)
            // 2. AND the last step indicates an active execution (not finished with text response)
            const isRecent = (now - stat.mtimeMs < this.activeThresholdMs) && parsedTail.isExecuting;

            if (isRecent) {
              modelsSet.add(parsedTail.model);
              activeAgents.push({
                conversationId: dir,
                lastActiveMs: stat.mtimeMs,
                model: parsedTail.model,
                stepIndex: parsedTail.stepIndex,
                tokens: parsedTail.tokens,
              });
            }
          }
        } catch {
          // ignore individual transcript read failures
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
      const readLength = Math.min(fileSize, 8192);
      const buffer = Buffer.alloc(readLength);
      const fd = fs.openSync(filePath, 'r');
      try {
        fs.readSync(fd, buffer, 0, readLength, fileSize - readLength);
      } finally {
        fs.closeSync(fd);
      }

      const text = buffer.toString('utf8');
      const lines = text.trim().split('\n');

      // 1. Extract the real model from the conversation metadata
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

      // Check the very last step in the transcript
      for (let i = lines.length - 1; i >= 0; i--) {
        const rawLine = lines[i];
        if (!rawLine) continue;
        const line = rawLine.trim();
        if (!line) continue;

        try {
          const parsed = JSON.parse(line);
          if (typeof parsed === 'object' && parsed !== null) {
            // First valid step encountered from the end is the latest step
            if (stepIndex === undefined && typeof parsed.step_index === 'number') {
              stepIndex = parsed.step_index;

              // If the latest step is a completed PLANNER_RESPONSE with no tool calls,
              // the agent has finished answering and is waiting for user input.
              if (
                parsed.type === 'PLANNER_RESPONSE' &&
                (!Array.isArray(parsed.tool_calls) || parsed.tool_calls.length === 0)
              ) {
                isExecuting = false;
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
              typeof parsed.input_tokens === 'number' ||
              typeof parsed.cache_read_tokens === 'number' ||
              typeof parsed.output_tokens === 'number'
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
