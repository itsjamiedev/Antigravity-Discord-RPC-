import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { WhitelistedHookPayload } from '../src/shared/types.js';
import { CentralTracker, computeIdempotencyKey } from '../src/tracker/tracker.js';

function makeEvent(
  overrides: Partial<WhitelistedHookPayload> & Pick<WhitelistedHookPayload, 'event' | 'conversationId'>
): WhitelistedHookPayload {
  return {
    event: overrides.event,
    conversationId: overrides.conversationId,
    modelName: overrides.modelName ?? 'gemini-4-argon-medium',
    toolName: overrides.toolName ?? null,
    stepIdx: overrides.stepIdx ?? null,
    invocationNum: overrides.invocationNum ?? null,
    terminationReason: overrides.terminationReason ?? null,
    fullyIdle: overrides.fullyIdle ?? null,
    hasError: overrides.hasError ?? false,
    timestamp: overrides.timestamp ?? '2026-11-05T04:00:00.000Z',
  };
}

describe('Phase 3: Central Tracker & SQLite Persistence', () => {
  let tempDir: string;
  let dbPath: string;
  let mockAppDataDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-tracker-test-'));
    dbPath = path.join(tempDir, 'tracker.sqlite');
    mockAppDataDir = path.join(tempDir, 'antigravity');
    fs.mkdirSync(mockAppDataDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  function writeMockTranscript(conversationId: string, lines: Array<Record<string, unknown>>): void {
    const logsDir = path.join(
      mockAppDataDir,
      'brain',
      conversationId,
      '.system_generated',
      'logs'
    );
    fs.mkdirSync(logsDir, { recursive: true });
    const filePath = path.join(logsDir, 'transcript.jsonl');
    fs.writeFileSync(filePath, lines.map((l) => JSON.stringify(l)).join('\n') + '\n', 'utf8');
  }

  function writeMockSummaryDb(
    rows: Array<{
      conversationId: string;
      title: string;
      parentConversationId?: string;
      nestingDepth?: number;
    }>
  ): void {
    const summaryDbPath = path.join(mockAppDataDir, 'conversation_summaries.db');
    const sdb = new Database(summaryDbPath);
    sdb.exec(`
      CREATE TABLE IF NOT EXISTS conversation_summaries (
        conversation_id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        parent_conversation_id TEXT NOT NULL DEFAULT '',
        nesting_depth INTEGER NOT NULL DEFAULT 0
      );
    `);
    const stmt = sdb.prepare(
      `INSERT OR REPLACE INTO conversation_summaries
       (conversation_id, title, parent_conversation_id, nesting_depth)
       VALUES (?, ?, ?, ?)`
    );
    for (const r of rows) {
      stmt.run(r.conversationId, r.title, r.parentConversationId ?? '', r.nestingDepth ?? 0);
    }
    sdb.close();
  }

  it('derives agent activity states strictly from lifecycle events and transitions through approval estimate and staleness timeout', () => {
    let currentTimeMs = Date.parse('2026-11-05T04:00:00.000Z');
    const tracker = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDir],
      approvalEstimateThresholdMs: 10_000,
      staleTimeoutMs: 60_000,
      nowFn: () => currentTimeMs,
    });

    try {
      const convId = 'conv-state-1';

      // 1. PreInvocation -> thinking
      tracker.processEvent(
        makeEvent({
          event: 'PreInvocation',
          conversationId: convId,
          invocationNum: 0,
          timestamp: '2026-11-05T04:00:00.000Z',
        })
      );

      let snap = tracker.getSnapshot();
      expect(snap.session.activeAgentCount).toBe(1);
      expect(snap.agents[0]?.status).toBe('thinking');
      expect(snap.agents[0]?.statusEstimated).toBe(false);

      // 2. PreToolUse -> running_tool
      currentTimeMs = Date.parse('2026-11-05T04:00:02.000Z');
      tracker.processEvent(
        makeEvent({
          event: 'PreToolUse',
          conversationId: convId,
          toolName: 'run_command',
          stepIdx: 2,
          timestamp: '2026-11-05T04:00:02.000Z',
        })
      );

      snap = tracker.getSnapshot();
      expect(snap.agents[0]?.status).toBe('running_tool');
      expect(snap.agents[0]?.activeTool).toBe('run_command');
      expect(snap.agents[0]?.statusEstimated).toBe(false);

      // 3. Advance 12s without PostToolUse -> waiting_approval (estimated: true)
      currentTimeMs = Date.parse('2026-11-05T04:00:14.000Z');
      snap = tracker.getSnapshot();
      expect(snap.agents[0]?.status).toBe('waiting_approval');
      expect(snap.agents[0]?.statusEstimated).toBe(true);
      expect(snap.session.activeAgentCount).toBe(1);

      // 4. Advance past 60s stale timeout -> stale (removed from activeAgents!)
      currentTimeMs = Date.parse('2026-11-05T04:01:05.000Z');
      snap = tracker.getSnapshot();
      expect(snap.agents[0]?.status).toBe('stale');
      expect(snap.agents[0]?.statusEstimated).toBe(false);
      expect(snap.agents[0]?.activeTool).toBeNull();
      expect(snap.session.activeAgentCount).toBe(0);

      // 5. Stop with fullyIdle: false -> waiting_background
      currentTimeMs = Date.parse('2026-11-05T04:01:10.000Z');
      tracker.processEvent(
        makeEvent({
          event: 'Stop',
          conversationId: convId,
          terminationReason: 'NO_TOOL_CALL',
          fullyIdle: false,
          timestamp: '2026-11-05T04:01:10.000Z',
        })
      );
      snap = tracker.getSnapshot();
      expect(snap.agents[0]?.status).toBe('waiting_background');
      expect(snap.session.activeAgentCount).toBe(1);

      // 6. Stop with fullyIdle: true -> idle
      currentTimeMs = Date.parse('2026-11-05T04:01:15.000Z');
      tracker.processEvent(
        makeEvent({
          event: 'Stop',
          conversationId: convId,
          terminationReason: 'NO_TOOL_CALL',
          fullyIdle: true,
          timestamp: '2026-11-05T04:01:15.000Z',
        })
      );
      snap = tracker.getSnapshot();
      expect(snap.agents[0]?.status).toBe('idle');
      expect(snap.session.activeAgentCount).toBe(0);
    } finally {
      tracker.close();
    }
  });

  it('counts each event exactly once using idempotency key (conversationId + event + stepIdx/invocationNum + timestamp)', () => {
    const tracker = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDir],
    });

    try {
      const evt = makeEvent({
        event: 'PreToolUse',
        conversationId: 'conv-idem-1',
        modelName: 'gemini-4-argon-medium',
        toolName: 'read_file',
        stepIdx: 5,
        timestamp: '2026-11-05T04:10:00.000Z',
      });

      expect(computeIdempotencyKey(evt)).toBe(
        'conv-idem-1:PreToolUse:5::2026-11-05T04:10:00.000Z'
      );

      expect(tracker.processEvent(evt)).toBe(true);
      // Duplicate submissions must be ignored
      expect(tracker.processEvent(evt)).toBe(false);
      expect(tracker.processEvent(evt)).toBe(false);

      const snap = tracker.getSnapshot();
      expect(snap.session.totalEventsProcessed).toBe(1);
      expect(snap.conversations[0]?.toolCallCount).toBe(1);
      expect(snap.modelStats[0]?.toolCallCount).toBe(1);
      expect(snap.dailyUsage[0]?.toolCallCount).toBe(1);
    } finally {
      tracker.close();
    }
  });

  it('tracks mid-conversation model switching, subagent hierarchy, and exact transcript tokens without double-counting across restarts', () => {
    const parentConvId = 'parent-conv-100';
    const subConvId = 'subagent-conv-200';

    writeMockSummaryDb([
      {
        conversationId: parentConvId,
        title: 'Build Antigravity Presence',
      },
      {
        conversationId: subConvId,
        title: 'Subagent Research Task',
        parentConversationId: parentConvId,
        nestingDepth: 1,
      },
    ]);

    writeMockTranscript(parentConvId, [
      {
        step_index: 0,
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        status: 'DONE',
      },
      {
        step_index: 1,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        input_tokens: 10000,
        cache_read_tokens: 2000,
        output_tokens: 500,
        created_at: '2026-11-05T04:20:01.000Z',
      },
    ]);

    // First tracker instance
    const tracker1 = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDir],
    });

    tracker1.processEvent(
      makeEvent({
        event: 'PreInvocation',
        conversationId: parentConvId,
        modelName: 'gemini-4-argon-medium',
        invocationNum: 0,
        timestamp: '2026-11-05T04:20:00.000Z',
      })
    );
    tracker1.processEvent(
      makeEvent({
        event: 'PostInvocation',
        conversationId: parentConvId,
        modelName: 'gemini-4-argon-medium',
        invocationNum: 0,
        timestamp: '2026-11-05T04:20:02.000Z',
      })
    );

    // Subagent event (no transcript file -> token source must be 'unavailable' and 0)
    tracker1.processEvent(
      makeEvent({
        event: 'PreInvocation',
        conversationId: subConvId,
        modelName: 'gemini-3.5-flash-lite',
        invocationNum: 0,
        timestamp: '2026-11-05T04:20:03.000Z',
      })
    );

    const snap1 = tracker1.getSnapshot();
    const parentConv1 = snap1.conversations.find((c) => c.conversationId === parentConvId)!;
    const subConv1 = snap1.conversations.find((c) => c.conversationId === subConvId)!;

    expect(parentConv1.title).toBe('Build Antigravity Presence');
    expect(parentConv1.isSubagent).toBe(false);
    expect(parentConv1.tokens).toEqual({
      inputTokens: 10000,
      cacheReadTokens: 2000,
      outputTokens: 500,
      totalTokens: 12500,
      estimated: false,
      source: 'transcript_exact',
    });

    expect(subConv1.title).toBe('Subagent Research Task');
    expect(subConv1.isSubagent).toBe(true);
    expect(subConv1.parentConversationId).toBe(parentConvId);
    expect(subConv1.tokens.source).toBe('unavailable');
    expect(subConv1.tokens.totalTokens).toBe(0);

    tracker1.close();

    // Append a second PLANNER_RESPONSE step to parent transcript and switch model to gemini-3.8-flash-high
    writeMockTranscript(parentConvId, [
      {
        step_index: 0,
        source: 'USER_EXPLICIT',
        type: 'USER_INPUT',
        status: 'DONE',
      },
      {
        step_index: 1,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        input_tokens: 10000,
        cache_read_tokens: 2000,
        output_tokens: 500,
        created_at: '2026-11-05T04:20:01.000Z',
      },
      {
        step_index: 3,
        source: 'MODEL',
        type: 'PLANNER_RESPONSE',
        status: 'DONE',
        input_tokens: 3000,
        cache_read_tokens: 9000,
        output_tokens: 250,
        created_at: '2026-11-05T04:21:05.000Z',
      },
    ]);

    // Second tracker instance (simulating daemon restart on the same SQLite DB)
    const tracker2 = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDataDir(mockAppDataDir)],
    });

    try {
      // Re-sending an old event after restart must be ignored (no double count)
      const duplicateOld = tracker2.processEvent(
        makeEvent({
          event: 'PostInvocation',
          conversationId: parentConvId,
          modelName: 'gemini-4-argon-medium',
          invocationNum: 0,
          timestamp: '2026-11-05T04:20:02.000Z',
        })
      );
      expect(duplicateOld).toBe(false);

      // New turn with switched model (gemini-3.8-flash-high)
      tracker2.processEvent(
        makeEvent({
          event: 'Stop',
          conversationId: parentConvId,
          modelName: 'gemini-3.8-flash-high',
          terminationReason: 'NO_TOOL_CALL',
          fullyIdle: true,
          timestamp: '2026-11-05T04:21:06.000Z',
        })
      );

      const snap2 = tracker2.getSnapshot();
      const parentConv2 = snap2.conversations.find((c) => c.conversationId === parentConvId)!;

      // Model switched cleanly and preserved history
      expect(parentConv2.currentModel).toBe('gemini-3.8-flash-high');
      expect(parentConv2.modelsUsed.sort()).toEqual(
        ['gemini-3.8-flash-high', 'gemini-4-argon-medium'].sort()
      );

      // Step 1 (12,500) + Step 3 (12,250) = 24,750 (step 1 was NOT double counted!)
      expect(parentConv2.tokens).toEqual({
        inputTokens: 13000,
        cacheReadTokens: 11000,
        outputTokens: 750,
        totalTokens: 24750,
        estimated: false,
        source: 'transcript_exact',
      });

      // Verify modelStats split tokens accurately between the two models
      const argonStats = snap2.modelStats.find((m) => m.model === 'gemini-4-argon-medium')!;
      const flashStats = snap2.modelStats.find((m) => m.model === 'gemini-3.8-flash-high')!;
      expect(argonStats.tokens.totalTokens).toBe(12500);
      expect(flashStats.tokens.totalTokens).toBe(12250);
    } finally {
      tracker2.close();
    }
  });
});

function mockAppDataDataDir(dir: string): string {
  return dir;
}
