import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigManager } from '../src/config/privacy-config.js';
import {
  DiscordIpcClient,
  encodeIpcFrame,
  IPC_OPCODES,
  parseIpcPackets,
} from '../src/discord/ipc-client.js';
import { buildDiscordActivity, PresenceManager } from '../src/discord/presence-manager.js';
import type {
  Agent,
  DiscordActivity,
  ManualEditorState,
  TrackerSnapshot,
} from '../src/shared/types.js';

interface MockIpcServer {
  server: net.Server;
  pipePath: string;
  receivedHandshakes: Array<Record<string, unknown>>;
  receivedActivities: Array<Record<string, unknown>>;
  close(): Promise<void>;
}

function createMockIpcServer(pipePath: string): Promise<MockIpcServer> {
  return new Promise((resolve) => {
    const receivedHandshakes: Array<Record<string, unknown>> = [];
    const receivedActivities: Array<Record<string, unknown>> = [];
    const openSockets = new Set<net.Socket>();

    const server = net.createServer((sock) => {
      openSockets.add(sock);
      let buf: Buffer<ArrayBufferLike> = Buffer.alloc(0);

      sock.on('data', (chunk: Buffer) => {
        buf = Buffer.from(Buffer.concat([buf, chunk]));
        const { packets, remainingBuffer } = parseIpcPackets(buf);
        buf = remainingBuffer;

        for (const pkt of packets) {
          if (pkt.opcode === IPC_OPCODES.HANDSHAKE) {
            receivedHandshakes.push(pkt.payload);
            const readyFrame = encodeIpcFrame(IPC_OPCODES.FRAME, {
              cmd: 'DISPATCH',
              data: { v: 1, user: { username: 'TestUser' } },
              evt: 'READY',
            });
            sock.write(readyFrame);
          } else if (pkt.opcode === IPC_OPCODES.FRAME) {
            if (pkt.payload['cmd'] === 'SET_ACTIVITY') {
              const args = pkt.payload['args'] as Record<string, unknown>;
              receivedActivities.push(args);
              const respFrame = encodeIpcFrame(IPC_OPCODES.FRAME, {
                cmd: 'SET_ACTIVITY',
                data: args['activity'],
                evt: null,
                nonce: pkt.payload['nonce'],
              });
              sock.write(respFrame);
            }
          }
        }
      });

      sock.on('close', () => {
        openSockets.delete(sock);
      });
    });

    server.listen(pipePath, () => {
      resolve({
        server,
        pipePath,
        receivedHandshakes,
        receivedActivities,
        close: () =>
          new Promise((res) => {
            for (const s of openSockets) {
              try {
                s.destroy();
              } catch {
                // Ignore destroy error
              }
            }
            openSockets.clear();
            server.close(() => res());
          }),
      });
    });
  });
}

function makeMockSnapshot(activeAgents: Partial<Agent>[] = []): TrackerSnapshot {
  const fullAgents: Agent[] = activeAgents.map((a, i) => ({
    conversationId: a.conversationId ?? `conv-${i}`,
    model: a.model ?? 'gemini-4-argon-medium',
    status: a.status ?? 'thinking',
    statusEstimated: a.statusEstimated ?? false,
    activeTool: a.activeTool ?? null,
    startedAt: a.startedAt ?? '2026-11-05T04:00:00.000Z',
    lastEventAt: a.lastEventAt ?? '2026-11-05T04:00:05.000Z',
    lastEventType: a.lastEventType ?? 'PreInvocation',
    parentConversationId: a.parentConversationId ?? null,
    isSubagent: a.isSubagent ?? false,
    hasError: a.hasError ?? false,
  }));

  return {
    session: {
      sessionId: 'test-session',
      startedAt: '2026-11-05T04:00:00.000Z',
      lastActivityAt: '2026-11-05T04:00:05.000Z',
      activeAgentCount: fullAgents.length,
      totalConversations: fullAgents.length,
      totalEventsProcessed: 10,
      tokens: {
        inputTokens: 50000,
        cacheReadTokens: 10000,
        outputTokens: 2000,
        totalTokens: 62000,
        estimated: false,
        source: 'transcript_exact',
      },
    },
    agents: fullAgents,
    activeAgents: fullAgents,
    conversations: [],
    modelStats: [],
    dailyUsage: [],
  };
}

