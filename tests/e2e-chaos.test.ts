import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../src/config/privacy-config.js';
import { DashboardServer } from '../src/dashboard/server.js';
import { forwardPayloadToDaemon } from '../src/forwarder/transport.js';
import { sanitizeHookPayload } from '../src/forwarder/whitelist.js';
import type { WhitelistedHookPayload } from '../src/shared/types.js';
import { CentralTracker } from '../src/tracker/tracker.js';

describe('Phase 6: Comprehensive E2E Chaos & Privacy Verification', () => {
  let tempDir: string;
  let dbPath: string;
  let configPath: string;
  let spoolPath: string;
  let mockAppDataDir: string;
  let tracker: CentralTracker;
  let configManager: ConfigManager;
  let server: DashboardServer;
  let serverPort: number;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-e2e-chaos-'));
    dbPath = path.join(tempDir, 'presence.sqlite');
    configPath = path.join(tempDir, 'config.json');
    spoolPath = path.join(tempDir, 'spool.jsonl');
    mockAppDataDir = path.join(tempDir, 'antigravity');
    fs.mkdirSync(mockAppDataDir, { recursive: true });

    tracker = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDir],
      staleTimeoutMs: 60_000,
    });

    configManager = new ConfigManager(configPath);

    server = new DashboardServer({
      host: '127.0.0.1',
      port: 0,
      spoolPath,
      tracker,
      configManager,
    });

    serverPort = await server.start();
  });

  afterEach(async () => {
    await server.stop();
    tracker.close();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  function writeMockTranscript(
    conversationId: string,
    steps: Array<{ stepIndex: number; input: number; cache: number; output: number }>
  ): void {
    const logsDir = path.join(
      mockAppDataDir,
      'brain',
      conversationId,
      '.system_generated',
      'logs'
    );
    fs.mkdirSync(logsDir, { recursive: true });
    const fullContent = steps
      .map((s) =>
        JSON.stringify({
          step_index: s.stepIndex,
          source: 'MODEL',
          type: 'PLANNER_RESPONSE',
          input_tokens: s.input,
          cache_read_tokens: s.cache,
          output_tokens: s.output,
          created_at: new Date().toISOString(),
        })
      )
      .join('\n');
    fs.writeFileSync(path.join(logsDir, 'transcript.jsonl'), fullContent + '\n', 'utf8');
  }

  // 1. Single Agent Lifecycle
  it('Scenario 1: Single agent lifecycle tracks accurately from start to idle', async () => {
    const rawStart = {
      conversationId: 'agent-single-1',
      modelName: 'gemini-4-argon-medium',
      lastUserInput: 'Confidential prompt with API_KEY=secret-1234',
      workspacePaths: ['C:\\Private\\Project'],
    };

    const sanitizedStart = sanitizeHookPayload('SessionStart', rawStart)!;
    expect(sanitizedStart).not.toBeNull();
    expect(JSON.stringify(sanitizedStart)).not.toContain('secret-1234');
    expect(JSON.stringify(sanitizedStart)).not.toContain('Private');

    await forwardPayloadToDaemon(sanitizedStart, { port: serverPort, spoolPath });

    const snap1 = tracker.getSnapshot();
    expect(snap1.activeAgents).toHaveLength(1);
    expect(snap1.activeAgents[0]?.status).toBe('thinking');

    // Tool use
    const sanitizedTool = sanitizeHookPayload('PreToolUse', {
      conversationId: 'agent-single-1',
      modelName: 'gemini-4-argon-medium',
      toolCall: { name: 'run_command', args: { CommandLine: 'rm -rf /' } },
      stepIdx: 1,
    })!;
    expect(JSON.stringify(sanitizedTool)).not.toContain('rm -rf');

    await forwardPayloadToDaemon(sanitizedTool, { port: serverPort, spoolPath });
    const snap2 = tracker.getSnapshot();
    expect(snap2.activeAgents[0]?.status).toBe('running_tool');
    expect(snap2.activeAgents[0]?.activeTool).toBe('run_command');

    // Stop -> fullyIdle: true
    const sanitizedStop = sanitizeHookPayload('Stop', {
      conversationId: 'agent-single-1',
      modelName: 'gemini-4-argon-medium',
      terminationReason: 'NO_TOOL_CALL',
      fullyIdle: true,
    })!;
    await forwardPayloadToDaemon(sanitizedStop, { port: serverPort, spoolPath });

    const snap3 = tracker.getSnapshot();
    expect(snap3.activeAgents).toHaveLength(0);
    expect(snap3.agents[0]?.status).toBe('idle');
  });

  // 2. Multiple Concurrent Agents Across Windows
  it('Scenario 2: Multiple concurrent agents across windows maintain isolation', async () => {
    const agentA: WhitelistedHookPayload = {
      event: 'PreInvocation',
      conversationId: 'window-A-conv',
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:40:01.000Z',
    };

    const agentB: WhitelistedHookPayload = {
      event: 'PreToolUse',
      conversationId: 'window-B-conv',
      modelName: 'claude-sonnet-5-5-high',
      toolName: 'read_file',
      stepIdx: 3,
      invocationNum: null,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:40:02.000Z',
    };

    await forwardPayloadToDaemon(agentA, { port: serverPort, spoolPath });
    await forwardPayloadToDaemon(agentB, { port: serverPort, spoolPath });

    const snap = tracker.getSnapshot();
    expect(snap.activeAgents).toHaveLength(2);

    const a = snap.activeAgents.find((x) => x.conversationId === 'window-A-conv')!;
    const b = snap.activeAgents.find((x) => x.conversationId === 'window-B-conv')!;
    expect(a.status).toBe('thinking');
    expect(b.status).toBe('running_tool');
    expect(b.activeTool).toBe('read_file');
  });

  // 3. Mixed Models in Parallel
  it('Scenario 3: Mixed models are tracked distinctly without cross-contamination', async () => {
    writeMockTranscript('conv-model-1', [{ stepIndex: 1, input: 5000, cache: 0, output: 200 }]);
    writeMockTranscript('conv-model-2', [{ stepIndex: 1, input: 8000, cache: 0, output: 400 }]);

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: 'conv-model-1',
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:45:00.000Z',
    });

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: 'conv-model-2',
      modelName: 'claude-sonnet-5-5-high',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:45:01.000Z',
    });

    const snap = tracker.getSnapshot();
    expect(snap.modelStats).toHaveLength(2);

    const geminiStats = snap.modelStats.find((m) => m.model === 'gemini-4-argon-medium')!;
    const claudeStats = snap.modelStats.find((m) => m.model === 'claude-sonnet-5-5-high')!;

    expect(geminiStats.tokens.totalTokens).toBe(5200);
    expect(claudeStats.tokens.totalTokens).toBe(8400);
  });

  // 4. Mid-Conversation Model Switching
  it('Scenario 4: Model switching mid-conversation updates currentModel and preserves modelsUsed history', () => {
    const convId = 'switch-conv-99';

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: convId,
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:50:00.000Z',
    });

    // Switch model on turn 2
    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: convId,
      modelName: 'gemini-3.8-flash-high',
      toolName: null,
      stepIdx: null,
      invocationNum: 1,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:50:10.000Z',
    });

    const snap = tracker.getSnapshot();
    const conv = snap.conversations.find((c) => c.conversationId === convId)!;
    expect(conv.currentModel).toBe('gemini-3.8-flash-high');
    expect(conv.modelsUsed.sort()).toEqual(
      ['gemini-3.8-flash-high', 'gemini-4-argon-medium'].sort()
    );
  });

  // 5. Agents Finishing (fullyIdle: false vs true)
  it('Scenario 5: Background tasks stay in waiting_background until fullyIdle: true', () => {
    const convId = 'bg-task-conv';

    // Finished turn with background process running
    tracker.processEvent({
      event: 'Stop',
      conversationId: convId,
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: null,
      terminationReason: 'NO_TOOL_CALL',
      fullyIdle: false,
      hasError: false,
      timestamp: '2026-11-05T04:55:00.000Z',
    });

    let snap = tracker.getSnapshot();
    expect(snap.activeAgents).toHaveLength(1);
    expect(snap.activeAgents[0]?.status).toBe('waiting_background');

    // Background task completed
    tracker.processEvent({
      event: 'Stop',
      conversationId: convId,
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: null,
      terminationReason: 'NO_TOOL_CALL',
      fullyIdle: true,
      hasError: false,
      timestamp: '2026-11-05T04:55:10.000Z',
    });

    snap = tracker.getSnapshot();
    expect(snap.activeAgents).toHaveLength(0);
    expect(snap.agents[0]?.status).toBe('idle');
  });

  // 6. Antigravity Restarting & Persistence
  it('Scenario 6: Daemon restart preserves state and prevents token double counting', () => {
    const convId = 'restart-conv-42';
    writeMockTranscript(convId, [{ stepIndex: 1, input: 12000, cache: 3000, output: 400 }]);

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: convId,
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T05:00:00.000Z',
    });

    tracker.close();

    // Restart tracker with same DB
    const restartedTracker = new CentralTracker({
      dbPath,
      appDataDirs: [mockAppDataDir],
    });

    try {
      const snap = restartedTracker.getSnapshot();
      const conv = snap.conversations.find((c) => c.conversationId === convId)!;
      expect(conv.tokens.totalTokens).toBe(15400);

      // Re-trigger turn event; must not double count step 1 tokens
      restartedTracker.processEvent({
        event: 'PostInvocation',
        conversationId: convId,
        modelName: 'gemini-4-argon-medium',
        toolName: null,
        stepIdx: null,
        invocationNum: 0,
        terminationReason: null,
        fullyIdle: null,
        hasError: false,
        timestamp: '2026-11-05T05:00:05.000Z',
      });

      const snap2 = restartedTracker.getSnapshot();
      const conv2 = snap2.conversations.find((c) => c.conversationId === convId)!;
      expect(conv2.tokens.totalTokens).toBe(15400);
    } finally {
      restartedTracker.close();
    }
  });

  // 7. Network Loss / Offline Spooling
  it('Scenario 7: Offline events are spooled safely and drained upon daemon start', async () => {
    // Daemon on port 58999 is offline
    const offlinePayload: WhitelistedHookPayload = {
      event: 'PreInvocation',
      conversationId: 'spool-recovery-conv',
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T05:05:00.000Z',
    };

    const delivered = await forwardPayloadToDaemon(offlinePayload, {
      port: 58999,
      spoolPath,
    });
    expect(delivered).toBe(false);
    expect(fs.existsSync(spoolPath)).toBe(true);

    // Stop current server and start new server pointing to that spool file
    await server.stop();

    const newServer = new DashboardServer({
      host: '127.0.0.1',
      port: 0,
      spoolPath,
      tracker,
      configManager,
    });

    try {
      await newServer.start();
      expect(fs.existsSync(spoolPath)).toBe(false);

      const snap = tracker.getSnapshot();
      expect(snap.conversations.some((c) => c.conversationId === 'spool-recovery-conv')).toBe(true);
    } finally {
      await newServer.stop();
    }
  });

  // 8. Missing Token Data Handling
  it('Scenario 8: Missing transcript files tag tokens as unavailable and zero without guessing', () => {
    const noTranscriptConv = 'missing-transcript-id';

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: noTranscriptConv,
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T05:10:00.000Z',
    });

    const snap = tracker.getSnapshot();
    const conv = snap.conversations.find((c) => c.conversationId === noTranscriptConv)!;
    expect(conv.tokens.source).toBe('unavailable');
    expect(conv.tokens.totalTokens).toBe(0);
    expect(conv.tokens.estimated).toBe(false);
  });

  // 9. Duplicate Events Deduplication
  it('Scenario 9: Replaying identical events is strictly deduplicated by idempotency key', () => {
    const event: WhitelistedHookPayload = {
      event: 'PreToolUse',
      conversationId: 'dup-test-conv',
      modelName: 'gemini-4-argon-medium',
      toolName: 'read_file',
      stepIdx: 10,
      invocationNum: null,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T05:15:00.000Z',
    };

    expect(tracker.processEvent(event)).toBe(true);
    expect(tracker.processEvent(event)).toBe(false);
    expect(tracker.processEvent(event)).toBe(false);

    const snap = tracker.getSnapshot();
    const conv = snap.conversations.find((c) => c.conversationId === 'dup-test-conv')!;
    expect(conv.toolCallCount).toBe(1);
    expect(snap.session.totalEventsProcessed).toBe(1);
  });

  // 10. Privacy Settings Override (Zero Leaks)
  it('Scenario 10: Privacy settings enforce minimal sharing by default', () => {
    const settings = configManager.getSettings();
    expect(settings.hideTokens).toBe(true);
    expect(settings.hideConversations).toBe(true);
    expect(settings.disableRichPresence).toBe(false);
    expect(settings.enableManualEditsPresence).toBe(true);
  });
});

