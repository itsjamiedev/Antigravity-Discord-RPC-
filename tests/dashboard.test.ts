import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../src/config/privacy-config.js';
import { DashboardServer } from '../src/dashboard/server.js';
import type { WhitelistedHookPayload } from '../src/shared/types.js';
import { CentralTracker } from '../src/tracker/tracker.js';

describe('Phase 5: Local Usage Dashboard (127.0.0.1)', () => {
  let tempDir: string;
  let dbPath: string;
  let configPath: string;
  let spoolPath: string;
  let tracker: CentralTracker;
  let configManager: ConfigManager;
  let server: DashboardServer;
  let baseUrl: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-dash-test-'));
    dbPath = path.join(tempDir, 'dash.sqlite');
    configPath = path.join(tempDir, 'dash-config.json');
    spoolPath = path.join(tempDir, 'spool.jsonl');

    tracker = new CentralTracker({
      dbPath,
      appDataDirs: [],
    });

    configManager = new ConfigManager(configPath);

    server = new DashboardServer({
      host: '127.0.0.1',
      port: 0, // Ephemeral port
      spoolPath,
      tracker,
      configManager,
    });

    const port = await server.start();
    baseUrl = `http://127.0.0.1:${port}`;
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

  it('serves the static HTML dashboard at GET /', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html).toContain('<title>Antigravity Presence — Local Dashboard</title>');
    expect(html).toContain('tab-overview');
    expect(html).toContain('tab-agents');
    expect(html).toContain('tab-models');
    expect(html).toContain('tab-conversations');
    expect(html).toContain('tab-analytics');
    expect(html).toContain('tab-settings');
  });

  it('serves REST endpoints with accurate domain data', async () => {
    // Inject a sample agent event
    const sampleEvent: WhitelistedHookPayload = {
      event: 'PreInvocation',
      conversationId: 'dash-conv-1',
      modelName: 'gemini-4-argon-medium',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: new Date().toISOString(),
    };
    tracker.processEvent(sampleEvent);

    // 1. /api/overview
    const overRes = await fetch(`${baseUrl}/api/overview`);
    expect(overRes.status).toBe(200);
    const overview = (await overRes.json()) as Record<string, unknown>;
    expect(overview['session']).toBeDefined();
    expect((overview['activeAgents'] as Array<unknown>).length).toBe(1);
    expect(overview['discord']).toEqual({ connected: false, state: 'disconnected' });

    // 2. /api/agents
    const agentsRes = await fetch(`${baseUrl}/api/agents`);
    expect(agentsRes.status).toBe(200);
    const agentsJson = (await agentsRes.json()) as { activeAgents: Array<{ model: string }> };
    expect(agentsJson.activeAgents[0]?.model).toBe('gemini-4-argon-medium');

    // 3. /api/models
    const modelsRes = await fetch(`${baseUrl}/api/models`);
    expect(modelsRes.status).toBe(200);
    const modelsJson = (await modelsRes.json()) as { models: Array<{ model: string }> };
    expect(modelsJson.models[0]?.model).toBe('gemini-4-argon-medium');

    // 4. /api/conversations
    const convsRes = await fetch(`${baseUrl}/api/conversations`);
    expect(convsRes.status).toBe(200);
    const convsJson = (await convsRes.json()) as {
      conversations: Array<{ conversationId: string }>;
    };
    expect(convsJson.conversations[0]?.conversationId).toBe('dash-conv-1');

    // 5. /api/analytics
    const analyticsRes = await fetch(`${baseUrl}/api/analytics`);
    expect(analyticsRes.status).toBe(200);
    const analyticsJson = (await analyticsRes.json()) as { dailyUsage: Array<{ date: string }> };
    expect(analyticsJson.dailyUsage[0]?.date).toBe('2026-11-05');
  });

  it('updates privacy settings live via POST /api/settings', async () => {
    // Fetch initial settings
    const getRes = await fetch(`${baseUrl}/api/settings`);
    expect(getRes.status).toBe(200);
    const initialSettings = (await getRes.json()) as Record<string, unknown>;
    expect(initialSettings['hideModels']).toBe(false);

    // Update settings via POST
    const postRes = await fetch(`${baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hideModels: true,
        pauseTracking: true,
      }),
    });
    expect(postRes.status).toBe(200);
    const updatedSettings = (await postRes.json()) as Record<string, unknown>;
    expect(updatedSettings['hideModels']).toBe(true);
    expect(updatedSettings['pauseTracking']).toBe(true);
    expect(tracker.isPaused()).toBe(true);

    // Verify persistence across server restart
    const persisted = new ConfigManager(configPath).getSettings();
    expect(persisted.hideModels).toBe(true);
  });

  it('broadcasts real-time events over Server-Sent Events (GET /api/stream)', async () => {
    const sseRes = await fetch(`${baseUrl}/api/stream`);
    expect(sseRes.status).toBe(200);
    expect(sseRes.headers.get('content-type')).toContain('text/event-stream');

    const reader = sseRes.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();

    // Read initial data push
    const initialRead = await reader!.read();
    const initialChunk = decoder.decode(initialRead.value);
    expect(initialChunk).toContain('data: {');

    // Process a new event in the tracker and verify SSE live push
    const pushPromise = (async () => {
      let accumulated = '';
      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        accumulated += decoder.decode(value);
        if (accumulated.includes('live-sse-conv')) {
          return accumulated;
        }
      }
      return accumulated;
    })();

    tracker.processEvent({
      event: 'PreInvocation',
      conversationId: 'live-sse-conv',
      modelName: 'gemini-3.8-flash-high',
      toolName: null,
      stepIdx: null,
      invocationNum: 0,
      terminationReason: null,
      fullyIdle: null,
      hasError: false,
      timestamp: '2026-11-05T04:35:00.000Z',
    });

    const receivedStream = await pushPromise;
    expect(receivedStream).toContain('live-sse-conv');
    expect(receivedStream).toContain('gemini-3.8-flash-high');

    await reader!.cancel();
  });

  it('registers multi-workspace windows via POST /api/workspaces and broadcasts in payload', async () => {
    const postRes = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        windowId: 'win-secondary',
        workspaceFolders: ['Unstable Wiki', 'Antigravity Extension'],
      }),
    });
    expect(postRes.status).toBe(200);
    const postJson = (await postRes.json()) as { ok: boolean; workspaces: { count: number; names: string[] } };
    expect(postJson.ok).toBe(true);
    expect(postJson.workspaces.count).toBe(2);
    expect(postJson.workspaces.names).toContain('Unstable Wiki');
    expect(postJson.workspaces.names).toContain('Antigravity Extension');

    const overRes = await fetch(`${baseUrl}/api/overview`);
    const overJson = (await overRes.json()) as { workspaces?: { count: number; names: string[] } };
    expect(overJson.workspaces?.count).toBe(2);
    expect(overJson.workspaces?.names).toContain('Unstable Wiki');
  });
});

