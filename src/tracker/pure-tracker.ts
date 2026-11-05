/**
 * PureTracker — Zero-Dependency In-Memory Tracker for Antigravity IDE Extension
 *
 * Implements the TrackerSnapshot interface and event processing without
 * requiring native C++ SQLite addons (better-sqlite3).
 */

import type {
  TrackerSnapshot,
  Session,
  Agent,
  Conversation,
  ModelStats,
  DailyUsage,
  WhitelistedHookPayload,
  TokenUsageRecord,
} from '../shared/types.js';
import type { AgentWatcherState } from '../extension/agent-watcher.js';

export class PureTracker {
  private session: Session;
  private agents: Map<string, Agent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private modelStats: Map<string, ModelStats> = new Map();
  private listeners: Set<(snapshot: TrackerSnapshot) => void> = new Set();
  private isPaused = false;
  private startTime = new Date().toISOString();

  constructor() {
    this.session = {
      sessionId: 'ext-session-' + Date.now(),
      startedAt: this.startTime,
      lastActivityAt: this.startTime,
      activeAgentCount: 0,
      totalConversations: 0,
      totalEventsProcessed: 0,
      tokens: {
        inputTokens: 0,
        cacheReadTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimated: false,
        source: 'unavailable',
      },
    };
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.notify();
  }

  public subscribe(fn: (snapshot: TrackerSnapshot) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  public notify(): void {
    const snap = this.getSnapshot();
    for (const fn of this.listeners) {
      try {
        fn(snap);
      } catch {}
    }
  }

  public updateFromAgentWatcher(state: AgentWatcherState): void {
    if (this.isPaused) return;

    const now = new Date().toISOString();
    this.session.lastActivityAt = now;
    this.session.activeAgentCount = state.activeAgentCount;
    this.session.tokens = state.totalTokens;

    // Update active agents map
    for (const active of state.agents) {
      const agent: Agent = {
        conversationId: active.conversationId,
        model: active.model,
        status: 'thinking',
        statusEstimated: false,
        activeTool: null,
        startedAt: new Date(active.lastActiveMs).toISOString(),
        lastEventAt: new Date(active.lastActiveMs).toISOString(),
        lastEventType: 'SessionStart',
        parentConversationId: null,
        isSubagent: false,
        hasError: false,
      };
      this.agents.set(active.conversationId, agent);

      // Model stats
      const existingModel = this.modelStats.get(active.model) ?? {
        model: active.model,
        conversationCount: 1,
        invocationCount: 1,
        toolCallCount: 0,
        errorCount: 0,
        lastUsedAt: now,
        tokens: active.tokens,
      };
      existingModel.lastUsedAt = now;
      existingModel.tokens = active.tokens;
      this.modelStats.set(active.model, existingModel);

      // Conversation
      const conv: Conversation = {
        conversationId: active.conversationId,
        title: null,
        currentModel: active.model,
        modelsUsed: [active.model],
        status: 'thinking',
        statusEstimated: false,
        startedAt: new Date(active.lastActiveMs).toISOString(),
        lastEventAt: now,
        turnCount: active.stepIndex ?? 1,
        toolCallCount: 0,
        errorCount: 0,
        parentConversationId: null,
        isSubagent: false,
        tokens: active.tokens,
      };
      this.conversations.set(active.conversationId, conv);
    }

    this.session.totalConversations = this.conversations.size;
    this.notify();
  }

  public processEvent(payload: WhitelistedHookPayload): void {
    if (this.isPaused) return;
    this.session.totalEventsProcessed++;
    this.session.lastActivityAt = payload.timestamp;
    this.notify();
  }

  public getSnapshot(): TrackerSnapshot {
    const agentsList = Array.from(this.agents.values());
    const activeAgentsList = agentsList.filter((a) => a.status === 'thinking');

    const dailyUsage: DailyUsage[] = [
      {
        date: new Date().toISOString().slice(0, 10),
        conversationCount: this.conversations.size,
        invocationCount: 0,
        toolCallCount: 0,
        errorCount: 0,
        modelsUsed: Array.from(this.modelStats.keys()),
        tokens: this.session.tokens,
      },
    ];

    return {
      session: { ...this.session },
      agents: agentsList,
      activeAgents: activeAgentsList,
      conversations: Array.from(this.conversations.values()),
      modelStats: Array.from(this.modelStats.values()),
      dailyUsage,
    };
  }

  public close(): void {
    this.listeners.clear();
  }
}
