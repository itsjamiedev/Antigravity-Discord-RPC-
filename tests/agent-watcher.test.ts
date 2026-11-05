import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AgentWatcher, getGroundTruthConversationStatuses } from '../src/extension/agent-watcher.js';
import { PureTracker } from '../src/tracker/pure-tracker.js';

describe('Hookless AgentWatcher & PureTracker', () => {
  let tempBrainDir: string;

  beforeEach(() => {
    tempBrainDir = path.join(os.tmpdir(), 'ag-test-brain-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    fs.mkdirSync(tempBrainDir, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempBrainDir, { recursive: true, force: true });
    } catch {}
  });

  it('scans empty brain directory and reports 0 active agents', () => {
    const watcher = new AgentWatcher({ brainDir: tempBrainDir, pollIntervalMs: 5000 });
    watcher.scan();
    const state = watcher.getState();

    expect(state.activeAgentCount).toBe(0);
    expect(state.isAgentActive).toBe(false);
    expect(state.agents.length).toBe(0);
    watcher.stop();
  });

  it('detects recently modified transcript and extracts exact tokens and model', () => {
    const convId = '12345678-1234-1234-1234-123456789abc';
    const convDir = path.join(tempBrainDir, convId, '.system_generated', 'logs');
    fs.mkdirSync(convDir, { recursive: true });

    const transcriptFile = path.join(convDir, 'transcript.jsonl');
    const step1 = JSON.stringify({
      step_index: 1,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      model: 'Gemini 4 Argon',
      input_tokens: 1250,
      cache_read_tokens: 45000,
      output_tokens: 380,
      tool_calls: [{ name: 'run_command', args: {} }],
    });
    fs.writeFileSync(transcriptFile, step1 + '\n', 'utf8');

    const watcher = new AgentWatcher({
      brainDir: tempBrainDir,
      activeThresholdMs: 30000, // 30s threshold
    });
    watcher.scan();
    const state = watcher.getState();

    expect(state.activeAgentCount).toBe(1);
    expect(state.isAgentActive).toBe(true);
    expect(state.activeModels).toContain('Gemini 4 Argon');
    expect(state.totalTokens.inputTokens).toBe(1250);
    expect(state.totalTokens.cacheReadTokens).toBe(45000);
    expect(state.totalTokens.outputTokens).toBe(380);
    expect(state.totalTokens.totalTokens).toBe(1250 + 45000 + 380);
    expect(state.totalTokens.source).toBe('transcript_exact');

    watcher.stop();
  });

  it('marks agent inactive when transcript is older than threshold', () => {
    const convId = 'abcdef01-abcd-abcd-abcd-abcdef012345';
    const convDir = path.join(tempBrainDir, convId, '.system_generated', 'logs');
    fs.mkdirSync(convDir, { recursive: true });

    const transcriptFile = path.join(convDir, 'transcript.jsonl');
    fs.writeFileSync(transcriptFile, '{"step_index":0,"input_tokens":100}\n', 'utf8');

    // Artificially age the file by 150 seconds (exceeding default 120s)
    const oldTime = (Date.now() - 150000) / 1000;
    fs.utimesSync(transcriptFile, oldTime, oldTime);

    const watcher = new AgentWatcher({
      brainDir: tempBrainDir,
      activeThresholdMs: 20000, // 20s threshold
    });
    watcher.scan();
    const state = watcher.getState();

    expect(state.activeAgentCount).toBe(0);
    expect(state.isAgentActive).toBe(false);
    watcher.stop();
  });

  it('keeps agent active during long thinking or tool runs (> 8s) when turn is in-progress', () => {
    const convId = '11223344-5566-7788-99aa-bbccddeeff00';
    const convDir = path.join(tempBrainDir, convId, '.system_generated', 'logs');
    fs.mkdirSync(convDir, { recursive: true });

    const transcriptFile = path.join(convDir, 'transcript.jsonl');
    // Last step is a tool result (GENERIC) - agent is thinking about the result
    const step1 = JSON.stringify({
      step_index: 5,
      source: 'MODEL',
      type: 'GENERIC',
      model: 'Gemini 3.8 Flash',
      content: 'Tool execution output',
      input_tokens: 3000,
    });
    fs.writeFileSync(transcriptFile, step1 + '\n', 'utf8');

    // Age file by 25 seconds (which would have failed with the old 8s threshold!)
    const age25s = (Date.now() - 25000) / 1000;
    fs.utimesSync(transcriptFile, age25s, age25s);

    const watcher = new AgentWatcher({
      brainDir: tempBrainDir,
      activeThresholdMs: 120000, // 120s active turn threshold
    });
    watcher.scan();
    const state = watcher.getState();

    // Must still be active!
    expect(state.activeAgentCount).toBe(1);
    expect(state.isAgentActive).toBe(true);
    watcher.stop();
  });

  it('correctly parses large transcript lines (> 8 KB) without truncating or false-idling', () => {
    const convId = '99887766-5544-3322-1100-ffeeddccbbaa';
    const convDir = path.join(tempBrainDir, convId, '.system_generated', 'logs');
    fs.mkdirSync(convDir, { recursive: true });

    const transcriptFile = path.join(convDir, 'transcript.jsonl');
    // Create a 20 KB step (larger than the old 8 KB buffer)
    const largeContent = 'A'.repeat(20000);
    const step = JSON.stringify({
      step_index: 42,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      model: 'Gemini 4 Argon',
      tool_calls: [{ name: 'run_command', args: { cmd: 'test' } }],
      content: largeContent,
      input_tokens: 5000,
      cache_read_tokens: 10000,
      output_tokens: 200,
    });
    fs.writeFileSync(transcriptFile, step + '\n', 'utf8');

    const watcher = new AgentWatcher({
      brainDir: tempBrainDir,
      activeThresholdMs: 120000,
    });
    watcher.scan();
    const state = watcher.getState();

    expect(state.activeAgentCount).toBe(1);
    expect(state.isAgentActive).toBe(true);
    expect(state.totalTokens.totalTokens).toBe(15200);
    watcher.stop();
  });

  it('immediately transitions to idle (0s delay) when PLANNER_RESPONSE has no tool calls', () => {
    const convId = 'aabbccdd-eeff-0011-2233-445566778899';
    const convDir = path.join(tempBrainDir, convId, '.system_generated', 'logs');
    fs.mkdirSync(convDir, { recursive: true });

    const transcriptFile = path.join(convDir, 'transcript.jsonl');
    // Completed answer step
    const finalStep = JSON.stringify({
      step_index: 10,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      model: 'Gemini 3.8 Flash',
      content: 'Here is your completed answer.',
      tool_calls: [],
      input_tokens: 1000,
      output_tokens: 200,
    });
    fs.writeFileSync(transcriptFile, finalStep + '\n', 'utf8');

    // Even if written 1 millisecond ago, agent is done so must be reported idle immediately!
    const watcher = new AgentWatcher({
      brainDir: tempBrainDir,
      activeThresholdMs: 120000,
    });
    watcher.scan();
    const state = watcher.getState();

    expect(state.activeAgentCount).toBe(0);
    expect(state.isAgentActive).toBe(false);
    watcher.stop();
  });

  it('PureTracker consumes AgentWatcher state and builds a valid TrackerSnapshot', () => {
    const testStorePath = path.join(tempBrainDir, 'test-tokens.json');
    const tracker = new PureTracker(false, testStorePath);
    let receivedSnapshot = false;

    tracker.subscribe((snap) => {
      receivedSnapshot = true;
      expect(snap.session.activeAgentCount).toBe(1);
      expect(snap.activeAgents.length).toBe(1);
      expect(snap.activeAgents[0]?.model).toBe('Gemini 4 Argon');
      expect(snap.session.tokens.totalTokens).toBe(5000);
    });

    tracker.updateFromAgentWatcher({
      activeAgentCount: 1,
      activeModels: ['Gemini 4 Argon'],
      totalTokens: {
        inputTokens: 2000,
        cacheReadTokens: 2500,
        outputTokens: 500,
        totalTokens: 5000,
        estimated: false,
        source: 'transcript_exact',
      },
      isAgentActive: true,
      agents: [
        {
          conversationId: 'conv-test-123',
          lastActiveMs: Date.now(),
          model: 'Gemini 4 Argon',
          stepIndex: 12,
          tokens: {
            inputTokens: 2000,
            cacheReadTokens: 2500,
            outputTokens: 500,
            totalTokens: 5000,
            estimated: false,
            source: 'transcript_exact',
          },
        },
      ],
    });

    expect(receivedSnapshot).toBe(true);
    const snap = tracker.getSnapshot();
    expect(snap.conversations.length).toBe(1);
    expect(snap.modelStats.length).toBe(1);
    expect(snap.dailyUsage.length).toBe(1);
    tracker.close();
  });

  it('getGroundTruthConversationStatuses returns Map without throwing even on missing or corrupted DB', () => {
    const emptyMap = getGroundTruthConversationStatuses(tempBrainDir);
    expect(emptyMap instanceof Map).toBe(true);
    expect(emptyMap.size).toBe(0);

    // Call against real Antigravity dir if present
    const realMap = getGroundTruthConversationStatuses();
    expect(realMap instanceof Map).toBe(true);
  });
});

