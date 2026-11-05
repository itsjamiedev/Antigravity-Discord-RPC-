import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { TokenStore } from '../src/tracker/token-store.js';

describe('TokenStore — Atomic Persistent Token Accounting', () => {
  let tmpDir: string;
  let testStorePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'token-store-test-'));
    testStorePath = path.join(tmpDir, 'test-tokens.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it('initializes cleanly when file does not exist', () => {
    const store = new TokenStore(testStorePath);
    expect(store.getModelStats()).toEqual([]);
    expect(store.getDailyUsage()).toEqual([]);
    expect(store.getTotalCumulativeTokens().totalTokens).toBe(0);
  });

  it('records tokens and computes delta accurately', () => {
    const store = new TokenStore(testStorePath);
    const { deltaTokens: delta1 } = store.recordConversationTokens(
      'conv-123',
      'Gemini 3.8 Flash',
      {
        inputTokens: 100,
        cacheReadTokens: 500,
        outputTokens: 50,
        totalTokens: 650,
        estimated: false,
        source: 'transcript_exact',
      },
      10,
      '2026-11-05'
    );

    expect(delta1.totalTokens).toBe(650);
    expect(delta1.inputTokens).toBe(100);

    // Call again with same tokens -> delta should be 0 (idempotent, no double count)
    const { deltaTokens: delta2 } = store.recordConversationTokens(
      'conv-123',
      'Gemini 3.8 Flash',
      {
        inputTokens: 100,
        cacheReadTokens: 500,
        outputTokens: 50,
        totalTokens: 650,
        estimated: false,
        source: 'transcript_exact',
      },
      10,
      '2026-11-05'
    );

    expect(delta2.totalTokens).toBe(0);

    // Update with new turn tokens -> delta is only the increase
    const { deltaTokens: delta3 } = store.recordConversationTokens(
      'conv-123',
      'Gemini 3.8 Flash',
      {
        inputTokens: 150,
        cacheReadTokens: 800,
        outputTokens: 100,
        totalTokens: 1050,
        estimated: false,
        source: 'transcript_exact',
      },
      15,
      '2026-11-05'
    );

    expect(delta3.totalTokens).toBe(400); // 1050 - 650 = 400
    expect(delta3.inputTokens).toBe(50);
  });

  it('tracks distinct models independently', () => {
    const store = new TokenStore(testStorePath);
    store.recordConversationTokens(
      'conv-1',
      'Gemini 3.8 Flash',
      {
        inputTokens: 100,
        cacheReadTokens: 200,
        outputTokens: 50,
        totalTokens: 350,
        estimated: false,
        source: 'transcript_exact',
      },
      1,
      '2026-11-05'
    );

    store.recordConversationTokens(
      'conv-2',
      'Gemini 4 Argon',
      {
        inputTokens: 500,
        cacheReadTokens: 1000,
        outputTokens: 200,
        totalTokens: 1700,
        estimated: false,
        source: 'transcript_exact',
      },
      1,
      '2026-11-05'
    );

    const stats = store.getModelStats();
    expect(stats.length).toBe(2);
    expect(stats[0].model).toBe('Gemini 4 Argon');
    expect(stats[0].tokens.totalTokens).toBe(1700);
    expect(stats[1].model).toBe('Gemini 3.8 Flash');
    expect(stats[1].tokens.totalTokens).toBe(350);

    expect(store.getTotalCumulativeTokens().totalTokens).toBe(2050);
  });

  it('persists to disk and reloads on new instance (survives restart)', () => {
    const store1 = new TokenStore(testStorePath);
    store1.recordConversationTokens(
      'conv-persisted',
      'Claude Sonnet 3.5',
      {
        inputTokens: 2000,
        cacheReadTokens: 5000,
        outputTokens: 800,
        totalTokens: 7800,
        estimated: false,
        source: 'transcript_exact',
      },
      5,
      '2026-11-05'
    );
    store1.saveSync();

    // Verify file exists on disk
    expect(fs.existsSync(testStorePath)).toBe(true);

    // Create brand new instance loading that path
    const store2 = new TokenStore(testStorePath);
    const stats = store2.getModelStats();
    expect(stats.length).toBe(1);
    expect(stats[0].model).toBe('Claude Sonnet 3.5');
    expect(stats[0].tokens.totalTokens).toBe(7800);

    const daily = store2.getDailyUsage();
    expect(daily.length).toBe(1);
    expect(daily[0].date).toBe('2026-11-05');
    expect(daily[0].tokens.totalTokens).toBe(7800);
  });
});
