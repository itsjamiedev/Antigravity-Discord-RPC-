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
  ModelStats,
  DailyUsage,
  WhitelistedHookPayload,
  TokenUsageRecord,
} from '../shared/types.js';
import type { AgentWatcherState } from '../extension/agent-watcher.js';

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
        nowMs - raw.lastHeartbeatMs < 60_000
      ) {
        // Antigravity IDE is still running (window reload or leader handoff)
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
  private modelStats: Map<string, ModelStats> = new Map();
  private listeners: Set<(snapshot: TrackerSnapshot) => void> = new Set();
  private isPaused = false;
  private startTime: string;

  constructor() {
    this.startTime = loadOrCreatePersistentStartTime();
    this.session = {
      sessionId: 'ext-session-' + Date.now(),
      startedAt: this.startTime,
      lastActivityAt: new Date().toISOString(),
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

    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();
    savePersistentHeartbeat(this.startTime, nowMs);

    this.session.lastActivityAt = now;
    this.session.activeAgentCount = state.activeAgentCount;
    this.session.tokens = state.totalTokens;

    const activeIds = new Set(state.agents.map((a) => a.conversationId));

    // 1. Mark any agents no longer active as idle
    for (const [id, agent] of this.agents.entries()) {
      if (!activeIds.has(id)) {
        agent.status = 'idle';
      }
    }

    // 2. Update active agents and models
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

    // Also update conversations that became idle
    for (const [id, conv] of this.conversations.entries()) {
      if (!activeIds.has(id)) {
        conv.status = 'idle';
      }
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

    // Only active models for currently active agents
    const activeModelsList = Array.from(
      new Set(activeAgentsList.map((a) => a.model))
    );

    const modelStatsList = Array.from(this.modelStats.values());

    const dailyUsage: DailyUsage[] = [
      {
        date: new Date().toISOString().slice(0, 10),
        conversationCount: this.conversations.size,
        invocationCount: 0,
        toolCallCount: 0,
        errorCount: 0,
        modelsUsed: activeModelsList.length > 0 ? activeModelsList : Array.from(this.modelStats.keys()),
        tokens: this.session.tokens,
      },
    ];

    return {
      session: { ...this.session, activeAgentCount: activeAgentsList.length },
      agents: agentsList,
      activeAgents: activeAgentsList,
      conversations: Array.from(this.conversations.values()),
      modelStats: modelStatsList,
      dailyUsage,
    };
  }

  public close(): void {
    this.listeners.clear();
  }
}
