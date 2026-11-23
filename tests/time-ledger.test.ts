import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { TimeLedger } from '../src/tracker/time-ledger.js';

describe('TimeLedger (5-Window Active Time Accounting)', () => {
  let tmpDir: string;
  let ledgerPath: string;
  let sessionPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-time-ledger-'));
    ledgerPath = path.join(tmpDir, 'presence-time.json');
    sessionPath = path.join(tmpDir, 'presence-session.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('seeds legacy lifetimeActiveSeconds from presence-session.json on first boot', () => {
    fs.writeFileSync(
      sessionPath,
      JSON.stringify({
        sessionId: 'legacy-1',
        lifetimeActiveSeconds: 18000, // 5 hours
      }),
      'utf8'
    );

    const ledger = new TimeLedger(ledgerPath, sessionPath);
    const tb = ledger.getBreakdown();

    expect(tb.overall).toBe(18000);
  });

  it('records active ticks across 24h, weekly, monthly, yearly, and overall windows', () => {
    const ledger = new TimeLedger(ledgerPath, sessionPath);
    const t0 = Date.now();

    // Baseline tick at t0
    ledger.recordTick(t0, false);
    // 45 seconds later
    ledger.recordTick(t0 + 45_000, false);
    // Another 75 seconds later
    ledger.recordTick(t0 + 120_000, false);

    const tb = ledger.getBreakdown(t0 + 120_000, false);
    expect(tb.last24h).toBe(120);
    expect(tb.weekly).toBe(120);
    expect(tb.monthly).toBe(120);
    expect(tb.yearly).toBe(120);
    expect(tb.overall).toBe(120);
  });

  it('clamps PC sleep/hibernate gaps above 120 seconds so sleep time is never counted', () => {
    const ledger = new TimeLedger(ledgerPath, sessionPath);
    const t0 = Date.now();

    ledger.recordTick(t0, false);
    // Simulate a 4-hour PC sleep gap
    ledger.recordTick(t0 + 4 * 3600_000, false);

    const tb = ledger.getBreakdown(t0 + 4 * 3600_000, false);
    expect(tb.overall).toBe(0);

    // Next normal 15s tick after wake-up is recorded accurately
    ledger.recordTick(t0 + 4 * 3600_000 + 15_000, false);
    expect(ledger.getBreakdown(t0 + 4 * 3600_000 + 15_000, false).overall).toBe(15);
  });
});
