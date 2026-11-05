import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { formatModelDisplayName } from '../discord/presence-manager.js';
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
      modelTokens?: Record<string, TokenUsageRecord>;
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
      let needsMigrationSave = false;

      if (data && typeof data === 'object') {
        if (data.cumulativeTokensByModel && typeof data.cumulativeTokensByModel === 'object') {
          for (const [rawModel, tokens] of Object.entries(data.cumulativeTokensByModel)) {
            if (tokens && typeof tokens.totalTokens === 'number') {
              const model = formatModelDisplayName(rawModel);
              if (model !== rawModel) {
                needsMigrationSave = true;
              }
              const existing = this.cumulativeTokensByModel.get(model);
              if (existing) {
                existing.inputTokens += tokens.inputTokens ?? 0;
                existing.cacheReadTokens += tokens.cacheReadTokens ?? 0;
                existing.outputTokens += tokens.outputTokens ?? 0;
                existing.totalTokens += tokens.totalTokens ?? 0;
              } else {
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
        }

        if (data.cumulativeDailyUsage && typeof data.cumulativeDailyUsage === 'object') {
          for (const [dateKey, usage] of Object.entries(data.cumulativeDailyUsage)) {
            if (usage && typeof usage.date === 'string') {
              const rawModels = Array.isArray(usage.modelsUsed) ? usage.modelsUsed : [];
              const normalizedModels = Array.from(
                new Set(rawModels.map((m) => formatModelDisplayName(m)))
              );
              if (JSON.stringify(rawModels) !== JSON.stringify(normalizedModels)) {
                needsMigrationSave = true;
              }
              this.cumulativeDailyUsage.set(dateKey, {
                date: usage.date,
                conversationCount: usage.conversationCount ?? 1,
                invocationCount: usage.invocationCount ?? 0,
                toolCallCount: usage.toolCallCount ?? 0,
                errorCount: usage.errorCount ?? 0,
                modelsUsed: normalizedModels,
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
            // Strictly purge synthetic or test watermarks
            if (convId === 'conv-test-123' || convId.startsWith('test-dummy')) {
              needsMigrationSave = true;
              continue;
            }

            if (watermark && typeof watermark.maxStepIndex === 'number') {
              const rawModel = watermark.model ?? 'Gemini 3.8 Flash';
              const model = formatModelDisplayName(rawModel);
              if (model !== rawModel) {
                needsMigrationSave = true;
              }

              const modelTokens = watermark.modelTokens
                ? (watermark.modelTokens as Record<string, TokenUsageRecord>)
                : undefined;

              this.conversationWatermarks.set(convId, {
                maxStepIndex: watermark.maxStepIndex,
                model,
                tokens: {
                  inputTokens: watermark.tokens?.inputTokens ?? 0,
                  cacheReadTokens: watermark.tokens?.cacheReadTokens ?? 0,
                  outputTokens: watermark.tokens?.outputTokens ?? 0,
                  totalTokens: watermark.tokens?.totalTokens ?? 0,
                  estimated: false,
                  source: 'transcript_exact',
                },
                modelTokens,
                lastUpdated: watermark.lastUpdated ?? new Date().toISOString(),
              });
            }
          }
        }
      }

      if (needsMigrationSave) {
        this.saveSync();
      }
    } catch {
      // Fail-open on corrupted json file
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
        {
          maxStepIndex: number;
          model: string;
          tokens: TokenUsageRecord;
          modelTokens?: Record<string, TokenUsageRecord>;
          lastUpdated: string;
        }
      > = {};
      for (const [c, w] of this.conversationWatermarks.entries()) {
        if (c !== 'conv-test-123') {
          watermarksObj[c] = w;
        }
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

  /**
   * Records multi-model token metrics for a conversation.
   * Tracks exact attribution per model (e.g. Gemini 4 Argon, Gemini 3.8 Flash, Claude Sonnet 5.5).
   */
  public recordConversationMultiModelTokens(
    conversationId: string,
    modelTokensMap: Record<string, TokenUsageRecord>,
    maxStepIndex: number,
    primaryModel: string = 'Gemini 3.8 Flash',
    dateStr?: string
  ): { deltaTokens: TokenUsageRecord } {
    const existing = this.conversationWatermarks.get(conversationId);
    const existingModelTokens = existing?.modelTokens || {};
    const dateKey = dateStr ?? new Date().toISOString().slice(0, 10);

    let deltaInput = 0;
    let deltaCache = 0;
    let deltaOutput = 0;

    const normalizedMap: Record<string, TokenUsageRecord> = {};

    for (const [rawModel, tokens] of Object.entries(modelTokensMap)) {
      const model = formatModelDisplayName(rawModel);
      normalizedMap[model] = { ...tokens };

      const prev = existingModelTokens[model] || {
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: false,
        source: 'transcript_exact',
      };

      const dIn = Math.max(0, tokens.inputTokens - prev.inputTokens);
      const dCache = Math.max(0, tokens.cacheReadTokens - prev.cacheReadTokens);
      const dOut = Math.max(0, tokens.outputTokens - prev.outputTokens);
      const dTot = dIn + dCache + dOut;

      deltaInput += dIn;
      deltaCache += dCache;
      deltaOutput += dOut;

      if (dTot > 0) {
        const curModel = this.cumulativeTokensByModel.get(model) ?? {
          inputTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimated: false,
          source: 'transcript_exact',
        };
        curModel.inputTokens += dIn;
        curModel.cacheReadTokens += dCache;
        curModel.outputTokens += dOut;
        curModel.totalTokens += dTot;
        this.cumulativeTokensByModel.set(model, curModel);
      }
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

    // Calculate total tokens for conversation
    let totalIn = 0;
    let totalCache = 0;
    let totalOut = 0;
    for (const t of Object.values(normalizedMap)) {
      totalIn += t.inputTokens;
      totalCache += t.cacheReadTokens;
      totalOut += t.outputTokens;
    }

    const normalizedPrimary = formatModelDisplayName(primaryModel);

    this.conversationWatermarks.set(conversationId, {
      maxStepIndex: Math.max(maxStepIndex, existing?.maxStepIndex ?? 0),
      model: normalizedPrimary,
      tokens: {
        inputTokens: totalIn,
        cacheReadTokens: totalCache,
        outputTokens: totalOut,
        totalTokens: totalIn + totalCache + totalOut,
        estimated: false,
        source: 'transcript_exact',
      },
      modelTokens: normalizedMap,
      lastUpdated: new Date().toISOString(),
    });

    if (deltaTotal > 0) {
      const activeModels = Object.keys(normalizedMap);
      const existingDaily = this.cumulativeDailyUsage.get(dateKey) ?? {
        date: dateKey,
        conversationCount: 1,
        invocationCount: 1,
        toolCallCount: 0,
        errorCount: 0,
        modelsUsed: activeModels.length > 0 ? activeModels : [normalizedPrimary],
        tokens: {
          inputTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimated: false,
          source: 'transcript_exact',
        },
      };

      for (const m of activeModels) {
        if (!existingDaily.modelsUsed.includes(m)) {
          existingDaily.modelsUsed.push(m);
        }
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

  /**
   * Backward-compatible single-model record method.
   */
  public recordConversationTokens(
    conversationId: string,
    model: string,
    currentTokens: TokenUsageRecord,
    maxStepIndex: number,
    dateStr?: string
  ): { deltaTokens: TokenUsageRecord } {
    const normalizedModel = formatModelDisplayName(model);
    return this.recordConversationMultiModelTokens(
      conversationId,
      { [normalizedModel]: currentTokens },
      maxStepIndex,
      normalizedModel,
      dateStr
    );
  }

  /**
   * Sets daily usage record directly (used for full historical hydration).
   */
  public setDailyUsageRecord(daily: DailyUsage): void {
    this.cumulativeDailyUsage.set(daily.date, daily);
    this.scheduleSave();
  }

  /**
   * Hydrates historical daily usage without duplicating counts.
   */
  public recordHistoricalDailyTokens(
    dateKey: string,
    tokens: TokenUsageRecord,
    models: string[] = []
  ): void {
    const existing = this.cumulativeDailyUsage.get(dateKey);
    const normalizedModels = models.map((m) => formatModelDisplayName(m));

    if (existing) {
      // Keep maximum to avoid double counting
      existing.tokens.inputTokens = Math.max(existing.tokens.inputTokens, tokens.inputTokens);
      existing.tokens.cacheReadTokens = Math.max(existing.tokens.cacheReadTokens, tokens.cacheReadTokens);
      existing.tokens.outputTokens = Math.max(existing.tokens.outputTokens, tokens.outputTokens);
      existing.tokens.totalTokens =
        existing.tokens.inputTokens + existing.tokens.cacheReadTokens + existing.tokens.outputTokens;

      for (const m of normalizedModels) {
        if (!existing.modelsUsed.includes(m)) {
          existing.modelsUsed.push(m);
        }
      }
      this.cumulativeDailyUsage.set(dateKey, existing);
    } else {
      this.cumulativeDailyUsage.set(dateKey, {
        date: dateKey,
        conversationCount: 1,
        invocationCount: 1,
        toolCallCount: 0,
        errorCount: 0,
        modelsUsed: normalizedModels.length > 0 ? normalizedModels : ['Gemini 3.8 Flash'],
        tokens: {
          inputTokens: tokens.inputTokens,
          cacheReadTokens: tokens.cacheReadTokens,
          outputTokens: tokens.outputTokens,
          totalTokens: tokens.inputTokens + tokens.cacheReadTokens + tokens.outputTokens,
          estimated: false,
          source: 'transcript_exact',
        },
      });
    }
    this.scheduleSave();
  }

  public getModelStats(): ModelStats[] {
    const list: ModelStats[] = [];
    const now = new Date().toISOString();

    for (const [model, tokens] of this.cumulativeTokensByModel.entries()) {
      let convCount = 0;
      for (const w of this.conversationWatermarks.values()) {
        if (w.model === model || (w.modelTokens && w.modelTokens[model])) {
          convCount++;
        }
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
