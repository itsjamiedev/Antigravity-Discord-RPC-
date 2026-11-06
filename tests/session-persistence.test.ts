import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SessionManager } from '../src/tracker/session-manager.js';
import { PureTracker } from '../src/tracker/pure-tracker.js';

describe('SessionManager (24-Hour Pause & Leave Resumption)', () => {
  let tempDir: string;
  let sessionFilePath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-session-test-'));
    sessionFilePath = path.join(tempDir, 'presence-session.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it('creates an initial session with fresh startedAt and 0 elapsed seconds', () => {
    const manager = new SessionManager(sessionFilePath);
    const state = manager.getSessionState();

    expect(state).not.toBeNull();
    expect(state!.version).toBe(1);
    expect(state!.elapsedSeconds).toBe(0);
    expect(state!.isPaused).toBe(false);
    expect(typeof state!.startedAt).toBe('string');
  });

  it('records heartbeats and updates elapsed seconds', async () => {
    const manager = new SessionManager(sessionFilePath);
    // Simulate active session running for 5 seconds
    const simulatedStart = new Date(Date.now() - 5000).toISOString();
    manager.setSimulatedStartTime(simulatedStart);
    manager.recordHeartbeat();

    const state = manager.getSessionState();
    expect(state!.elapsedSeconds).toBeGreaterThanOrEqual(4);
    expect(state!.isPaused).toBe(false);
  });

  it('pauses session and freezes elapsed seconds and token stats', () => {
    const manager = new SessionManager(sessionFilePath);
    // Set 120 seconds elapsed
    const simulatedStart = new Date(Date.now() - 120_000).toISOString();
    manager.setSimulatedStartTime(simulatedStart);
    manager.recordHeartbeat();

    const mockTokens = {
      inputTokens: 1500,
      cacheReadTokens: 4000,
      outputTokens: 250,
      totalTokens: 5750,
      estimated: false,
      source: 'transcript_exact' as const,
    };

    const pausedState = manager.pauseSession(mockTokens);
    expect(pausedState.isPaused).toBe(true);
    expect(pausedState.elapsedSeconds).toBeGreaterThanOrEqual(119);
    expect(pausedState.savedTokens?.totalTokens).toBe(5750);

    // Verify written to disk
    const onDisk = JSON.parse(fs.readFileSync(sessionFilePath, 'utf8'));
    expect(onDisk.isPaused).toBe(true);
    expect(onDisk.savedTokens.totalTokens).toBe(5750);
  });

  it('allows resuming session within 24 hours after machine shutdown', () => {
    const now = Date.now();
    // Simulate user shutdown 10 hours ago with 3600 seconds (1 hour) elapsed
    const tenHoursAgo = now - 10 * 3600 * 1000;
    const pastState = {
      version: 1,
      sessionId: 'test-session-old',
      startedAt: new Date(tenHoursAgo - 3600 * 1000).toISOString(),
      elapsedSeconds: 3600,
      lastHeartbeatMs: tenHoursAgo,
      isPaused: true,
      pausedAt: new Date(tenHoursAgo).toISOString(),
      savedAt: new Date(tenHoursAgo).toISOString(),
      savedTokens: {
        inputTokens: 1000,
        cacheReadTokens: 3000,
        outputTokens: 500,
        totalTokens: 4500,
        estimated: false,
        source: 'transcript_exact',
      },
    };
    fs.writeFileSync(sessionFilePath, JSON.stringify(pastState), 'utf8');

    const manager = new SessionManager(sessionFilePath);
    expect(manager.canResumeSession(24 * 3600 * 1000)).toBe(true);

    // Resume session
    const resumed = manager.resumeSession();
    expect(resumed.elapsedSeconds).toBe(3600);

    // startedAt must be adjusted so that (now - startedAt) equals elapsedSeconds
    const recalculatedElapsed = Math.floor((Date.now() - new Date(resumed.startedAt).getTime()) / 1000);
    expect(recalculatedElapsed).toBeCloseTo(3600, -1); // within ~2 seconds tolerance

    const newState = manager.getSessionState();
    expect(newState!.isPaused).toBe(false);
  });

  it('rejects resumption if session is older than 24 hours', () => {
    const now = Date.now();
    // Simulate user shutdown 25 hours ago
    const twentyFiveHoursAgo = now - 25 * 3600 * 1000;
    const expiredState = {
      version: 1,
      sessionId: 'test-session-expired',
      startedAt: new Date(twentyFiveHoursAgo - 3600 * 1000).toISOString(),
      elapsedSeconds: 3600,
      lastHeartbeatMs: twentyFiveHoursAgo,
      isPaused: true,
      savedAt: new Date(twentyFiveHoursAgo).toISOString(),
    };
    fs.writeFileSync(sessionFilePath, JSON.stringify(expiredState), 'utf8');

    const manager = new SessionManager(sessionFilePath);
    expect(manager.canResumeSession(24 * 3600 * 1000)).toBe(false);
  });

  it('starts fresh session cleanly resetting elapsed seconds and timer', () => {
    const manager = new SessionManager(sessionFilePath);
    manager.setSimulatedStartTime(new Date(Date.now() - 50000).toISOString());
    manager.recordHeartbeat();

    const fresh = manager.startFreshSession();
    expect(fresh.elapsedSeconds).toBe(0);
    const state = manager.getSessionState();
    expect(state!.elapsedSeconds).toBe(0);
    expect(state!.isPaused).toBe(false);
  });

  it('seamlessly loads legacy presence-session.json without losing timer or startedAt', () => {
    const legacyStart = new Date(Date.now() - 5800 * 1000).toISOString();
    const legacyState = {
      startedAt: legacyStart,
      lastHeartbeatMs: Date.now() - 2000,
    };
    fs.writeFileSync(sessionFilePath, JSON.stringify(legacyState), 'utf8');

    const manager = new SessionManager(sessionFilePath);
    const state = manager.getSessionState();

    expect(state).not.toBeNull();
    expect(state!.version).toBe(1);
    expect(state!.startedAt).toBe(legacyStart);
    expect(state!.elapsedSeconds).toBeGreaterThanOrEqual(5790);
    expect(state!.isPaused).toBe(false);
  });

  it('PureTracker syncs session, timer and agents from Leader snapshot in follower mode', () => {
    const tracker = new PureTracker(false, path.join(tempDir, 'tokens.json'), sessionFilePath);
    const mockLeaderSnapshot = {
      session: {
        sessionId: 'leader-session-123',
        startedAt: new Date(Date.now() - 7200_000).toISOString(),
        lastActivityAt: new Date().toISOString(),
        activeAgentCount: 1,
        totalConversations: 10,
        totalEventsProcessed: 45,
        tokens: {
          inputTokens: 50_000,
          cacheReadTokens: 200_000,
          outputTokens: 10_000,
          totalTokens: 260_000,
          estimated: false,
          source: 'transcript_exact' as const,
        },
      },
      agents: [],
      activeAgents: [
        {
          conversationId: 'c1',
          model: 'Gemini 3.8 Flash',
          status: 'thinking' as const,
          statusEstimated: false,
          activeTool: null,
          startedAt: new Date().toISOString(),
          lastEventAt: new Date().toISOString(),
          lastEventType: 'SessionStart' as const,
          parentConversationId: null,
          isSubagent: false,
          hasError: false,
        },
      ],
      conversations: [],
      modelStats: [],
      dailyUsage: [],
    };

    tracker.syncFromLeaderSnapshot(mockLeaderSnapshot);
    const snap = tracker.getSnapshot();
    expect(snap.session.sessionId).toBe('leader-session-123');
    expect(snap.session.startedAt).toBe(mockLeaderSnapshot.session.startedAt);
    expect(snap.session.tokens.totalTokens).toBe(260_000);
    tracker.close();
  });

  it('persists session tokens and initial lifetime tokens across pauses and restarts', () => {
    const manager = new SessionManager(sessionFilePath);
    const initialSessionTokens = {
      inputTokens: 10_000,
      cacheReadTokens: 50_000,
      outputTokens: 2_000,
      totalTokens: 62_000,
      estimated: false,
      source: 'transcript_exact' as const,
    };

    manager.updateSessionTokens(initialSessionTokens, 500_000_000);
    let state = manager.getSessionState();
    expect(state?.sessionTokens?.totalTokens).toBe(62_000);
    expect(state?.initialLifetimeTokens).toBe(500_000_000);

    // Pause session with sessionTokens
    const pausedTokens = {
      inputTokens: 20_000,
      cacheReadTokens: 80_000,
      outputTokens: 4_000,
      totalTokens: 104_000,
      estimated: false,
      source: 'transcript_exact' as const,
    };
    manager.pauseSession(undefined, pausedTokens);

    // Re-instantiate SessionManager from disk simulating restart
    const restoredManager = new SessionManager(sessionFilePath);
    state = restoredManager.getSessionState();
    expect(state?.isPaused).toBe(true);
    expect(state?.sessionTokens?.totalTokens).toBe(104_000);
    expect(state?.initialLifetimeTokens).toBe(500_000_000);
  });
});

