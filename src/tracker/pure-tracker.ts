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
  ContextWindowMetrics,
  SkillUsageStat,
  ToolAndFileStats,
} from '../shared/types.js';

export function getModelContextLimit(model: string): number {
  const m = (model || '').toLowerCase();
  if (m.includes('gemini')) return 1_000_000;
  if (m.includes('claude')) return 200_000;
  if (m.includes('gpt-4') || m.includes('o1') || m.includes('o3')) return 128_000;
  return 200_000;
}
import type { AgentWatcherState } from '../extension/agent-watcher.js';
import { TokenStore } from './token-store.js';
import { SessionManager, type PersistentSessionState } from './session-manager.js';
import { TimeLedger } from './time-ledger.js';

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
  private timeLedger: TimeLedger;
  private syncedModelStats: ModelStats[] = [];
  private sessionTokens: TokenUsageRecord;
  private initialLifetimeTokens: number;
  private latestContextWindow: ContextWindowMetrics = {
    usedTokens: 0,
    maxTokens: 1_000_000,
    percentFull: 0,
    model: 'Gemini',
    isNearLimit: false,
  };
  private aggregatedSkills: SkillUsageStat[] = [];
  private aggregatedToolsAndFiles: ToolAndFileStats = { topTools: [], hotFiles: [] };

  constructor(
    _isLeader: boolean = false,
    customTokenStorePath?: string,
    customSessionFilePath?: string,
    customTimeLedgerPath?: string,
    freshSessionOnStart: boolean = false
  ) {
    this.sessionManager = new SessionManager(customSessionFilePath);
    const derivedTimePath =
      customTimeLedgerPath ??
      (customSessionFilePath
        ? path.join(path.dirname(customSessionFilePath), 'presence-time.json')
        : customTokenStorePath
          ? path.join(path.dirname(customTokenStorePath), 'presence-time.json')
          : undefined);
    this.timeLedger = new TimeLedger(derivedTimePath, customSessionFilePath);
    this.timeLedger.syncMinimumOverallSeconds(this.sessionManager.getLifetimeActiveSeconds());

    const now = new Date().toISOString();
    this.startTime = now;
    this.tokenStore = new TokenStore(customTokenStorePath);
    this.startHeartbeat();
    const initialTokens = this.tokenStore.getTotalCumulativeTokens();
    this.initialLifetimeTokens = initialTokens.totalTokens;
    this.sessionTokens = {
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
    const initialTimeBreakdown = this.timeLedger.getBreakdown(Date.now(), this.isPaused);
    const initialTokenBreakdown = this.tokenStore.getTokenBreakdown();
    this.session = {
      sessionId: 'ext-session-' + Date.now(),
      startedAt: this.startTime,
      lastActivityAt: new Date().toISOString(),
      activeAgentCount: 0,
      totalConversations: 0,
      totalEventsProcessed: 0,
      tokens: initialTokens,
      sessionTokens: { ...this.sessionTokens },
      lifetimeTokens: { ...initialTokens },
      lifetimeActiveSeconds: Math.max(
        this.sessionManager.getLifetimeActiveSeconds(),
        initialTimeBreakdown.overall
      ),
      timeBreakdown: initialTimeBreakdown,
      tokenBreakdown: initialTokenBreakdown,
    };

    if (freshSessionOnStart) {
      this.startFreshSession();
    }
  }

  public getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  public getTimeLedger(): TimeLedger {
    return this.timeLedger;
  }

  public pauseSession(): PersistentSessionState {
    this.timeLedger.recordTick(Date.now(), false);
    this.isPaused = true;
    const pausedState = this.sessionManager.pauseSession(
      this.session.tokens,
      this.sessionTokens
    );
    this.notify();
    return pausedState;
  }

  public resumeSession(): { startedAt: string; elapsedSeconds: number } {
    this.timeLedger.recordTick(Date.now(), true);
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
      this.timeLedger.recordTick(Date.now(), this.isPaused);
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
    this.timeLedger.recordTick(Date.now(), this.isPaused);
    this.startHeartbeat();
  }

  public syncFromLeaderSnapshot(snap: TrackerSnapshot): void {
    if (!snap) return;

    if (snap.session) {
      const syncedTimeBreakdown =
        snap.session.timeBreakdown ?? snap.timeBreakdown ?? this.session.timeBreakdown;
      const syncedTokenBreakdown =
        snap.session.tokenBreakdown ?? snap.tokenBreakdown ?? this.session.tokenBreakdown;
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
        lifetimeActiveSeconds:
          typeof snap.session.lifetimeActiveSeconds === 'number'
            ? snap.session.lifetimeActiveSeconds
            : this.session.lifetimeActiveSeconds,
        timeBreakdown: syncedTimeBreakdown,
        tokenBreakdown: syncedTokenBreakdown,
      };
      if (snap.session.sessionTokens || snap.sessionTokens) {
        this.sessionTokens = {
          ...(snap.session.sessionTokens || snap.sessionTokens!),
        };
      }
      if (snap.session.startedAt) {
        this.startTime = snap.session.startedAt;
        this.session.startedAt = snap.session.startedAt;
        this.sessionManager.setSimulatedStartTime(snap.session.startedAt);
      }
      if (snap.session.sessionTokens) {
        this.sessionManager.updateSessionTokens(
          this.sessionTokens,
          this.initialLifetimeTokens
        );
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

    const skillMap = new Map<string, SkillUsageStat>();
    const toolCountMap = new Map<string, number>();
    const fileCountMap = new Map<string, number>();
    let freshestActive: { lastActiveMs: number; usedTokens: number; model: string } | null = null;

    for (const item of conversationList) {
      if (typeof item.latestContextTokens === 'number' && item.latestContextTokens > 0) {
        const ctxModel = item.latestContextModel || item.model;
        if (!freshestActive || item.lastActiveMs > freshestActive.lastActiveMs) {
          freshestActive = {
            lastActiveMs: item.lastActiveMs,
            usedTokens: item.latestContextTokens,
            model: ctxModel,
          };
        }
      }
      if (item.skillTokens) {
        for (const [sName, sStat] of Object.entries(item.skillTokens)) {
          const existing = skillMap.get(sName);
          if (existing) {
            existing.invocationCount += sStat.invocationCount;
            existing.tokens.inputTokens += sStat.tokens.inputTokens;
            existing.tokens.cacheReadTokens += sStat.tokens.cacheReadTokens;
            existing.tokens.outputTokens += sStat.tokens.outputTokens;
            existing.tokens.totalTokens += sStat.tokens.totalTokens;
            if (sStat.lastUsedAt > existing.lastUsedAt) existing.lastUsedAt = sStat.lastUsedAt;
          } else {
            skillMap.set(sName, {
              skillName: sName,
              invocationCount: sStat.invocationCount,
              tokens: { ...sStat.tokens },
              lastUsedAt: sStat.lastUsedAt,
            });
          }
        }
      }
      if (item.toolCounts) {
        for (const [tName, count] of Object.entries(item.toolCounts)) {
          toolCountMap.set(tName, (toolCountMap.get(tName) ?? 0) + count);
        }
      }
      if (item.fileCounts) {
        for (const [fName, count] of Object.entries(item.fileCounts)) {
          fileCountMap.set(fName, (fileCountMap.get(fName) ?? 0) + count);
        }
      }
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

    if (freshestActive) {
      const maxTokens = getModelContextLimit(freshestActive.model);
      const percentFull = Math.min(
        100,
        Math.round((freshestActive.usedTokens / Math.max(1, maxTokens)) * 100)
      );
      this.latestContextWindow = {
        usedTokens: freshestActive.usedTokens,
        maxTokens,
        percentFull,
        model: freshestActive.model,
        isNearLimit: percentFull >= 80,
      };
    }

    this.aggregatedSkills = Array.from(skillMap.values()).sort(
      (a, b) => b.tokens.totalTokens - a.tokens.totalTokens
    );
    this.aggregatedToolsAndFiles = {
      topTools: Array.from(toolCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count })),
      hotFiles: Array.from(fileCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count })),
    };

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

    const localTimeBreakdown = this.timeLedger.getBreakdown(Date.now(), this.isPaused);
    const effectiveOverallSecs = Math.max(
      this.session.lifetimeActiveSeconds ?? 0,
      this.sessionManager.getLifetimeActiveSeconds(),
      localTimeBreakdown.overall
    );
    const effectiveTimeBreakdown = {
      ...localTimeBreakdown,
      overall: effectiveOverallSecs,
    };

    const localTokenBreakdown = this.tokenStore.getTokenBreakdown();
    const effectiveTokenBreakdown =
      localTokenBreakdown.overall.totalTokens > 0
        ? localTokenBreakdown
        : (this.session.tokenBreakdown ?? {
            last24h: effectiveTokens,
            weekly: effectiveTokens,
            monthly: effectiveTokens,
            yearly: effectiveTokens,
            overall: effectiveTokens,
          });

    return {
      session: {
        ...this.session,
        activeAgentCount: activeAgentsList.length,
        tokens: effectiveTokens,
        sessionTokens: { ...this.sessionTokens },
        lifetimeTokens: { ...effectiveTokens },
        lifetimeActiveSeconds: effectiveOverallSecs,
        timeBreakdown: effectiveTimeBreakdown,
        tokenBreakdown: effectiveTokenBreakdown,
      },
      sessionTokens: { ...this.sessionTokens },
      lifetimeTokens: { ...effectiveTokens },
      timeBreakdown: effectiveTimeBreakdown,
      tokenBreakdown: effectiveTokenBreakdown,
      contextWindow: { ...this.latestContextWindow },
      skillStats: this.aggregatedSkills.map((s) => ({ ...s, tokens: { ...s.tokens } })),
      toolAndFileStats: {
        topTools: [...this.aggregatedToolsAndFiles.topTools],
        hotFiles: [...this.aggregatedToolsAndFiles.hotFiles],
      },
      dailyFocus: this.timeLedger.getDailyFocusStats(Date.now(), this.isPaused),
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
    this.timeLedger.recordTick(Date.now(), this.isPaused);
    this.tokenStore.close();
    this.listeners.clear();
  }
}
