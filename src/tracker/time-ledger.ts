/**
 * TimeLedger — Persistent Multi-Range Active Hours Ledger
 *
 * Tracks exact active seconds spent in Google Antigravity across:
 *   - 24 Hours (rolling 24 hourly buckets)
 *   - Weekly (rolling 7 daily buckets)
 *   - Monthly (rolling 30 daily buckets)
 *   - Yearly (rolling 365 daily buckets)
 *   - Overall (cumulative lifetime total + legacy seed from presence-session.json)
 *
 * Guards against machine sleep/hibernation by clamping individual tick deltas to <= 120s.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { TimeBreakdown } from '../shared/types.js';

export interface PersistentTimeLedgerData {
  version: number;
  lastSavedAt: string;
  lastTickMs: number;
  legacySeedSeconds: number;
  hourlyActiveSeconds: Record<string, number>;
  dailyActiveSeconds: Record<string, number>;
}

export function getDefaultTimeLedgerPath(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'presence-time.json');
}

export function toUtcDateKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD
}

export function toUtcHourKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13); // YYYY-MM-DDTHH
}

export class TimeLedger {
  private readonly filePath: string;
  private readonly legacySessionPath: string;
  private lastTickMs: number;
  private legacySeedSeconds = 0;
  private hourlyActiveSeconds: Map<string, number> = new Map();
  private dailyActiveSeconds: Map<string, number> = new Map();

  constructor(customFilePath?: string, customLegacySessionPath?: string) {
    this.filePath = customFilePath ?? getDefaultTimeLedgerPath();
    this.legacySessionPath =
      customLegacySessionPath ??
      path.join(path.dirname(this.filePath), 'presence-session.json');
    this.lastTickMs = Date.now();
    this.load();
  }

  public getFilePath(): string {
    return this.filePath;
  }

  private readLegacySeedFromSessionFile(): number {
    try {
      if (fs.existsSync(this.legacySessionPath)) {
        const raw = JSON.parse(fs.readFileSync(this.legacySessionPath, 'utf8'));
        if (raw && typeof raw === 'object') {
          if (typeof raw.lifetimeActiveSeconds === 'number' && raw.lifetimeActiveSeconds > 0) {
            return Math.floor(raw.lifetimeActiveSeconds);
          }
          if (typeof raw.elapsedSeconds === 'number' && raw.elapsedSeconds > 0) {
            return Math.floor(raw.elapsedSeconds);
          }
        }
      }
    } catch {
      // fail-open
    }
    return 0;
  }

  public load(): void {
    if (!fs.existsSync(this.filePath)) {
      this.legacySeedSeconds = this.readLegacySeedFromSessionFile();
      this.lastTickMs = Date.now();
      this.saveSync();
      return;
    }

    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(raw) as Partial<PersistentTimeLedgerData>;
      if (data && typeof data === 'object') {
        if (typeof data.legacySeedSeconds === 'number' && data.legacySeedSeconds >= 0) {
          this.legacySeedSeconds = Math.floor(data.legacySeedSeconds);
        } else {
          this.legacySeedSeconds = this.readLegacySeedFromSessionFile();
        }

        if (data.hourlyActiveSeconds && typeof data.hourlyActiveSeconds === 'object') {
          for (const [k, v] of Object.entries(data.hourlyActiveSeconds)) {
            if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
              this.hourlyActiveSeconds.set(k, Math.floor(v));
            }
          }
        }

        if (data.dailyActiveSeconds && typeof data.dailyActiveSeconds === 'object') {
          for (const [k, v] of Object.entries(data.dailyActiveSeconds)) {
            if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
              this.dailyActiveSeconds.set(k, Math.floor(v));
            }
          }
        }
      }
    } catch {
      // fail-open on corrupt file
      this.legacySeedSeconds = this.readLegacySeedFromSessionFile();
    }
    this.lastTickMs = Date.now();
  }

  private pruneOldHourlyBuckets(nowMs: number): void {
    const cutoffKey = toUtcHourKey(nowMs - 72 * 3600 * 1000);
    for (const key of this.hourlyActiveSeconds.keys()) {
      if (key < cutoffKey) {
        this.hourlyActiveSeconds.delete(key);
      }
    }
  }

  public getPendingDeltaSeconds(nowMs: number = Date.now(), isPaused: boolean = false): number {
    if (isPaused) return 0;
    const deltaSec = Math.floor((nowMs - this.lastTickMs) / 1000);
    return deltaSec > 0 && deltaSec <= 120 ? deltaSec : 0;
  }

  public recordTick(nowMs: number = Date.now(), isPaused: boolean = false): number {
    const deltaSec = this.getPendingDeltaSeconds(nowMs, isPaused);
    this.lastTickMs = nowMs;

    if (deltaSec > 0) {
      const hourKey = toUtcHourKey(nowMs);
      const dateKey = toUtcDateKey(nowMs);

      this.hourlyActiveSeconds.set(
        hourKey,
        (this.hourlyActiveSeconds.get(hourKey) ?? 0) + deltaSec
      );
      this.dailyActiveSeconds.set(
        dateKey,
        (this.dailyActiveSeconds.get(dateKey) ?? 0) + deltaSec
      );

      this.pruneOldHourlyBuckets(nowMs);
      this.saveSync(nowMs);
    }

    return deltaSec;
  }

  /**
   * Ensures overall time is never less than SessionManager's persisted lifetimeActiveSeconds.
   */
  public syncMinimumOverallSeconds(minOverallSeconds: number): void {
    if (!Number.isFinite(minOverallSeconds) || minOverallSeconds <= 0) return;
    let recordedDailySum = 0;
    for (const v of this.dailyActiveSeconds.values()) {
      recordedDailySum += v;
    }
    const currentOverall = this.legacySeedSeconds + recordedDailySum;
    if (minOverallSeconds > currentOverall) {
      this.legacySeedSeconds += Math.floor(minOverallSeconds - currentOverall);
      this.saveSync();
    }
  }

  public getBreakdown(nowMs: number = Date.now(), isPaused: boolean = false): TimeBreakdown {
    const pending = this.getPendingDeltaSeconds(nowMs, isPaused);

    // 1. Rolling 24 hours (current hour + previous 23 hourly buckets)
    let last24h = pending;
    for (let h = 0; h < 24; h++) {
      const key = toUtcHourKey(nowMs - h * 3600 * 1000);
      last24h += this.hourlyActiveSeconds.get(key) ?? 0;
    }

    // 2. Rolling 7 days (weekly), 30 days (monthly), 365 days (yearly)
    const cutoff7d = toUtcDateKey(nowMs - 6 * 86400 * 1000);
    const cutoff30d = toUtcDateKey(nowMs - 29 * 86400 * 1000);
    const cutoff365d = toUtcDateKey(nowMs - 364 * 86400 * 1000);
    const todayKey = toUtcDateKey(nowMs);

    let weekly = pending;
    let monthly = pending;
    let yearly = pending;
    let allDailySum = pending;

    for (const [dateKey, secs] of this.dailyActiveSeconds.entries()) {
      allDailySum += secs;
      if (dateKey >= cutoff365d && dateKey <= todayKey) {
        yearly += secs;
      }
      if (dateKey >= cutoff30d && dateKey <= todayKey) {
        monthly += secs;
      }
      if (dateKey >= cutoff7d && dateKey <= todayKey) {
        weekly += secs;
      }
    }

    const overall = Math.max(this.legacySeedSeconds + allDailySum, yearly);
    weekly = Math.max(weekly, last24h);
    monthly = Math.max(monthly, weekly);
    yearly = Math.max(yearly, monthly);

    return {
      last24h,
      weekly,
      monthly,
      yearly,
      overall: Math.max(overall, yearly),
    };
  }

  public getDailyFocusStats(
    nowMs: number = Date.now(),
    isPaused: boolean = false,
    goalHours: number = 6
  ): { todaySeconds: number; goalSeconds: number; streakDays: number } {
    const pending = this.getPendingDeltaSeconds(nowMs, isPaused);
    const todayKey = toUtcDateKey(nowMs);
    const todaySeconds = (this.dailyActiveSeconds.get(todayKey) ?? 0) + pending;
    const goalSeconds = Math.max(1800, Math.round(goalHours * 3600));

    let streakDays = todaySeconds > 0 ? 1 : 0;
    let cursorMs = nowMs - 86400 * 1000;
    for (let i = 0; i < 365; i++) {
      const k = toUtcDateKey(cursorMs);
      if ((this.dailyActiveSeconds.get(k) ?? 0) > 0) {
        streakDays++;
        cursorMs -= 86400 * 1000;
      } else {
        break;
      }
    }

    return { todaySeconds, goalSeconds, streakDays };
  }

  public saveSync(nowMs: number = Date.now()): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const hourlyObj: Record<string, number> = {};
      for (const [k, v] of this.hourlyActiveSeconds.entries()) {
        hourlyObj[k] = v;
      }

      const dailyObj: Record<string, number> = {};
      for (const [k, v] of this.dailyActiveSeconds.entries()) {
        dailyObj[k] = v;
      }

      const payload: PersistentTimeLedgerData = {
        version: 1,
        lastSavedAt: new Date(nowMs).toISOString(),
        lastTickMs: this.lastTickMs,
        legacySeedSeconds: this.legacySeedSeconds,
        hourlyActiveSeconds: hourlyObj,
        dailyActiveSeconds: dailyObj,
      };

      const tmpPath = `${this.filePath}.tmp.${process.pid}.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
      try {
        fs.renameSync(tmpPath, this.filePath);
      } catch {
        fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      }
    } catch {
      // fail-open
    }
  }
}
