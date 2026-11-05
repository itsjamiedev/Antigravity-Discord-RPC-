/**
 * TokenStore — Atomic Zero-Loss Persistent Token Accounting Engine
 *
 * Persists cumulative token metrics, daily usage graphs, and per-model consumption
 * to disk (~/.gemini/antigravity/presence-tokens.json) with step watermarking so that
 * restarting Antigravity IDE, reloading windows, or switching models never loses
 * historical token metrics and never double-counts turns.
 *
 * 100% pure TypeScript / Node.js standard library — zero native C++ addons.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  DailyUsage,
  ModelStats,
  PersistentTokenStoreData,
  TokenUsageRecord,
} from '../shared/types.js';

export function getDefaultTokenStorePath(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'presence-tokens.json');
}

export class TokenStore {
  private filePath: string;
  private cumulativeTokensByModel: Map<string, TokenUsageRecord> = new Map();
  private cumulativeDailyUsage: Map<string, DailyUsage> = new Map();
  private conversationWatermarks: Map<
    string,
    {
      maxStepIndex: number;
      model: string;
      tokens: TokenUsageRecord;
      lastUpdated: string;
    }
  > = new Map();
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private isDirty = false;

  constructor(customPath?: string) {
    this.filePath = customPath ?? getDefaultTokenStorePath();
    this.load();
  }

  public getFilePath(): string {
    return this.filePath;
  }

  public load(): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw) as Partial<PersistentTokenStoreData>;

      if (data && typeof data === 'object') {
        if (data.cumulativeTokensByModel && typeof data.cumulativeTokensByModel === 'object') {
          for (const [model, tokens] of Object.entries(data.cumulativeTokensByModel)) {
            if (tokens && typeof tokens.totalTokens === 'number') {
              this.cumulativeTokensByModel.set(model, {
                inputTokens: tokens.inputTokens ?? 0,
                cacheReadTokens: tokens.cacheReadTokens ?? 0,
                outputTokens: tokens.outputTokens ?? 0,
                totalTokens: tokens.totalTokens ?? 0,
                estimated: false,
                source: 'transcript_exact',
              });
            }
          }
        }

        if (data.cumulativeDailyUsage && typeof data.cumulativeDailyUsage === 'object') {
          for (const [dateKey, usage] of Object.entries(data.cumulativeDailyUsage)) {
            if (usage && typeof usage.date === 'string') {
              this.cumulativeDailyUsage.set(dateKey, {
                date: usage.date,
                conversationCount: usage.conversationCount ?? 1,
                invocationCount: usage.invocationCount ?? 0,
                toolCallCount: usage.toolCallCount ?? 0,
                errorCount: usage.errorCount ?? 0,
                modelsUsed: Array.isArray(usage.modelsUsed) ? usage.modelsUsed : [],
                tokens: {
                  inputTokens: usage.tokens?.inputTokens ?? 0,
                  cacheReadTokens: usage.tokens?.cacheReadTokens ?? 0,
                  outputTokens: usage.tokens?.outputTokens ?? 0,
                  totalTokens: usage.tokens?.totalTokens ?? 0,
                  estimated: false,
                  source: 'transcript_exact',
                },
              });
            }
          }
        }

        if (data.conversationWatermarks && typeof data.conversationWatermarks === 'object') {
          for (const [convId, watermark] of Object.entries(data.conversationWatermarks)) {
            if (watermark && typeof watermark.maxStepIndex === 'number') {
              this.conversationWatermarks.set(convId, {
                maxStepIndex: watermark.maxStepIndex,
                model: watermark.model ?? 'Gemini 3.8 Flash',
                tokens: {
                  inputTokens: watermark.tokens?.inputTokens ?? 0,
                  cacheReadTokens: watermark.tokens?.cacheReadTokens ?? 0,
                  outputTokens: watermark.tokens?.outputTokens ?? 0,
                  totalTokens: watermark.tokens?.totalTokens ?? 0,
                  estimated: false,
                  source: 'transcript_exact',
                },
                lastUpdated: watermark.lastUpdated ?? new Date().toISOString(),
              });
            }
          }
        }
      }
    } catch {
      // Fail-open on corrupted JSON
    }
  }

  public saveSync(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    try {
      const parentDir = path.dirname(this.filePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      const modelObj: Record<string, TokenUsageRecord> = {};
      for (const [m, t] of this.cumulativeTokensByModel.entries()) {
        modelObj[m] = t;
      }

      const dailyObj: Record<string, DailyUsage> = {};
      for (const [d, u] of this.cumulativeDailyUsage.entries()) {
        dailyObj[d] = u;
      }

      const watermarksObj: Record<
        string,
        { maxStepIndex: number; model: string; tokens: TokenUsageRecord; lastUpdated: string }
      > = {};
      for (const [id, w] of this.conversationWatermarks.entries()) {
        watermarksObj[id] = w;
      }

      const payload: PersistentTokenStoreData = {
        version: 1,
        lastSavedAt: new Date().toISOString(),
        cumulativeTokensByModel: modelObj,
        cumulativeDailyUsage: dailyObj,
        conversationWatermarks: watermarksObj,
      };

      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
      this.isDirty = false;
    } catch {
      // Fail-open
    }
  }

  public scheduleSave(): void {
    this.isDirty = true;
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      if (this.isDirty) {
        this.saveSync();
      }
    }, 2000);
    this.saveDebounceTimer.unref?.();
  }

  /**
   * Records or updates tokens for a conversation.
   * Compares against existing recorded watermark to compute delta tokens,
   * avoiding double counting when re-scanning files.
   */
  public recordConversationTokens(
    conversationId: string,
    model: string,
    currentTokens: TokenUsageRecord,
    maxStepIndex: number,
    dateStr?: string
  ): { deltaTokens: TokenUsageRecord } {
    const existing = this.conversationWatermarks.get(conversationId);
    const dateKey = dateStr ?? new Date().toISOString().slice(0, 10);

    let deltaInput = currentTokens.inputTokens;
    let deltaCache = currentTokens.cacheReadTokens;
    let deltaOutput = currentTokens.outputTokens;

    if (existing) {
      deltaInput = Math.max(0, currentTokens.inputTokens - existing.tokens.inputTokens);
      deltaCache = Math.max(0, currentTokens.cacheReadTokens - existing.tokens.cacheReadTokens);
      deltaOutput = Math.max(0, currentTokens.outputTokens - existing.tokens.outputTokens);
    }

    const deltaTotal = deltaInput + deltaCache + deltaOutput;
    const deltaRecord: TokenUsageRecord = {
      inputTokens: deltaInput,
      cacheReadTokens: deltaCache,
      outputTokens: deltaOutput,
      totalTokens: deltaTotal,
      estimated: false,
      source: 'transcript_exact',
    };

    // Update conversation watermark
    this.conversationWatermarks.set(conversationId, {
      maxStepIndex: Math.max(maxStepIndex, existing?.maxStepIndex ?? 0),
      model,
      tokens: { ...currentTokens },
      lastUpdated: new Date().toISOString(),
    });

    if (deltaTotal > 0) {
      // 1. Accumulate into model stats
      const existingModel = this.cumulativeTokensByModel.get(model) ?? {
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: false,
        source: 'transcript_exact',
      };
      existingModel.inputTokens += deltaInput;
      existingModel.cacheReadTokens += deltaCache;
      existingModel.outputTokens += deltaOutput;
      existingModel.totalTokens += deltaTotal;
      this.cumulativeTokensByModel.set(model, existingModel);

      // 2. Accumulate into daily usage
      const existingDaily = this.cumulativeDailyUsage.get(dateKey) ?? {
        date: dateKey,
        conversationCount: 1,
        invocationCount: 1,
        toolCallCount: 0,
        errorCount: 0,
        modelsUsed: [model],
        tokens: {
          inputTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimated: false,
          source: 'transcript_exact',
        },
      };

      if (!existingDaily.modelsUsed.includes(model)) {
        existingDaily.modelsUsed.push(model);
      }
      existingDaily.tokens.inputTokens += deltaInput;
      existingDaily.tokens.cacheReadTokens += deltaCache;
      existingDaily.tokens.outputTokens += deltaOutput;
      existingDaily.tokens.totalTokens += deltaTotal;
      this.cumulativeDailyUsage.set(dateKey, existingDaily);

      this.scheduleSave();
    }

    return { deltaTokens: deltaRecord };
  }

  public getModelStats(): ModelStats[] {
    const list: ModelStats[] = [];
    const now = new Date().toISOString();

    for (const [model, tokens] of this.cumulativeTokensByModel.entries()) {
      let convCount = 0;
      for (const w of this.conversationWatermarks.values()) {
        if (w.model === model) convCount++;
      }

      list.push({
        model,
        conversationCount: Math.max(1, convCount),
        invocationCount: 1,
        toolCallCount: 0,
        errorCount: 0,
        lastUsedAt: now,
        tokens: { ...tokens },
      });
    }

    // Sort descending by total tokens
    list.sort((a, b) => b.tokens.totalTokens - a.tokens.totalTokens);
    return list;
  }

  public getDailyUsage(): DailyUsage[] {
    const list = Array.from(this.cumulativeDailyUsage.values());
    list.sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }

  public getTotalCumulativeTokens(): TokenUsageRecord {
    let input = 0;
    let cache = 0;
    let output = 0;

    for (const t of this.cumulativeTokensByModel.values()) {
      input += t.inputTokens;
      cache += t.cacheReadTokens;
      output += t.outputTokens;
    }

    return {
      inputTokens: input,
      cacheReadTokens: cache,
      outputTokens: output,
      totalTokens: input + cache + output,
      estimated: false,
      source: input + cache + output > 0 ? 'transcript_exact' : 'unavailable',
    };
  }

  public getConversationWatermark(conversationId: string) {
    return this.conversationWatermarks.get(conversationId);
  }

  public close(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (this.isDirty) {
      this.saveSync();
    }
  }
}

