import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { SessionManager } from '../src/tracker/session-manager.js';

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
});
