/**
 * AgentWatcher — Hookless Antigravity Agent Activity Monitor
 *
 * Discovers and tracks active agents across all Antigravity workspaces
 * by reading transcript timestamps and exact tokens from disk.
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
    this.pollIntervalMs = options?.pollIntervalMs ?? 3000;
    this.activeThresholdMs = options?.activeThresholdMs ?? 20000; // 20s idle threshold
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
          const isRecent = now - stat.mtimeMs < this.activeThresholdMs;

          // Read the tail of the transcript for tokens and model
          const parsedTail = this.readTranscriptTail(transcriptPath, stat.size);
          if (parsedTail) {
            if (parsedTail.tokens.totalTokens > 0) {
              hasTokens = true;
              aggInput += parsedTail.tokens.inputTokens;
              aggCache += parsedTail.tokens.cacheReadTokens;
              aggOutput += parsedTail.tokens.outputTokens;
            }

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
      if (activeModels.length === 0 && isAgentActive) {
        activeModels.push('Gemini 4 Argon');
      }

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
    fileSize: number
  ): { model: string; stepIndex?: number; tokens: TokenUsageRecord } | null {
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

      let model = 'Gemini 4 Argon';
      let stepIndex: number | undefined;
      let tokens: TokenUsageRecord = {
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: false,
        source: 'unavailable',
      };

      // Traverse lines backwards to find the latest valid step
      for (let i = lines.length - 1; i >= 0; i--) {
        const rawLine = lines[i];
        if (!rawLine) continue;
        const line = rawLine.trim();
        if (!line) continue;

        try {
          const parsed = JSON.parse(line);
          if (typeof parsed === 'object' && parsed !== null) {
            if (typeof parsed.step_index === 'number' && stepIndex === undefined) {
              stepIndex = parsed.step_index;
            }

            // Check if model name is embedded
            if (typeof parsed.model === 'string' && parsed.model) {
              model = parsed.model;
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

      return { model, stepIndex, tokens };
    } catch {
      return null;
    }
  }
}
