/**
 * Antigravity Presence — Central Tracker (Single Source of Truth)
 *
 * Implements the state machine and persistence rules for Phase 3:
 *   1. Agent status derives strictly from events, with a configurable staleness
 *      timeout marking inactive agents 'stale' rather than displaying old state.
 *   2. Idempotent event processing (conversationId + event + stepIdx/invocationNum + timestamp).
 *   3. Exact token accounting from local `transcript.jsonl` with per-step watermarks
 *      so restarts never lose history and never double-count.
 */

import type Database from 'better-sqlite3';
import crypto from 'node:crypto';
import type {
  Agent,
  AgentStatus,
  Conversation,
  DailyUsage,
  HookEventType,
  ModelStats,
  Session,
  TokenDataSource,
  TokenUsageRecord,
  TrackerSnapshot,
  WhitelistedHookPayload,
} from '../shared/types.js';
import { openTrackerDatabase } from './database.js';
import {
  getDefaultAppDataDirs,
  readConversationSummaryMetadata,
  readNewTranscriptSteps,
} from './transcript-reader.js';

export interface CentralTrackerOptions {
  dbPath?: string;
  appDataDirs?: string[];
  staleTimeoutMs?: number;
  approvalEstimateThresholdMs?: number;
  nowFn?: () => number;
}

const ACTIVE_STATUSES = new Set<AgentStatus>([
  'thinking',
  'running_tool',
  'waiting_approval',
  'waiting_background',
]);

export function isAgentStatusActive(status: AgentStatus): boolean {
  return ACTIVE_STATUSES.has(status);
}

export function computeIdempotencyKey(payload: WhitelistedHookPayload): string {
  const stepPart = payload.stepIdx !== null ? String(payload.stepIdx) : '';
  const invPart = payload.invocationNum !== null ? String(payload.invocationNum) : '';
  return `${payload.conversationId}:${payload.event}:${stepPart}:${invPart}:${payload.timestamp}`;
}

function buildTokenRecord(
  inputTokens: number,
  cacheReadTokens: number,
  outputTokens: number,
  source: TokenDataSource
): TokenUsageRecord {
  return {
    inputTokens,
    cacheReadTokens,
    outputTokens,
    totalTokens: inputTokens + cacheReadTokens + outputTokens,
    estimated: false,
    source,
  };
}

