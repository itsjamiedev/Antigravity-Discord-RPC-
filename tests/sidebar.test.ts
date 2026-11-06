import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TrackerSnapshot } from '../src/shared/types.js';
import { getSidebarHtml, SidebarDashboardProvider } from '../src/extension/sidebar-provider.js';

describe('SidebarDashboardProvider (Native Activity Bar Webview View)', () => {
  let mockSnapshot: TrackerSnapshot;

  beforeEach(() => {
    mockSnapshot = {
      session: {
        sessionId: 'test-session',
        startedAt: new Date(Date.now() - 3600_000).toISOString(),
        lastActivityAt: new Date().toISOString(),
        activeAgentCount: 1,
        totalConversations: 5,
        totalEventsProcessed: 12,
        tokens: {
          inputTokens: 100_000,
          cacheReadTokens: 400_000,
          outputTokens: 25_000,
          totalTokens: 525_000,
          estimated: false,
          source: 'transcript_exact',
        },
      },
      agents: [],
      activeAgents: [
        {
          conversationId: 'conv-1',
          model: 'gemini-3.8-flash-high',
          status: 'thinking',
          statusEstimated: false,
          activeTool: null,
          startedAt: new Date().toISOString(),
          lastEventAt: new Date().toISOString(),
          lastEventType: 'SessionStart',
          parentConversationId: null,
          isSubagent: false,
          hasError: false,
        },
      ],
      conversations: [],
      modelStats: [
        {
          model: 'Gemini 3.8 Flash',
          conversationCount: 3,
          invocationCount: 5,
          toolCallCount: 2,
          errorCount: 0,
          tokens: {
            inputTokens: 80_000,
            cacheReadTokens: 350_000,
            outputTokens: 20_000,
            totalTokens: 450_000,
            estimated: false,
            source: 'transcript_exact',
          },
          lastUsedAt: new Date().toISOString(),
        },
        {
          model: 'Claude Sonnet 5.5',
          conversationCount: 2,
          invocationCount: 3,
          toolCallCount: 1,
          errorCount: 0,
          tokens: {
            inputTokens: 20_000,
            cacheReadTokens: 50_000,
            outputTokens: 5_000,
            totalTokens: 75_000,
            estimated: false,
            source: 'transcript_exact',
          },
          lastUsedAt: new Date().toISOString(),
        },
      ],
      dailyUsage: [],
    };
  });

  it('generates rich dark-mode sidebar HTML with KPI tiles and model distribution', () => {
    const html = getSidebarHtml(mockSnapshot);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Antigravity Telemetry');
    expect(html).toContain('TOKEN VOLUME');
    expect(html).toContain('525,000');
    expect(html).toContain('Gemini 3.8 Flash');
    expect(html).toContain('Claude Sonnet 5.5');
    expect(html).toContain('btnPause');
    expect(html).toContain('btnOpenFull');
  });

  it('resolves webview view and wires message handling to VS Code commands', async () => {
    const executeCommandSpy = vi.fn();
    const mockVscode = {
      commands: { executeCommand: executeCommandSpy },
    };

    const provider = new SidebarDashboardProvider(mockVscode as any);
    let messageHandler: ((message: { command: string }) => void) | null = null;

    const mockWebview = {
      options: {},
      html: '',
      onDidReceiveMessage: vi.fn((fn) => {
        messageHandler = fn;
        return { dispose: vi.fn() };
      }),
      postMessage: vi.fn(),
    };

    const mockWebviewView = {
      webview: mockWebview,
      show: vi.fn(),
    };

    provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);

    expect(mockWebview.html).toContain('Antigravity Telemetry');
    expect(typeof messageHandler).toBe('function');

    // Simulate clicking "Open Full Dashboard"
    messageHandler!({ command: 'openFullDashboard' });
    expect(executeCommandSpy).toHaveBeenCalledWith('antigravityPresence.openDashboardInIde');

    // Simulate clicking "Pause Session"
    messageHandler!({ command: 'pauseSession' });
    expect(executeCommandSpy).toHaveBeenCalledWith('antigravityPresence.pauseAndLeaveSession');

    // Simulate clicking "Resume Session"
    messageHandler!({ command: 'resumeSession' });
    expect(executeCommandSpy).toHaveBeenCalledWith('antigravityPresence.resumePreviousSession');
  });

  it('updates HTML when updateSnapshot is invoked', () => {
    const provider = new SidebarDashboardProvider();
    const mockPostMessage = vi.fn();
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn(),
        postMessage: mockPostMessage,
      },
      show: vi.fn(),
    };

    provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
    provider.updateSnapshot(mockSnapshot);

    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        snapshot: mockSnapshot,
      })
    );
  });

  it('replies to requestState message with current snapshot or disk fallback', () => {
    const provider = new SidebarDashboardProvider(undefined, mockSnapshot);
    const mockPostMessage = vi.fn();
    let messageHandler: ((msg: { command: string }) => void) | null = null;
    const mockWebviewView = {
      webview: {
        options: {},
        html: '',
        onDidReceiveMessage: vi.fn((fn) => {
          messageHandler = fn;
        }),
        postMessage: mockPostMessage,
      },
      show: vi.fn(),
    };

    provider.resolveWebviewView(mockWebviewView as any, {} as any, {} as any);
    expect(typeof messageHandler).toBe('function');

    messageHandler!({ command: 'requestState' });
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: 'update',
      snapshot: mockSnapshot,
    });
  });

  it('generates HTML with CSP meta tag and fallback handling when snapshot is null', () => {
    const html = getSidebarHtml(null);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain('http://127.0.0.1:*');
    expect(html).toContain('Antigravity Telemetry');
  });
});
