/**
 * SessionManager — 24-Hour Session Persistence & Resumption Engine
 *
 * Tracks active session duration, supports "Pause & Leave" for up to 24 hours
 * across computer shutdowns and restarts, and maintains exact elapsed session timing.
 * Zero native dependencies.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TokenUsageRecord } from '../shared/types.js';

export interface PersistentSessionState {
  version: number;
  sessionId: string;
  startedAt: string;
  elapsedSeconds: number;
  lastHeartbeatMs: number;
  isPaused: boolean;
  pausedAt?: string;
  savedAt: string;
  savedTokens?: TokenUsageRecord;
}

export class SessionManager {
  private filePath: string;
  private state: PersistentSessionState;

  constructor(customFilePath?: string) {
    this.filePath =
      customFilePath ??
      path.join(os.homedir(), '.gemini', 'antigravity', 'presence-session.json');

    const loaded = this.loadFromDisk();
    if (loaded) {
      this.state = loaded;
    } else {
      const now = Date.now();
      const startedAt = new Date(now).toISOString();
      this.state = {
        version: 1,
        sessionId: 'session-' + now,
        startedAt,
        elapsedSeconds: 0,
        lastHeartbeatMs: now,
        isPaused: false,
        savedAt: startedAt,
      };
      this.saveToDisk(this.state);
    }
  }

  private loadFromDisk(): PersistentSessionState | null {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        if (raw && typeof raw.startedAt === 'string') {
          const now = Date.now();
          const startMs = Date.parse(raw.startedAt) || now;
          const lastHeartbeatMs =
            typeof raw.lastHeartbeatMs === 'number' ? raw.lastHeartbeatMs : now;
          const elapsedSeconds =
            typeof raw.elapsedSeconds === 'number'
              ? raw.elapsedSeconds
              : Math.max(0, Math.floor((now - startMs) / 1000));

          return {
            version: 1,
            sessionId:
              typeof raw.sessionId === 'string'
                ? raw.sessionId
                : 'session-' + startMs,
            startedAt: raw.startedAt,
            elapsedSeconds,
            lastHeartbeatMs,
            isPaused: !!raw.isPaused,
            pausedAt: raw.pausedAt,
            savedAt: raw.savedAt || new Date().toISOString(),
            savedTokens: raw.savedTokens,
          };
        }
      }
    } catch {
      // fail-open
    }
    return null;
  }

  private saveToDisk(state: PersistentSessionState): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch {
      // fail-open
    }
  }

  public getSessionState(): PersistentSessionState | null {
    return { ...this.state };
  }

  /**
   * Checks whether a previous session exists and is within the retention window (default 24h).
   */
  public canResumeSession(maxAgeMs: number = 24 * 3600 * 1000): boolean {
    const now = Date.now();
    const age = now - this.state.lastHeartbeatMs;
    if (age < 0 || age > maxAgeMs) {
      return false;
    }
    // Must have meaningful elapsed time or be explicitly paused
    return this.state.elapsedSeconds > 0 || this.state.isPaused;
  }

  public getElapsedSeconds(): number {
    if (this.state.isPaused) {
      return this.state.elapsedSeconds;
    }
    const currentElapsed = Math.floor(
      (Date.now() - new Date(this.state.startedAt).getTime()) / 1000
    );
    return Math.max(0, currentElapsed);
  }

  public recordHeartbeat(): void {
    const now = Date.now();
    if (!this.state.isPaused) {
      this.state.elapsedSeconds = this.getElapsedSeconds();
    }
    this.state.lastHeartbeatMs = now;
    this.saveToDisk(this.state);
  }

  public setSimulatedStartTime(startedAt: string): void {
    this.state.startedAt = startedAt;
    if (!this.state.isPaused) {
      this.state.elapsedSeconds = Math.max(
        0,
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      );
    }
    this.saveToDisk(this.state);
  }

  /**
   * Freezes active session elapsed seconds and marks it as paused.
   */
  public pauseSession(tokens?: TokenUsageRecord): PersistentSessionState {
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    if (!this.state.isPaused) {
      this.state.elapsedSeconds = this.getElapsedSeconds();
      this.state.isPaused = true;
      this.state.pausedAt = nowIso;
    }
    this.state.lastHeartbeatMs = now;
    this.state.savedAt = nowIso;
    if (tokens) {
      this.state.savedTokens = tokens;
    }
    this.saveToDisk(this.state);
    return { ...this.state };
  }

  /**
   * Resumes the paused session, adjusting startedAt so that elapsed time continues
   * from the exact elapsed seconds saved without counting offline shutdown duration.
   */
  public resumeSession(): { startedAt: string; elapsedSeconds: number } {
    const now = Date.now();
    const adjustedStartMs = now - this.state.elapsedSeconds * 1000;
    const adjustedStartedAt = new Date(adjustedStartMs).toISOString();

    this.state.startedAt = adjustedStartedAt;
    this.state.isPaused = false;
    this.state.pausedAt = undefined;
    this.state.lastHeartbeatMs = now;
    this.state.savedAt = new Date(now).toISOString();

    this.saveToDisk(this.state);
    return {
      startedAt: this.state.startedAt,
      elapsedSeconds: this.state.elapsedSeconds,
    };
  }

  /**
   * Resets elapsed time and starts a brand new session.
   */
  public startFreshSession(): { startedAt: string; elapsedSeconds: number } {
    const now = Date.now();
    const startedAt = new Date(now).toISOString();

    this.state = {
      version: 1,
      sessionId: 'session-' + now,
      startedAt,
      elapsedSeconds: 0,
      lastHeartbeatMs: now,
      isPaused: false,
      savedAt: startedAt,
      savedTokens: undefined,
    };

    this.saveToDisk(this.state);
    return {
      startedAt: this.state.startedAt,
      elapsedSeconds: 0,
    };
  }

  /**
   * Called during IDE window deactivation / beforeunload to persist state cleanly.
   */
  public saveOnShutdown(): void {
    this.recordHeartbeat();
    this.state.savedAt = new Date().toISOString();
    this.saveToDisk(this.state);
  }
}