describe('Phase 4: Discord Rich Presence (IPC)', () => {
  let mockServer: MockIpcServer | null = null;
  let pipePath: string;

  beforeEach(() => {
    const isWin = process.platform === 'win32';
    const rand = Math.floor(Math.random() * 100000);
    pipePath = isWin
      ? `\\\\.\\pipe\\discord-ipc-test-${rand}`
      : path.join(os.tmpdir(), `discord-ipc-test-${rand}.sock`);
  });

  afterEach(async () => {
    if (mockServer) {
      await mockServer.close();
      mockServer = null;
    }
  });

  describe('1. Binary Framing & Parsing', () => {
    it('correctly handles fragmented and concatenated binary IPC packets', () => {
      const payload1 = { cmd: 'DISPATCH', evt: 'READY', data: { v: 1 } };
      const payload2 = { cmd: 'SET_ACTIVITY', data: { ok: true } };

      const frame1 = encodeIpcFrame(IPC_OPCODES.FRAME, payload1);
      const frame2 = encodeIpcFrame(IPC_OPCODES.FRAME, payload2);
      const combined = Buffer.concat([frame1, frame2]);

      const fragment1 = combined.subarray(0, 15);
      const fragment2 = combined.subarray(15, 30);
      const fragment3 = combined.subarray(30);

      const r1 = parseIpcPackets(fragment1);
      expect(r1.packets).toHaveLength(0);
      expect(r1.remainingBuffer).toHaveLength(15);

      const r2 = parseIpcPackets(Buffer.concat([r1.remainingBuffer, fragment2]));
      expect(r2.packets).toHaveLength(0);
      expect(r2.remainingBuffer).toHaveLength(30);

      const r3 = parseIpcPackets(Buffer.concat([r2.remainingBuffer, fragment3]));
      expect(r3.packets).toHaveLength(2);
      expect(r3.packets[0]?.payload).toEqual(payload1);
      expect(r3.packets[1]?.payload).toEqual(payload2);
      expect(r3.remainingBuffer).toHaveLength(0);
    });
  });

  describe('2. Dual-Mode Presence Formatter', () => {
    const configManager = new ConfigManager(':memory:');

    it('formats AI Agent mode when activeAgentCount > 0', () => {
      const snapshot = makeMockSnapshot([
        { model: 'gemini-4-argon-medium' },
        { model: 'gemini-3.8-flash-high' },
      ]);
      const settings = configManager.getSettings();

      const activity = buildDiscordActivity(snapshot, null, settings);
      expect(activity).not.toBeNull();
      expect(activity?.details).toBe('2 AI agents active');
      expect(activity?.state).toBe('Gemini 4 Argon, Gemini 3.8 Flash');
      expect(activity?.assets?.small_image).toBe('robot');
    });

    it('formats Manual Coding mode when AI agents are idle and editor state is active', () => {
      const emptySnapshot = makeMockSnapshot([]);
      const manualState: ManualEditorState = {
        fileName: 'types.ts',
        language: 'TypeScript',
        currentLine: 42,
        totalLines: 150,
        workspaceName: 'Antigravity Extension',
        updatedAt: new Date().toISOString(),
      };
      const settings = configManager.getSettings();

      const activity = buildDiscordActivity(emptySnapshot, manualState, settings);
      expect(activity).not.toBeNull();
      expect(activity?.details).toBe('Editing types.ts');
      expect(activity?.state).toBe('TypeScript — Line 42 of 150');
      expect(activity?.assets?.small_image).toBe('pencil');
    });

    it('respects hideFileNamesInManualEdits setting', () => {
      const emptySnapshot = makeMockSnapshot([]);
      const manualState: ManualEditorState = {
        fileName: 'secret_auth.ts',
        language: 'TypeScript',
        currentLine: 10,
        totalLines: 200,
        workspaceName: 'Classified',
        updatedAt: new Date().toISOString(),
      };
      const settings = {
        ...configManager.getSettings(),
        hideFileNamesInManualEdits: true,
      };

      const activity = buildDiscordActivity(emptySnapshot, manualState, settings);
      expect(activity).not.toBeNull();
      expect(activity?.details).toBe('Coding in TypeScript');
      expect(activity?.state).toBe('TypeScript — Line 10 of 200');
      expect(JSON.stringify(activity)).not.toContain('secret_auth.ts');
      expect(JSON.stringify(activity)).not.toContain('Classified');
    });

    it('returns null when disableRichPresence or pauseTracking is enabled', () => {
      const snapshot = makeMockSnapshot([{ model: 'gemini-4-argon-medium' }]);
      const disabled = { ...configManager.getSettings(), disableRichPresence: true };
      expect(buildDiscordActivity(snapshot, null, disabled)).toBeNull();

      const paused = { ...configManager.getSettings(), pauseTracking: true };
      expect(buildDiscordActivity(snapshot, null, paused)).toBeNull();
    });

    it('preserves exact session timestamps.start across AI Mode, Manual Mode, and Idle Mode without resetting to 0', () => {
      const settings = configManager.getSettings();
      const activeSnapshot = makeMockSnapshot([{ model: 'gemini-4-argon-medium' }]);
      const idleSnapshot = makeMockSnapshot([]);
      const expectedStartSec = Math.floor(Date.parse(activeSnapshot.session.startedAt) / 1000);

      const aiActivity = buildDiscordActivity(activeSnapshot, null, settings);
      expect(aiActivity?.timestamps?.start).toBe(expectedStartSec);

      const manualState: ManualEditorState = {
        fileName: 'index.ts',
        language: 'TypeScript',
        currentLine: 10,
        totalLines: 100,
        workspaceName: 'Antigravity Extension',
        updatedAt: new Date().toISOString(),
      };
      const manualActivity = buildDiscordActivity(idleSnapshot, manualState, settings);
      expect(manualActivity?.timestamps?.start).toBe(expectedStartSec);

      const idleActivity = buildDiscordActivity(idleSnapshot, null, settings);
      expect(idleActivity?.details).toBe('Idle');
      expect(idleActivity?.timestamps?.start).toBe(expectedStartSec);
    });

    it('formats multi-workspace counts and tokenmaxxing indicators when multiple workspaces are open', () => {
      const config = new ConfigManager(path.join(os.tmpdir(), 'test-cfg-' + Date.now()));
      config.updateSettings({ hideTokens: false });
      const settings = config.getSettings();

      const snapshot = makeMockSnapshot([{ model: 'Gemini 4 Argon' }]);
      snapshot.session.tokens = {
        inputTokens: 38_000_000,
        cacheReadTokens: 742_000_000,
        outputTokens: 4_000_000,
        totalTokens: 784_000_000,
        estimated: false,
        source: 'transcript_exact',
      };
      snapshot.session.sessionTokens = {
        inputTokens: 2_000_000,
        cacheReadTokens: 10_000_000,
        outputTokens: 500_000,
        totalTokens: 12_500_000,
        estimated: false,
        source: 'transcript_exact',
      };

      const activity = buildDiscordActivity(snapshot, null, settings, Date.now(), {
        count: 2,
        names: ['Antigravity Extension', 'Unstable Wiki'],
      });

      expect(activity).not.toBeNull();
      expect(activity?.details).toBe('1 AI agent active • 2 Workspaces');
      expect(activity?.state).toContain('Gemini 4 Argon');
      expect(activity?.state).toContain('⚡ 12.5M session • 784M lifetime');
      expect(activity?.assets?.large_text).toContain('Tokenmaxxing');
      expect(activity?.assets?.large_text).toContain('12.5M session • 784M lifetime');
      expect(activity?.assets?.small_text).toBe('AI Agent Working • 12.5M session (2 Workspaces)');
    });

    it('formats dual tokens with 0 session when session tokens are 0 but lifetime tokens exist', () => {
      const config = new ConfigManager(path.join(os.tmpdir(), 'test-cfg2-' + Date.now()));
      config.updateSettings({ hideTokens: false });
      const settings = config.getSettings();

      const snapshot = makeMockSnapshot([{ model: 'Gemini 3.8 Flash' }]);
      snapshot.session.tokens = {
        inputTokens: 100_000,
        cacheReadTokens: 200_000,
        outputTokens: 50_000,
        totalTokens: 350_000,
        estimated: false,
        source: 'transcript_exact',
      };

      const activity = buildDiscordActivity(snapshot, null, settings);
      expect(activity).not.toBeNull();
      expect(activity?.state).toContain('⚡ 0 session • 350K lifetime');
      expect(activity?.assets?.large_text).toContain('0 session • 350K lifetime');
      expect(activity?.assets?.small_text).toBe('AI Agent Working • 0 session (1 Workspace)');
    });
  });

  describe('3. IPC Handshake, SET_ACTIVITY & 15s Debounce Loop', () => {
    it('completes Handshake Opcode 0 and sends SET_ACTIVITY with NO OAuth requirement', async () => {
      mockServer = await createMockIpcServer(pipePath);

      const client = new DiscordIpcClient({
        clientId: 'test-client-id',
        pipePathOverride: pipePath,
      });

      try {
        const connectedPromise = new Promise<void>((resolve) => {
          client.onStateChange((state) => {
            if (state === 'connected') resolve();
          });
        });

        client.connect();
        await connectedPromise;

        expect(client.getState()).toBe('connected');
        expect(mockServer.receivedHandshakes).toHaveLength(1);
        expect(mockServer.receivedHandshakes[0]).toEqual({
          v: 1,
          client_id: 'test-client-id',
        });

        const activity: DiscordActivity = {
          name: 'Antigravity',
          details: '1 AI agent active',
          state: 'Gemini 4 Argon',
        };
        const ok = client.setActivity(activity);
        expect(ok).toBe(true);

        await new Promise((r) => setTimeout(r, 60));
        expect(mockServer.receivedActivities).toHaveLength(1);
        expect(mockServer.receivedActivities[0]?.['activity']).toEqual(activity);
      } finally {
        client.destroy();
      }
    });

    it('implements 15-second leading + trailing edge debouncing', async () => {
      mockServer = await createMockIpcServer(pipePath);
      const configManager = new ConfigManager(':memory:');
      configManager.updateSettings({ debounceMs: 80 });

      const client = new DiscordIpcClient({
        clientId: 'test-client-id',
        pipePathOverride: pipePath,
      });

      const presenceManager = new PresenceManager(client, configManager);

      try {
        const connectedPromise = new Promise<void>((resolve) => {
          client.onStateChange((state) => {
            if (state === 'connected') resolve();
          });
        });

        client.connect();
        await connectedPromise;

        const snap1 = makeMockSnapshot([{ model: 'gemini-4-argon-medium' }]);
        const snap2 = makeMockSnapshot([
          { model: 'gemini-4-argon-medium' },
          { model: 'gemini-3.8-flash-high' },
        ]);
        const snap3 = makeMockSnapshot([
          { model: 'gemini-4-argon-medium' },
          { model: 'gemini-3.8-flash-high' },
          { model: 'claude-sonnet-5-5-high' },
        ]);

        const t0 = 1000;
        // 1. Leading edge fires immediately at t0
        presenceManager.updateFromSnapshot(snap1, t0);
        await new Promise((r) => setTimeout(r, 30));
        expect(mockServer.receivedActivities).toHaveLength(1);
        expect(
          (mockServer.receivedActivities[0]?.['activity'] as DiscordActivity).details
        ).toBe('1 AI agent active');

        // 2. Burst of updates inside the 80ms window
        presenceManager.updateFromSnapshot(snap2, t0 + 20);
        presenceManager.updateFromSnapshot(snap3, t0 + 40);

        // Still only 1 sent so far (coalesced!)
        expect(mockServer.receivedActivities).toHaveLength(1);

        // 3. Wait for trailing edge timer to fire
        await new Promise((r) => setTimeout(r, 120));

        // Trailing edge must have dispatched the latest state (snap3 with 3 agents)
        expect(mockServer.receivedActivities).toHaveLength(2);
        expect(
          (mockServer.receivedActivities[1]?.['activity'] as DiscordActivity).details
        ).toBe('3 AI agents active');
      } finally {
        presenceManager.destroy();
        client.destroy();
      }
    });

    it('auto-reconnects when Discord closes and reopens', async () => {
      mockServer = await createMockIpcServer(pipePath);

      const client = new DiscordIpcClient({
        clientId: 'test-client-id',
        pipePathOverride: pipePath,
        reconnectBaseMs: 50,
        maxReconnectMs: 100,
      });

      try {
        const firstConnect = new Promise<void>((resolve) => {
          client.onStateChange((state) => {
            if (state === 'connected') resolve();
          });
        });

        client.connect();
        await firstConnect;
        expect(client.getState()).toBe('connected');

        // Close mock server (simulating Discord closing)
        const disconnected = new Promise<void>((resolve) => {
          client.onStateChange((state) => {
            if (state === 'disconnected') resolve();
          });
        });

        await mockServer.close();
        mockServer = null;
        await disconnected;
        expect(client.getState()).toBe('disconnected');

        // Re-open mock server (simulating Discord reopening)
        const reconnected = new Promise<void>((resolve) => {
          client.onStateChange((state) => {
            if (state === 'connected') resolve();
          });
        });

        mockServer = await createMockIpcServer(pipePath);
        await reconnected;
        expect(client.getState()).toBe('connected');
        expect(mockServer.receivedHandshakes).toHaveLength(1);
      } finally {
        client.destroy();
      }
    });
  });
});