function extractDateKey(isoTimestamp: string): string {
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

interface ConversationRow {
  conversation_id: string;
  title: string | null;
  current_model: string;
  models_used_json: string;
  status: AgentStatus;
  status_estimated: number;
  active_tool: string | null;
  started_at: string;
  last_event_at: string;
  last_event_type: HookEventType;
  turn_count: number;
  tool_call_count: number;
  error_count: number;
  has_error: number;
  parent_conversation_id: string | null;
  is_subagent: number;
  input_tokens: number;
  cache_read_tokens: number;
  output_tokens: number;
  token_source: TokenDataSource;
}

interface ModelStatsRow {
  model: string;
  conversations_json: string;
  invocation_count: number;
  tool_call_count: number;
  error_count: number;
  last_used_at: string;
  input_tokens: number;
  cache_read_tokens: number;
  output_tokens: number;
  token_source: TokenDataSource;
}

interface DailyUsageRow {
  date: string;
  conversations_json: string;
  models_json: string;
  invocation_count: number;
  tool_call_count: number;
  error_count: number;
  input_tokens: number;
  cache_read_tokens: number;
  output_tokens: number;
  token_source: TokenDataSource;
}

export type TrackerListener = (snapshot: TrackerSnapshot) => void;

export class CentralTracker {
  private readonly db: Database.Database;
  private readonly appDataDirs: readonly string[];
  private readonly staleTimeoutMs: number;
  private readonly approvalEstimateThresholdMs: number;
  private readonly nowFn: () => number;
  private readonly sessionId: string;
  private readonly sessionStartedAt: string;
  private lastActivityAt: string;
  private readonly listeners = new Set<TrackerListener>();
  private paused = false;

  constructor(options: CentralTrackerOptions = {}) {
    this.db = openTrackerDatabase(options.dbPath);
    this.appDataDirs = options.appDataDirs ?? getDefaultAppDataDirs();
    this.staleTimeoutMs = options.staleTimeoutMs ?? 60_000;
    this.approvalEstimateThresholdMs = options.approvalEstimateThresholdMs ?? 10_000;
    this.nowFn = options.nowFn ?? (() => Date.now());
    this.sessionId = crypto.randomUUID();
    const nowIso = new Date(this.nowFn()).toISOString();
    this.sessionStartedAt = nowIso;
    this.lastActivityAt = nowIso;
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
    this.notifyListeners();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public subscribe(listener: TrackerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) return;
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        // Never allow a listener error to break the tracker
      }
    }
  }

  /**
   * Processes a whitelisted hook event idempotently.
   * Returns true if the event was newly processed, or false if ignored (duplicate or paused).
   */
  public processEvent(payload: WhitelistedHookPayload): boolean {
    if (this.paused) {
      return false;
    }

    const idempotencyKey = computeIdempotencyKey(payload);
    const dateKey = extractDateKey(payload.timestamp);

    // Read external metadata & new transcript tokens before entering write transaction
    const existingWatermarks = this.getCountedStepIndices(payload.conversationId);
    const transcriptResult = readNewTranscriptSteps(
      payload.conversationId,
      existingWatermarks,
      this.appDataDirs
    );
    const summaryMeta = readConversationSummaryMetadata(payload.conversationId, this.appDataDirs);

    const tx = this.db.transaction((): boolean => {
      const existingEvent = this.db
        .prepare('SELECT 1 FROM processed_events WHERE idempotency_key = ?')
        .get(idempotencyKey);

      if (existingEvent) {
        return false;
      }

      this.db
        .prepare(
          `INSERT INTO processed_events (idempotency_key, conversation_id, event, timestamp)
           VALUES (?, ?, ?, ?)`
        )
        .run(idempotencyKey, payload.conversationId, payload.event, payload.timestamp);

      // 1. Upsert conversation row
      const existingConv = this.db
        .prepare('SELECT * FROM conversations WHERE conversation_id = ?')
        .get(payload.conversationId) as ConversationRow | undefined;

      const resolvedModel =
        payload.modelName && payload.modelName !== 'unknown'
          ? payload.modelName
          : existingConv?.current_model ?? 'unknown';

      const modelsUsedSet = new Set<string>(
        existingConv ? (JSON.parse(existingConv.models_used_json) as string[]) : []
      );
      if (resolvedModel !== 'unknown') {
        modelsUsedSet.add(resolvedModel);
      }

      let nextStatus: AgentStatus = existingConv?.status ?? 'thinking';
      let nextStatusEstimated = false;
      let nextActiveTool: string | null = existingConv?.active_tool ?? null;
      let turnDelta = 0;
      let toolDelta = 0;
      let errorDelta = 0;
      let nextHasError = Boolean(existingConv?.has_error);

      switch (payload.event) {
        case 'SessionStart':
          nextStatus = 'thinking';
          nextActiveTool = null;
          nextHasError = false;
          break;
        case 'PreInvocation':
          nextStatus = 'thinking';
          nextActiveTool = null;
          turnDelta = 1;
          break;
        case 'PreToolUse':
          nextStatus = 'running_tool';
          nextActiveTool = payload.toolName;
          toolDelta = 1;
          break;
        case 'PostToolUse':
          nextStatus = 'thinking';
          nextActiveTool = null;
          if (payload.hasError) {
            errorDelta = 1;
            nextHasError = true;
          }
          break;
        case 'PostInvocation':
          nextStatus = 'thinking';
          nextActiveTool = null;
          break;
        case 'Stop':
          nextActiveTool = null;
          if (payload.hasError || payload.terminationReason === 'ERROR') {
            nextStatus = 'error';
            errorDelta = 1;
            nextHasError = true;
          } else if (payload.fullyIdle === false) {
            nextStatus = 'waiting_background';
            nextHasError = false;
          } else {
            nextStatus = 'idle';
            nextHasError = false;
          }
          break;
      }

      // Calculate newly discovered exact transcript tokens
      let deltaInputTokens = 0;
      let deltaCacheTokens = 0;
      let deltaOutputTokens = 0;

      for (const step of transcriptResult.steps) {
        this.db
          .prepare(
            `INSERT OR IGNORE INTO transcript_watermarks
             (conversation_id, step_index, model, input_tokens, cache_read_tokens, output_tokens, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            payload.conversationId,
            step.stepIndex,
            resolvedModel,
            step.inputTokens,
            step.cacheReadTokens,
            step.outputTokens,
            step.createdAt
          );
        deltaInputTokens += step.inputTokens;
        deltaCacheTokens += step.cacheReadTokens;
        deltaOutputTokens += step.outputTokens;
      }

      const nextTokenSource: TokenDataSource =
        transcriptResult.foundTranscript || existingConv?.token_source === 'transcript_exact'
          ? 'transcript_exact'
          : 'unavailable';

      const title = summaryMeta?.title ?? existingConv?.title ?? null;
      const parentConversationId =
        summaryMeta?.parentConversationId ?? existingConv?.parent_conversation_id ?? null;
      const isSubagent = summaryMeta?.isSubagent ?? Boolean(existingConv?.is_subagent);

      const startedAt =
        existingConv && existingConv.started_at <= payload.timestamp
          ? existingConv.started_at
          : payload.timestamp;
      const lastEventAt =
        existingConv && existingConv.last_event_at > payload.timestamp
          ? existingConv.last_event_at
          : payload.timestamp;

      if (!existingConv) {
        this.db
          .prepare(
            `INSERT INTO conversations (
              conversation_id, title, current_model, models_used_json, status, status_estimated,
              active_tool, started_at, last_event_at, last_event_type,
              turn_count, tool_call_count, error_count, has_error,
              parent_conversation_id, is_subagent,
              input_tokens, cache_read_tokens, output_tokens, token_source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            payload.conversationId,
            title,
            resolvedModel,
            JSON.stringify([...modelsUsedSet]),
            nextStatus,
            nextStatusEstimated ? 1 : 0,
            nextActiveTool,
            startedAt,
            lastEventAt,
            payload.event,
            turnDelta,
            toolDelta,
            errorDelta,
            nextHasError ? 1 : 0,
            parentConversationId,
            isSubagent ? 1 : 0,
            deltaInputTokens,
            deltaCacheTokens,
            deltaOutputTokens,
            nextTokenSource
          );
      } else {
        this.db
          .prepare(
            `UPDATE conversations SET
              title = ?,
              current_model = ?,
              models_used_json = ?,
              status = ?,
              status_estimated = ?,
              active_tool = ?,
              started_at = ?,
              last_event_at = ?,
              last_event_type = ?,
              turn_count = turn_count + ?,
              tool_call_count = tool_call_count + ?,
              error_count = error_count + ?,
              has_error = ?,
              parent_conversation_id = ?,
              is_subagent = ?,
              input_tokens = input_tokens + ?,
              cache_read_tokens = cache_read_tokens + ?,
              output_tokens = output_tokens + ?,
              token_source = ?
             WHERE conversation_id = ?`
          )
          .run(
            title,
            resolvedModel,
            JSON.stringify([...modelsUsedSet]),
            nextStatus,
            nextStatusEstimated ? 1 : 0,
            nextActiveTool,
            startedAt,
            lastEventAt,
            payload.event,
            turnDelta,
            toolDelta,
            errorDelta,
            nextHasError ? 1 : 0,
            parentConversationId,
            isSubagent ? 1 : 0,
            deltaInputTokens,
            deltaCacheTokens,
            deltaOutputTokens,
            nextTokenSource,
            payload.conversationId
          );
      }

      // 2. Upsert model_stats
      this.upsertModelStats(
        resolvedModel,
        payload.conversationId,
        payload.timestamp,
        turnDelta,
        toolDelta,
        errorDelta,
        deltaInputTokens,
        deltaCacheTokens,
        deltaOutputTokens,
        nextTokenSource === 'transcript_exact'
      );

      // 3. Upsert daily_usage
      this.upsertDailyUsage(
        dateKey,
        payload.conversationId,
        resolvedModel,
        turnDelta,
        toolDelta,
        errorDelta,
        deltaInputTokens,
        deltaCacheTokens,
        deltaOutputTokens,
        nextTokenSource === 'transcript_exact'
      );

      return true;
    });

    const processed = tx();
    if (processed) {
      this.lastActivityAt = payload.timestamp;
      this.notifyListeners();
    }
    return processed;
  }

  private getCountedStepIndices(conversationId: string): Set<number> {
    const rows = this.db
      .prepare('SELECT step_index FROM transcript_watermarks WHERE conversation_id = ?')
      .all(conversationId) as Array<{ step_index: number }>;
    return new Set(rows.map((r) => r.step_index));
  }

  private upsertModelStats(
    model: string,
    conversationId: string,
    timestamp: string,
    invocationDelta: number,
    toolDelta: number,
    errorDelta: number,
    inputTokensDelta: number,
    cacheTokensDelta: number,
    outputTokensDelta: number,
    hasExactTokens: boolean
  ): void {
    const existing = this.db
      .prepare('SELECT * FROM model_stats WHERE model = ?')
      .get(model) as ModelStatsRow | undefined;

    if (!existing) {
      this.db
        .prepare(
          `INSERT INTO model_stats (
            model, conversations_json, invocation_count, tool_call_count, error_count,
            last_used_at, input_tokens, cache_read_tokens, output_tokens, token_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          model,
          JSON.stringify([conversationId]),
          invocationDelta,
          toolDelta,
          errorDelta,
          timestamp,
          inputTokensDelta,
          cacheTokensDelta,
          outputTokensDelta,
          hasExactTokens ? 'transcript_exact' : 'unavailable'
        );
    } else {
      const convSet = new Set<string>(JSON.parse(existing.conversations_json) as string[]);
      convSet.add(conversationId);
      const lastUsedAt = existing.last_used_at > timestamp ? existing.last_used_at : timestamp;
      const tokenSource: TokenDataSource =
        hasExactTokens || existing.token_source === 'transcript_exact'
          ? 'transcript_exact'
          : 'unavailable';

      this.db
        .prepare(
          `UPDATE model_stats SET
            conversations_json = ?,
            invocation_count = invocation_count + ?,
            tool_call_count = tool_call_count + ?,
            error_count = error_count + ?,
            last_used_at = ?,
            input_tokens = input_tokens + ?,
            cache_read_tokens = cache_read_tokens + ?,
            output_tokens = output_tokens + ?,
            token_source = ?
           WHERE model = ?`
        )
        .run(
          JSON.stringify([...convSet]),
          invocationDelta,
          toolDelta,
          errorDelta,
          lastUsedAt,
          inputTokensDelta,
          cacheTokensDelta,
          outputTokensDelta,
          tokenSource,
          model
        );
    }
  }

  private upsertDailyUsage(
    dateKey: string,
    conversationId: string,
    model: string,
    invocationDelta: number,
    toolDelta: number,
    errorDelta: number,
    inputTokensDelta: number,
    cacheTokensDelta: number,
    outputTokensDelta: number,
    hasExactTokens: boolean
  ): void {
    const existing = this.db
      .prepare('SELECT * FROM daily_usage WHERE date = ?')
      .get(dateKey) as DailyUsageRow | undefined;

    if (!existing) {
      const models = model !== 'unknown' ? [model] : [];
      this.db
        .prepare(
          `INSERT INTO daily_usage (
            date, conversations_json, models_json, invocation_count, tool_call_count,
            error_count, input_tokens, cache_read_tokens, output_tokens, token_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          dateKey,
          JSON.stringify([conversationId]),
          JSON.stringify(models),
          invocationDelta,
          toolDelta,
          errorDelta,
          inputTokensDelta,
          cacheTokensDelta,
          outputTokensDelta,
          hasExactTokens ? 'transcript_exact' : 'unavailable'
        );
    } else {
      const convSet = new Set<string>(JSON.parse(existing.conversations_json) as string[]);
      convSet.add(conversationId);
      const modelSet = new Set<string>(JSON.parse(existing.models_json) as string[]);
      if (model !== 'unknown') {
        modelSet.add(model);
      }
      const tokenSource: TokenDataSource =
        hasExactTokens || existing.token_source === 'transcript_exact'
          ? 'transcript_exact'
          : 'unavailable';

      this.db
        .prepare(
          `UPDATE daily_usage SET
            conversations_json = ?,
            models_json = ?,
            invocation_count = invocation_count + ?,
            tool_call_count = tool_call_count + ?,
            error_count = error_count + ?,
            input_tokens = input_tokens + ?,
            cache_read_tokens = cache_read_tokens + ?,
            output_tokens = output_tokens + ?,
            token_source = ?
           WHERE date = ?`
        )
        .run(
          JSON.stringify([...convSet]),
          JSON.stringify([...modelSet]),
          invocationDelta,
          toolDelta,
          errorDelta,
          inputTokensDelta,
          cacheTokensDelta,
          outputTokensDelta,
          tokenSource,
          dateKey
        );
    }
  }

  /**
   * Evaluates staleness and estimated approval timeouts across all active agents.
   * Marks agents 'stale' if no event arrived within `staleTimeoutMs`.
   * Marks 'running_tool' agents as 'waiting_approval' (estimated: true) if > `approvalEstimateThresholdMs`.
   */
  public evaluateTimeouts(nowMs: number = this.nowFn()): boolean {
    const activeRows = this.db
      .prepare(
        `SELECT conversation_id, status, status_estimated, last_event_at
         FROM conversations
         WHERE status IN ('thinking', 'running_tool', 'waiting_approval', 'waiting_background')`
      )
      .all() as Array<{
      conversation_id: string;
      status: AgentStatus;
      status_estimated: number;
      last_event_at: string;
    }>;

    let changed = false;

    const tx = this.db.transaction(() => {
      for (const row of activeRows) {
        const lastMs = Date.parse(row.last_event_at);
        if (Number.isNaN(lastMs)) continue;
        const elapsedMs = nowMs - lastMs;

        if (elapsedMs >= this.staleTimeoutMs) {
          this.db
            .prepare(
              `UPDATE conversations
               SET status = 'stale', status_estimated = 0, active_tool = NULL
               WHERE conversation_id = ?`
            )
            .run(row.conversation_id);
          changed = true;
        } else if (
          row.status === 'running_tool' &&
          elapsedMs >= this.approvalEstimateThresholdMs
        ) {
          this.db
            .prepare(
              `UPDATE conversations
               SET status = 'waiting_approval', status_estimated = 1
               WHERE conversation_id = ?`
            )
            .run(row.conversation_id);
          changed = true;
        }
      }
    });

    tx();

    if (changed) {
      this.notifyListeners();
    }
    return changed;
  }

  public getSnapshot(nowMs: number = this.nowFn()): TrackerSnapshot {
    this.evaluateTimeouts(nowMs);

    const convRows = this.db
      .prepare('SELECT * FROM conversations ORDER BY last_event_at DESC')
      .all() as ConversationRow[];

    const agents: Agent[] = [];
    const conversations: Conversation[] = [];

    let totalSessionInput = 0;
    let totalSessionCache = 0;
    let totalSessionOutput = 0;
    let anyExactTokens = false;

    for (const row of convRows) {
      const statusEstimated = Boolean(row.status_estimated);
      const isSubagent = Boolean(row.is_subagent);
      const hasError = Boolean(row.has_error);

      agents.push({
        conversationId: row.conversation_id,
        model: row.current_model,
        status: row.status,
        statusEstimated,
        activeTool: row.active_tool,
        startedAt: row.started_at,
        lastEventAt: row.last_event_at,
        lastEventType: row.last_event_type,
        parentConversationId: row.parent_conversation_id,
        isSubagent,
        hasError,
      });

      const tokens = buildTokenRecord(
        row.input_tokens,
        row.cache_read_tokens,
        row.output_tokens,
        row.token_source
      );

      if (row.token_source === 'transcript_exact') {
        anyExactTokens = true;
        totalSessionInput += row.input_tokens;
        totalSessionCache += row.cache_read_tokens;
        totalSessionOutput += row.output_tokens;
      }

      conversations.push({
        conversationId: row.conversation_id,
        title: row.title,
        currentModel: row.current_model,
        modelsUsed: JSON.parse(row.models_used_json) as string[],
        status: row.status,
        statusEstimated,
        startedAt: row.started_at,
        lastEventAt: row.last_event_at,
        turnCount: row.turn_count,
        toolCallCount: row.tool_call_count,
        errorCount: row.error_count,
        parentConversationId: row.parent_conversation_id,
        isSubagent,
        tokens,
      });
    }

    const activeAgents = agents.filter((a) => isAgentStatusActive(a.status));

    const modelRows = this.db
      .prepare('SELECT * FROM model_stats ORDER BY last_used_at DESC')
      .all() as ModelStatsRow[];

    const modelStats: ModelStats[] = modelRows.map((row) => {
      const convs = JSON.parse(row.conversations_json) as string[];
      return {
        model: row.model,
        conversationCount: convs.length,
        invocationCount: row.invocation_count,
        toolCallCount: row.tool_call_count,
        errorCount: row.error_count,
        lastUsedAt: row.last_used_at,
        tokens: buildTokenRecord(
          row.input_tokens,
          row.cache_read_tokens,
          row.output_tokens,
          row.token_source
        ),
      };
    });

    const dailyRows = this.db
      .prepare('SELECT * FROM daily_usage ORDER BY date DESC')
      .all() as DailyUsageRow[];

    const dailyUsage: DailyUsage[] = dailyRows.map((row) => {
      const convs = JSON.parse(row.conversations_json) as string[];
      const models = JSON.parse(row.models_json) as string[];
      return {
        date: row.date,
        conversationCount: convs.length,
        invocationCount: row.invocation_count,
        toolCallCount: row.tool_call_count,
        errorCount: row.error_count,
        modelsUsed: models,
        tokens: buildTokenRecord(
          row.input_tokens,
          row.cache_read_tokens,
          row.output_tokens,
          row.token_source
        ),
      };
    });

    const totalEventsRow = this.db
      .prepare('SELECT COUNT(*) as cnt FROM processed_events')
      .get() as { cnt: number };

    const session: Session = {
      sessionId: this.sessionId,
      startedAt: this.sessionStartedAt,
      lastActivityAt: this.lastActivityAt,
      activeAgentCount: activeAgents.length,
      totalConversations: conversations.length,
      totalEventsProcessed: totalEventsRow.cnt,
      tokens: buildTokenRecord(
        totalSessionInput,
        totalSessionCache,
        totalSessionOutput,
        anyExactTokens ? 'transcript_exact' : 'unavailable'
      ),
    };

    return {
      session,
      agents,
      activeAgents,
      conversations,
      modelStats,
      dailyUsage,
    };
  }

  public close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore close error
    }
  }
}

