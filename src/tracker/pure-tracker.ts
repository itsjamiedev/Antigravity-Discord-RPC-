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

function getSessionStateFilePath(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'presence-session.json');
}

function loadOrCreatePersistentStartTime(): string {
  const filePath = getSessionStateFilePath();
  const nowMs = Date.now();
  try {
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (
        typeof raw?.startedAt === 'string' &&
        typeof raw?.lastHeartbeatMs === 'number' &&
        nowMs - raw.lastHeartbeatMs < 600_000 // Preserved across window reloads, handoffs, and idle spans
      ) {
        // Antigravity IDE is still running
        return raw.startedAt;
      }
    }
  } catch {
    // ignore read error
  }

  const freshStart = new Date(nowMs).toISOString();
  savePersistentHeartbeat(freshStart, nowMs);
  return freshStart;
}

function savePersistentHeartbeat(startedAt: string, nowMs: number = Date.now()): void {
  const filePath = getSessionStateFilePath();
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify({ startedAt, lastHeartbeatMs: nowMs }),
      'utf8'
    );
  } catch {
    // fail-open
  }
}

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

  constructor(_isLeader: boolean = false, customTokenStorePath?: string) {
    this.startTime = loadOrCreatePersistentStartTime();
    this.tokenStore = new TokenStore(customTokenStorePath);
    this.startHeartbeat();
    const initialTokens = this.tokenStore.getTotalCumulativeTokens();
    this.session = {
      sessionId: 'ext-session-' + Date.now(),
      startedAt: this.startTime,
      lastActivityAt: new Date().toISOString(),
      activeAgentCount: 0,
      totalConversations: 0,
      totalEventsProcessed: 0,
      tokens: initialTokens,
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

  public startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      savePersistentHeartbeat(this.startTime, Date.now());
    }, 10_000);
    this.heartbeatTimer.unref?.();
  }

  public refreshPersistentStartTime(): void {
    this.startTime = loadOrCreatePersistentStartTime();
    this.session.startedAt = this.startTime;
    savePersistentHeartbeat(this.startTime, Date.now());
    this.startHeartbeat();
  }

  public updateFromAgentWatcher(state: AgentWatcherState): void {
    if (this.isPaused) return;

    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    const dateStr = now.slice(0, 10);
    savePersistentHeartbeat(this.startTime, nowMs);

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

    for (const item of conversationList) {
      if (item.tokens && item.tokens.totalTokens > 0) {
        this.tokenStore.recordConversationTokens(
          item.conversationId,
          item.model,
          item.tokens,
          item.stepIndex ?? 1,
          dateStr
        );
      }

      const isActive = activeIds.has(item.conversationId);
      const convStatus = isActive
        ? (item.activeTool ? 'running_tool' : 'thinking')
        : 'idle';

      // Conversation summary
      const conv: Conversation = {
        conversationId: item.conversationId,
        title: null,
        currentModel: item.model,
        modelsUsed: [item.model],
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
    this.session.tokens = this.tokenStore.getTotalCumulativeTokens();
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

    const modelStatsList = this.tokenStore.getModelStats();
    const dailyUsage = this.tokenStore.getDailyUsage();

    return {
      session: {
        ...this.session,
        activeAgentCount: activeAgentsList.length,
        tokens: this.tokenStore.getTotalCumulativeTokens(),
      },
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
