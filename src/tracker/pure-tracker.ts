/**
 * PureTracker — Zero-Dependency In-Memory Tracker for Antigravity IDE Extension
 *
 * Implements the TrackerSnapshot interface and event processing without
 * requiring native C++ SQLite addons (better-sqlite3).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type {
  TrackerSnapshot,
  Session,
  Agent,
  Conversation,
  ConversationDetail,
  ModelStats,
  DailyUsage,
  WhitelistedHookPayload,
  TokenUsageRecord,
} from '../shared/types.js';
import type { AgentWatcherState } from '../extension/agent-watcher.js';
import { TokenStore } from './token-store.js';
import { SessionManager, type PersistentSessionState } from './session-manager.js';

export class PureTracker {
  private session: Session;
  private agents: Map<string, Agent> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private conversationDetails: Map<string, ConversationDetail> = new Map();
  private modelStats: Map<string, ModelStats> = new Map();
  private listeners: Set<(snapshot: TrackerSnapshot) => void> = new Set();
  private isPaused = false;
  private startTime: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private tokenStore: TokenStore;
  private sessionManager: SessionManager;
  private syncedModelStats: ModelStats[] = [];
  private sessionTokens: TokenUsageRecord;
  private initialLifetimeTokens: number;

  constructor(_isLeader: boolean = false, customTokenStorePath?: string, customSessionFilePath?: string) {
    this.sessionManager = new SessionManager(customSessionFilePath);
    const sessionState = this.sessionManager.getSessionState();
    this.startTime = sessionState?.startedAt || new Date().toISOString();
    this.tokenStore = new TokenStore(customTokenStorePath);
    this.startHeartbeat();
    const initialTokens = this.tokenStore.getTotalCumulativeTokens();
    this.initialLifetimeTokens =
      typeof sessionState?.initialLifetimeTokens === 'number'
        ? sessionState.initialLifetimeTokens
        : initialTokens.totalTokens;
    this.sessionTokens = sessionState?.sessionTokens || {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      source: 'transcript_exact',
    };
    if (
      this.sessionTokens.totalTokens === 0 &&
      initialTokens.totalTokens > this.initialLifetimeTokens
    ) {
      const diff = initialTokens.totalTokens - this.initialLifetimeTokens;
      this.sessionTokens.totalTokens = diff;
      this.sessionTokens.outputTokens = diff;
    }
    this.session = {
      sessionId: sessionState?.sessionId || ('ext-session-' + Date.now()),
      startedAt: this.startTime,
      lastActivityAt: new Date().toISOString(),
      activeAgentCount: 0,
      totalConversations: 0,
      totalEventsProcessed: 0,
      tokens: initialTokens,
      sessionTokens: { ...this.sessionTokens },
      lifetimeTokens: { ...initialTokens },
    };
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public pauseSession(): PersistentSessionState {
    this.isPaused = true;
    const pausedState = this.sessionManager.pauseSession(
      this.session.tokens,
      this.sessionTokens
    );
    this.notify();
    return pausedState;
  }

  public resumeSession(): { startedAt: string; elapsedSeconds: number } {
    this.isPaused = false;
    const resumed = this.sessionManager.resumeSession();
    this.startTime = resumed.startedAt;
    this.session.startedAt = resumed.startedAt;
    const sessionState = this.sessionManager.getSessionState();
    if (sessionState?.sessionTokens) {
      this.sessionTokens = { ...sessionState.sessionTokens };
    }
    this.notify();
    return resumed;
  }

  public startFreshSession(): { startedAt: string; elapsedSeconds: number } {
    this.isPaused = false;
    const lifetimeTokens = this.tokenStore.getTotalCumulativeTokens();
    this.initialLifetimeTokens = lifetimeTokens.totalTokens;
    this.sessionTokens = {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      source: 'transcript_exact',
    };
    const fresh = this.sessionManager.startFreshSession(this.initialLifetimeTokens);
    this.startTime = fresh.startedAt;
    this.session.startedAt = fresh.startedAt;
    this.session.sessionId = 'session-' + Date.now();
    this.session.sessionTokens = { ...this.sessionTokens };
    this.session.lifetimeTokens = { ...lifetimeTokens };
    this.notify();
    return fresh;
  }

  public setPaused(paused: boolean): void {
    if (paused) {
      this.pauseSession();
    } else {
      this.resumeSession();
    }
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

  public startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.sessionManager.recordHeartbeat();
    }, 10_000);
    this.heartbeatTimer.unref?.();
  }

  public refreshPersistentStartTime(): void {
    const state = this.sessionManager.getSessionState();
    if (state) {
      this.startTime = state.startedAt;
      this.session.startedAt = state.startedAt;
    }
    this.sessionManager.recordHeartbeat();
    this.startHeartbeat();
  }

  public syncFromLeaderSnapshot(snap: TrackerSnapshot): void {
    if (!snap) return;

    if (snap.session) {
      this.session = {
        ...this.session,
        ...snap.session,
        tokens: snap.session.tokens ?? this.session.tokens,
        sessionTokens:
          snap.session.sessionTokens ??
          snap.sessionTokens ??
          this.session.sessionTokens,
        lifetimeTokens:
          snap.session.lifetimeTokens ??
          snap.lifetimeTokens ??
          this.session.lifetimeTokens,
      };
      if (snap.session.sessionTokens || snap.sessionTokens) {
        this.sessionTokens = {
          ...(snap.session.sessionTokens || snap.sessionTokens!),
        };
      }
      if (snap.session.startedAt) {
        this.startTime = snap.session.startedAt;
      }
    }

    if (Array.isArray(snap.agents)) {
      this.agents.clear();
      for (const a of snap.agents) {
        this.agents.set(a.conversationId, a);
      }
    }

    if (Array.isArray(snap.activeAgents)) {
      for (const a of snap.activeAgents) {
        this.agents.set(a.conversationId, a);
      }
    }

    if (Array.isArray(snap.conversations)) {
      this.conversations.clear();
      for (const c of snap.conversations) {
        this.conversations.set(c.conversationId, c);
      }
    }

    if (Array.isArray(snap.modelStats) && snap.modelStats.length > 0) {
      this.syncedModelStats = [...snap.modelStats];
    }

    this.notify();
  }

  public updateFromAgentWatcher(state: AgentWatcherState): void {
    if (this.isPaused) return;

    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const dateStr = now.slice(0, 10);
    this.sessionManager.recordHeartbeat();

    this.session.lastActivityAt = now;
    this.session.activeAgentCount = state.activeAgentCount;

    const activeIds = new Set(state.agents.map((a) => a.conversationId));

    // 1. Mark any agents no longer active as idle
    for (const [id, agent] of this.agents.entries()) {
      if (!activeIds.has(id)) {
        agent.status = 'idle';
        agent.activeTool = null;
      }
    }

    // 2. Process all discovered conversations into persistent token store
    const conversationList =
      state.allConversations && state.allConversations.length > 0
        ? state.allConversations
        : state.agents;

    let totalDeltaIn = 0;
    let totalDeltaCache = 0;
    let totalDeltaOut = 0;

    for (const item of conversationList) {
      if (item.modelTokens && Object.keys(item.modelTokens).length > 0) {
        const res = this.tokenStore.recordConversationMultiModelTokens(
          item.conversationId,
          item.modelTokens,
          item.stepIndex ?? 1,
          item.model,
          dateStr
        );
        if (res?.deltaTokens) {
          totalDeltaIn += res.deltaTokens.inputTokens;
          totalDeltaCache += res.deltaTokens.cacheReadTokens;
          totalDeltaOut += res.deltaTokens.outputTokens;
        }
      } else if (item.tokens && item.tokens.totalTokens > 0) {
        const res = this.tokenStore.recordConversationTokens(
          item.conversationId,
          item.model,
          item.tokens,
          item.stepIndex ?? 1,
          dateStr
        );
        if (res?.deltaTokens) {
          totalDeltaIn += res.deltaTokens.inputTokens;
          totalDeltaCache += res.deltaTokens.cacheReadTokens;
          totalDeltaOut += res.deltaTokens.outputTokens;
        }
      }

      // Hydrate historical daily buckets
      if (item.dailyTokens) {
        for (const [dDate, dToks] of Object.entries(item.dailyTokens)) {
          this.tokenStore.recordHistoricalDailyTokens(
            dDate,
            dToks,
            item.modelsUsed || [item.model]
          );
        }
      }

      const isActive = activeIds.has(item.conversationId);
      const convStatus = isActive
        ? (item.activeTool ? 'running_tool' : 'thinking')
        : 'idle';

      const modelsUsed =
        item.modelsUsed && item.modelsUsed.length > 0 ? item.modelsUsed : [item.model];

      // Conversation summary
      const conv: Conversation = {
        conversationId: item.conversationId,
        title: null,
        currentModel: item.model,
        modelsUsed,
        status: convStatus,
        statusEstimated: false,
        activeTool: isActive ? (item.activeTool ?? null) : null,
        startedAt: new Date(item.lastActiveMs).toISOString(),
        lastEventAt: now,
        turnCount: item.stepIndex ?? 1,
        toolCallCount: item.recentEvents?.filter((e) => e.toolName).length ?? 0,
        errorCount: 0,
        parentConversationId: null,
        isSubagent: false,
        tokens: item.tokens,
      };
      this.conversations.set(item.conversationId, conv);

      // Detailed metadata for drawer inspection
      const inTok = item.tokens.inputTokens;
      const cacheTok = item.tokens.cacheReadTokens;
      const ratio = inTok + cacheTok > 0 ? Math.round((cacheTok / (inTok + cacheTok)) * 100) : 0;

      const detail: ConversationDetail = {
        ...conv,
        activeTool: conv.activeTool ?? null,
        cacheHitRatio: ratio,
        recentEvents: item.recentEvents ?? [],
      };
      this.conversationDetails.set(item.conversationId, detail);
    }

    const totalDelta = totalDeltaIn + totalDeltaCache + totalDeltaOut;
    if (totalDelta > 0) {
      this.sessionTokens.inputTokens += totalDeltaIn;
      this.sessionTokens.cacheReadTokens += totalDeltaCache;
      this.sessionTokens.outputTokens += totalDeltaOut;
      this.sessionTokens.totalTokens += totalDelta;
      this.sessionManager.updateSessionTokens(
        this.sessionTokens,
        this.initialLifetimeTokens
      );
    }

    // 3. Update active agents
    for (const active of state.agents) {
      const agent: Agent = {
        conversationId: active.conversationId,
        model: active.model,
        status: active.activeTool ? 'running_tool' : 'thinking',
        statusEstimated: false,
        activeTool: active.activeTool ?? null,
        startedAt: new Date(active.lastActiveMs).toISOString(),
        lastEventAt: new Date(active.lastActiveMs).toISOString(),
        lastEventType: 'SessionStart',
        parentConversationId: null,
        isSubagent: false,
        hasError: false,
      };
      this.agents.set(active.conversationId, agent);
    }

    // Synchronize session tokens from persistent store
    const cumulativeTokens = this.tokenStore.getTotalCumulativeTokens();
    this.session.tokens = cumulativeTokens;
    this.session.lifetimeTokens = { ...cumulativeTokens };
    if (
      this.sessionTokens.totalTokens === 0 &&
      cumulativeTokens.totalTokens > this.initialLifetimeTokens
    ) {
      const diff = cumulativeTokens.totalTokens - this.initialLifetimeTokens;
      this.sessionTokens.totalTokens = diff;
      this.sessionTokens.outputTokens = diff;
      this.sessionManager.updateSessionTokens(
        this.sessionTokens,
        this.initialLifetimeTokens
      );
    }
    this.session.sessionTokens = { ...this.sessionTokens };
    this.session.totalConversations = this.conversations.size;
    this.notify();
  }

  public getConversationDetail(conversationId: string): ConversationDetail | null {
    return this.conversationDetails.get(conversationId) ?? null;
  }

  public processEvent(payload: WhitelistedHookPayload): void {
    if (this.isPaused) return;
    this.session.totalEventsProcessed++;
    this.session.lastActivityAt = payload.timestamp;
    this.notify();
  }

  public getSnapshot(): TrackerSnapshot {
    const agentsList = Array.from(this.agents.values());
    const activeAgentsList = agentsList.filter(
      (a) => a.status === 'thinking' || a.status === 'running_tool'
    );

    const localTokens = this.tokenStore.getTotalCumulativeTokens();
    const effectiveTokens =
      localTokens.totalTokens > 0
        ? localTokens
        : (this.session.tokens ?? localTokens);

    const localModelStats = this.tokenStore.getModelStats();
    const modelStatsList =
      localModelStats.length > 0
        ? localModelStats
        : this.syncedModelStats;
    const dailyUsage = this.tokenStore.getDailyUsage();

    return {
      session: {
        ...this.session,
        activeAgentCount: activeAgentsList.length,
        tokens: effectiveTokens,
        sessionTokens: { ...this.sessionTokens },
        lifetimeTokens: { ...effectiveTokens },
      },
      sessionTokens: { ...this.sessionTokens },
      lifetimeTokens: { ...effectiveTokens },
      agents: agentsList,
      activeAgents: activeAgentsList,
      conversations: Array.from(this.conversations.values()),
      modelStats: modelStatsList,
      dailyUsage:
        dailyUsage.length > 0
          ? dailyUsage
          : [
              {
                date: new Date().toISOString().slice(0, 10),
                conversationCount: this.conversations.size,
                invocationCount: 0,
                toolCallCount: 0,
                errorCount: 0,
                modelsUsed: modelStatsList.map((m) => m.model),
                tokens: this.session.tokens,
              },
            ],
    };
  }

  public close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.tokenStore.close();
    this.listeners.clear();
  }
}
