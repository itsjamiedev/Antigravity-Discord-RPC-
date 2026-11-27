import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PureTracker, getModelContextLimit } from '../src/tracker/pure-tracker.js';
import { TimeLedger } from '../src/tracker/time-ledger.js';
import { buildDiscordActivity } from '../src/discord/presence-manager.js';

describe('Context Window, Skill Tokens, Tool/File Stats & Daily Focus', () => {
  it('computes model context limits and 80%+ near-limit alerts', () => {
    expect(getModelContextLimit('Gemini 4 Hydrogen')).toBe(1_000_000);
    expect(getModelContextLimit('Claude Sonnet 5.5')).toBe(200_000);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-ctx-'));
    const tracker = new PureTracker(
      false,
      path.join(tmpDir, 'tokens.json'),
      path.join(tmpDir, 'session.json'),
      path.join(tmpDir, 'time.json')
    );

    tracker.updateFromAgentWatcher({
      activeAgentCount: 1,
      activeModels: ['Claude Sonnet 5.5'],
      totalTokens: {
        inputTokens: 150_000,
        cacheReadTokens: 10_000,
        outputTokens: 5_000,
        totalTokens: 165_000,
        estimated: false,
        source: 'transcript_exact',
      },
      isAgentActive: true,
      agents: [
        {
          conversationId: 'conv-ctx-1',
          lastActiveMs: Date.now(),
          model: 'Claude Sonnet 5.5',
          latestContextTokens: 165_000,
          latestContextModel: 'Claude Sonnet 5.5',
          skillTokens: {
            'design-taste-frontend': {
              invocationCount: 2,
              tokens: {
                inputTokens: 40_000,
                cacheReadTokens: 5_000,
                outputTokens: 2_000,
                totalTokens: 47_000,
                estimated: false,
                source: 'transcript_exact',
              },
              lastUsedAt: new Date().toISOString(),
            },
          },
          toolCounts: { edit_file: 4, run_command: 2 },
          fileCounts: { 'html-content.ts': 3 },
          tokens: {
            inputTokens: 150_000,
            cacheReadTokens: 10_000,
            outputTokens: 5_000,
            totalTokens: 165_000,
            estimated: false,
            source: 'transcript_exact',
          },
          status: 'thinking',
        },
      ],
    });

    const snap = tracker.getSnapshot();
    expect(snap.contextWindow).toBeDefined();
    expect(snap.contextWindow?.usedTokens).toBe(165_000);
    expect(snap.contextWindow?.maxTokens).toBe(200_000);
    expect(snap.contextWindow?.percentFull).toBe(83);
    expect(snap.contextWindow?.isNearLimit).toBe(true);

    expect(snap.skillStats?.length).toBe(1);
    expect(snap.skillStats?.[0]?.skillName).toBe('design-taste-frontend');
    expect(snap.skillStats?.[0]?.tokens.totalTokens).toBe(47_000);

    expect(snap.toolAndFileStats?.topTools[0]).toEqual({ name: 'edit_file', count: 4 });
    expect(snap.toolAndFileStats?.hotFiles[0]).toEqual({ name: 'html-content.ts', count: 3 });

    const activity = buildDiscordActivity(
      snap,
      null,
      {
        disableRichPresence: false,
        pauseTracking: false,
        hideTokens: false,
        hideConversations: false,
        hideModels: false,
        enableManualEditsPresence: true,
        hideFileNamesInManualEdits: false,
        showSkillAndContextInDiscord: true,
        discordClientId: '1440730997460172810',
        debounceMs: 15000,
      },
      1
    );
    expect(activity?.state).toContain('Skill: design-taste-frontend');
    expect(activity?.state).toContain('Ctx: 83%');

    tracker.close();
  });

  it('calculates daily focus seconds and consecutive day streaks in TimeLedger', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-streak-'));
    const ledgerPath = path.join(tmpDir, 'time.json');
    const now = Date.now();
    const todayKey = new Date(now).toISOString().slice(0, 10);
    const yestKey = new Date(now - 86400 * 1000).toISOString().slice(0, 10);

    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        version: 1,
        overallActiveSeconds: 7200,
        dailyActiveSeconds: { [todayKey]: 3600, [yestKey]: 3600 },
        hourlyActiveSeconds: {},
      }),
      'utf8'
    );

    const ledger = new TimeLedger(ledgerPath);
    const focus = ledger.getDailyFocusStats(now, false, 6);
    expect(focus.todaySeconds).toBeGreaterThanOrEqual(3600);
    expect(focus.goalSeconds).toBe(21600);
    expect(focus.streakDays).toBe(2);
  });
});
