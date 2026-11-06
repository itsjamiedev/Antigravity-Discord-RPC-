/**
 * Antigravity Presence — Native Antigravity IDE (VS Code) Extension
 *
 * Provides privacy-safe Discord Rich Presence and local dashboard monitoring
 * natively inside the IDE with zero external hooks and zero agent risk.
 *
 * Features Leader Election: In multi-window environments, exactly ONE window
 * becomes Leader (hosting the Dashboard on port 41177 and managing the single
 * connection to Discord IPC). Secondary windows act as Followers and forward
 * manual editor activity to the Leader with zero IPC conflicts.
 */

import * as vscode from 'vscode';
import http from 'node:http';
import path from 'node:path';
import { DiscordIpcClient } from '../discord/ipc-client.js';
import { PresenceManager } from '../discord/presence-manager.js';
import { ConfigManager, getDefaultConfigPath } from '../config/privacy-config.js';
import { PureTracker } from '../tracker/pure-tracker.js';
import { AgentWatcher, type AgentWatcherState } from './agent-watcher.js';
import { DashboardServer } from '../dashboard/server.js';
import { openDashboardWebview } from './dashboard-webview.js';
import { SidebarDashboardProvider } from './sidebar-provider.js';
import type { CentralTracker } from '../tracker/tracker.js';
import type { ManualEditorState } from '../shared/types.js';

let discordClient: DiscordIpcClient | null = null;
let presenceManager: PresenceManager | null = null;
let configManager: ConfigManager | null = null;
let tracker: PureTracker | null = null;
let agentWatcher: AgentWatcher | null = null;
let dashboardServer: DashboardServer | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;
let sidebarProvider: SidebarDashboardProvider | null = null;

let isLeader = false;
let leaderCheckTimer: NodeJS.Timeout | null = null;
let workspaceHeartbeatTimer: NodeJS.Timeout | null = null;
let followerSyncTimer: NodeJS.Timeout | null = null;
const windowSessionId = 'win-' + Math.random().toString(36).slice(2, 9);

function getCurrentWorkspaceFolders(): string[] {
  return (vscode.workspace.workspaceFolders || []).map((f) => f.name).filter(Boolean);
}

function syncWorkspaces(): void {
  const folders = getCurrentWorkspaceFolders();
  if (isLeader && dashboardServer) {
    dashboardServer.registerWindowWorkspaces(windowSessionId, folders);
  } else {
    forwardWorkspaceStateToLeader(windowSessionId, folders);
  }
}

function forwardWorkspaceStateToLeader(winId: string, folders: string[]): void {
  try {
    const payload = JSON.stringify({
      windowId: winId,
      workspaceFolders: folders,
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 41177,
        path: '/api/workspaces',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 1000,
      },
      (res) => {
        res.resume();
      }
    );
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch {
    // Fail-open
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[Antigravity Presence] Native Extension activating in Antigravity IDE...');

  // 1. Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'antigravityPresence.showMenu';
  statusBarItem.text = '$(broadcast) Antigravity: Initializing...';
  statusBarItem.tooltip = 'Antigravity Presence • Click for control menu & metrics';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 2. Load Config Manager
  configManager = new ConfigManager(getDefaultConfigPath());
  syncConfigFromVsCode();

  // 3. Initialize Discord IPC Client
  discordClient = new DiscordIpcClient({
    clientId: configManager.getSettings().discordClientId,
  });

  discordClient.onStateChange((state) => {
    if (state === 'connected') {
      updateStatusBar();
    } else if (state === 'disconnected') {
      if (statusBarItem && isLeader) {
        statusBarItem.text = '$(circle-slash) Antigravity: Disconnected';
      }
    }
  });

  // 4. Initialize Presence Manager
  presenceManager = new PresenceManager(discordClient, configManager);

  // 5. Initialize PureTracker (zero C++ dependencies)
  tracker = new PureTracker();

  // 6. Initialize Activity Bar Sidebar Dashboard Provider
  sidebarProvider = new SidebarDashboardProvider(vscode, tracker.getSnapshot());
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'antigravityPresence.sidebarView',
      sidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );
  tracker.subscribe((snap) => {
    sidebarProvider?.updateSnapshot(snap);
  });

  // 7. Attempt Leader Election (Port 41177 Dashboard Server)
  const wonElection = await tryAcquireLeaderRole();
  if (!wonElection) {
    console.log('[Antigravity Presence] Operating in Follower mode (another IDE window is Leader).');
    syncWorkspaces();
    workspaceHeartbeatTimer = setInterval(() => {
      syncWorkspaces();
    }, 10000);

    // Periodically check if Leader closed, to take over seamlessly
    leaderCheckTimer = setInterval(async () => {
      if (!isLeader) {
        await tryAcquireLeaderRole();
      }
    }, 4000);

    // Follower-to-Leader real-time telemetry synchronization loop
    startFollowerSync();
  }

  // 7. Register VS Code Editor Event Listeners (Manual Coding Mode)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => onEditorChanged()),
    vscode.window.onDidChangeTextEditorSelection(() => onEditorChanged()),
    vscode.workspace.onDidChangeWorkspaceFolders(() => syncWorkspaces()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('antigravityPresence')) {
        syncConfigFromVsCode();
      }
    })
  );

  // 8. Register Extension Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityPresence.showMenu', async () => {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '$(dashboard) Open In-IDE Dashboard',
            detail: 'View real-time Bento metrics, tokens, and model breakdown in an editor tab',
            action: 'ide',
          },
          {
            label: '$(globe) Open Dashboard in Browser',
            detail: 'Open http://127.0.0.1:41177 in your default web browser',
            action: 'browser',
          },
          {
            label: '$(debug-pause) Pause & Leave Session (24h Retention)',
            detail: 'Freeze session timer and preserve token accounting across PC shutdown',
            action: 'pause',
          },
          {
            label: '$(play) Resume Previous Session',
            detail: 'Continue active session timing from stored elapsed progress',
            action: 'resume',
          },
          {
            label: '$(refresh) Start Fresh Session',
            detail: 'Reset session timer to 00:00:00 and begin a brand new session',
            action: 'fresh',
          },
          {
            label: '$(sync) Reconnect Discord',
            detail: 'Force reconnect to the Discord IPC client',
            action: 'reconnect',
          },
          {
            label: '$(eye) Toggle Rich Presence',
            detail: 'Enable or disable Discord Rich Presence broadcasting',
            action: 'toggle',
          },
        ],
        {
          placeHolder: 'Antigravity Presence — Control Center',
        }
      );

      if (!choice) return;
      if (choice.action === 'ide') {
        openDashboardWebview(context);
      } else if (choice.action === 'browser') {
        void vscode.env.openExternal(vscode.Uri.parse('http://127.0.0.1:41177'));
      } else if (choice.action === 'pause') {
        await vscode.commands.executeCommand('antigravityPresence.pauseAndLeaveSession');
      } else if (choice.action === 'resume') {
        await vscode.commands.executeCommand('antigravityPresence.resumePreviousSession');
      } else if (choice.action === 'fresh') {
        await vscode.commands.executeCommand('antigravityPresence.startFreshSession');
      } else if (choice.action === 'reconnect') {
        await vscode.commands.executeCommand('antigravityPresence.reconnectDiscord');
      } else if (choice.action === 'toggle') {
        await vscode.commands.executeCommand('antigravityPresence.togglePresence');
      }
    }),
    vscode.commands.registerCommand('antigravityPresence.openDashboard', () => {
      void vscode.env.openExternal(vscode.Uri.parse('http://127.0.0.1:41177'));
    }),
    vscode.commands.registerCommand('antigravityPresence.openDashboardInIde', () => {
      openDashboardWebview(context);
    }),
    vscode.commands.registerCommand('antigravityPresence.pauseAndLeaveSession', () => {
      if (tracker) {
        tracker.pauseSession();
        if (isLeader && presenceManager) {
          presenceManager.updateFromSnapshot(tracker.getSnapshot());
        } else if (!isLeader) {
          forwardSessionActionToLeader('pause');
        }
        vscode.window.showInformationMessage(
          'Antigravity Presence: Session paused & stored for up to 24 hours. Safe to shut down your PC or close the IDE.'
        );
        updateStatusBar();
      }
    }),
    vscode.commands.registerCommand('antigravityPresence.resumePreviousSession', () => {
      if (tracker) {
        const resumed = tracker.resumeSession();
        if (isLeader && presenceManager) {
          presenceManager.updateFromSnapshot(tracker.getSnapshot());
        } else if (!isLeader) {
          forwardSessionActionToLeader('resume');
        }
        const hrs = Math.floor(resumed.elapsedSeconds / 3600);
        const mins = Math.floor((resumed.elapsedSeconds % 3600) / 60);
        const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
        vscode.window.showInformationMessage(
          `Antigravity Presence: Session resumed with ${timeStr} preserved!`
        );
        updateStatusBar();
      }
    }),
    vscode.commands.registerCommand('antigravityPresence.startFreshSession', () => {
      if (tracker) {
        tracker.startFreshSession();
        if (isLeader && presenceManager) {
          presenceManager.updateFromSnapshot(tracker.getSnapshot());
        } else if (!isLeader) {
          forwardSessionActionToLeader('fresh');
        }
        vscode.window.showInformationMessage('Antigravity Presence: Fresh session started (00:00:00).');
        updateStatusBar();
      }
    }),
    vscode.commands.registerCommand('antigravityPresence.reconnectDiscord', async () => {
      if (discordClient && isLeader) {
        if (statusBarItem) statusBarItem.text = '$(sync~spin) Antigravity: Reconnecting...';
        await discordClient.connect();
        updateStatusBar();
      }
    }),
    vscode.commands.registerCommand('antigravityPresence.togglePresence', () => {
      if (!configManager) return;
      const current = configManager.getSettings().disableRichPresence;
      configManager.updateSettings({ disableRichPresence: !current });
      vscode.window.showInformationMessage(
        `Antigravity Presence: Discord Rich Presence is now ${!current ? 'Disabled' : 'Enabled'}`
      );
      if (presenceManager && tracker && isLeader) {
        presenceManager.updateFromSnapshot(tracker.getSnapshot());
      }
      updateStatusBar();
    }),
    vscode.commands.registerCommand('antigravityPresence.reloadWindow', () => {
      void vscode.commands.executeCommand('workbench.action.reloadWindow');
    })
  );

  onEditorChanged();
  updateStatusBar();
  console.log('[Antigravity Presence] Activated successfully in Antigravity IDE!');
}

async function tryAcquireLeaderRole(): Promise<boolean> {
  if (dashboardServer) return true;
  if (!tracker || !presenceManager || !discordClient || !configManager) return false;

  try {
    const server = new DashboardServer({
      port: 41177,
      tracker: tracker as unknown as CentralTracker,
      presenceManager,
      discordClient,
      configManager,
    });
    await server.start();
    dashboardServer = server;
    isLeader = true;
    tracker.refreshPersistentStartTime();
    console.log('[Antigravity Presence] Acquired Leader role on port 41177.');

    // Leader manages the Discord IPC pipe
    void discordClient.connect();

    // Leader monitors all Antigravity workspace agents
    if (!agentWatcher) {
      agentWatcher = new AgentWatcher();
      agentWatcher.on('change', (state: AgentWatcherState) => {
        onAgentStateChanged(state);
      });
      agentWatcher.start();
      onAgentStateChanged(agentWatcher.getState());
    }

    if (leaderCheckTimer) {
      clearInterval(leaderCheckTimer);
      leaderCheckTimer = null;
    }
    if (workspaceHeartbeatTimer) {
      clearInterval(workspaceHeartbeatTimer);
      workspaceHeartbeatTimer = null;
    }
    if (followerSyncTimer) {
      clearInterval(followerSyncTimer);
      followerSyncTimer = null;
    }

    // Leader registers its own open workspace folders
    dashboardServer.registerWindowWorkspaces(windowSessionId, getCurrentWorkspaceFolders());

    // Check if a previous session from within 24h should be resumed
    checkAndPromptSessionResumption();

    updateStatusBar();
    return true;
  } catch {
    dashboardServer = null;
    isLeader = false;
    return false;
  }
}

function checkAndPromptSessionResumption(): void {
  if (!tracker) return;
  const sm = tracker.getSessionManager();
  const state = sm.getSessionState();
  if (!state) return;

  const now = Date.now();
  const offlineGapMs = now - state.lastHeartbeatMs;

  // Only prompt if session has at least 30 seconds of activity,
  // was offline for > 45 seconds (prevents dialog on rapid dev hot reloads),
  // and is within the 24-hour retention window.
  if (sm.canResumeSession(24 * 3600 * 1000) && (offlineGapMs > 45_000 || state.isPaused)) {
    const elapsedSec = state.elapsedSeconds || 0;
    if (elapsedSec < 30 && !state.isPaused) return;

    const hrs = Math.floor(elapsedSec / 3600);
    const mins = Math.floor((elapsedSec % 3600) / 60);
    const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

    const savedHoursAgo = Math.floor(offlineGapMs / (3600 * 1000));
    const savedMinutesAgo = Math.max(1, Math.floor(offlineGapMs / 60000));
    const agoStr = savedHoursAgo > 0 ? `${savedHoursAgo}h ago` : `${savedMinutesAgo}m ago`;

    void vscode.window
      .showInformationMessage(
        `Antigravity Presence: Previous session found (${timeStr} elapsed, saved ${agoStr}). Continue session or start fresh?`,
        'Resume Session',
        'Start Fresh'
      )
      .then((choice) => {
        if (choice === 'Resume Session') {
          void vscode.commands.executeCommand('antigravityPresence.resumePreviousSession');
        } else if (choice === 'Start Fresh') {
          void vscode.commands.executeCommand('antigravityPresence.startFreshSession');
        }
      });
  }
}

export function deactivate(): void {
  console.log('[Antigravity Presence] Deactivating extension...');
  if (leaderCheckTimer) {
    clearInterval(leaderCheckTimer);
    leaderCheckTimer = null;
  }
  if (workspaceHeartbeatTimer) {
    clearInterval(workspaceHeartbeatTimer);
    workspaceHeartbeatTimer = null;
  }
  if (followerSyncTimer) {
    clearInterval(followerSyncTimer);
    followerSyncTimer = null;
  }
  if (agentWatcher) {
    agentWatcher.stop();
    agentWatcher = null;
  }
  if (presenceManager) {
    presenceManager.destroy();
    presenceManager = null;
  }
  if (discordClient) {
    discordClient.destroy();
    discordClient = null;
  }
  if (dashboardServer) {
    void dashboardServer.stop();
    dashboardServer = null;
  }
  if (tracker) {
    tracker.getSessionManager().saveOnShutdown();
    tracker.close();
    tracker = null;
  }
}

function syncConfigFromVsCode(): void {
  if (!configManager) return;
  const vsConfig = vscode.workspace.getConfiguration('antigravityPresence');
  configManager.updateSettings({
    disableRichPresence: vsConfig.get<boolean>('disableRichPresence', false),
    pauseTracking: vsConfig.get<boolean>('pauseTracking', false),
    hideTokens: vsConfig.get<boolean>('hideTokens', true),
    hideConversations: vsConfig.get<boolean>('hideConversations', true),
    hideModels: vsConfig.get<boolean>('hideModels', false),
    enableManualEditsPresence: vsConfig.get<boolean>('enableManualEditsPresence', true),
    hideFileNamesInManualEdits: vsConfig.get<boolean>('hideFileNamesInManualEdits', false),
  });
}

function onAgentStateChanged(state: AgentWatcherState): void {
  if (!tracker || !presenceManager) return;
  tracker.updateFromAgentWatcher(state);
  const snap = tracker.getSnapshot();
  if (isLeader) {
    presenceManager.updateFromSnapshot(snap);
  }
  sidebarProvider?.updateSnapshot(snap);
  updateStatusBar();
}

function onEditorChanged(): void {
  const editor = vscode.window.activeTextEditor;
  const editorState: ManualEditorState | null =
    editor && editor.document
      ? {
          fileName: path.basename(editor.document.fileName),
          language: editor.document.languageId,
          currentLine: editor.selection.active.line + 1,
          totalLines: editor.document.lineCount,
          workspaceName: vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name ?? null,
          updatedAt: new Date().toISOString(),
        }
      : null;

  if (isLeader) {
    if (presenceManager && tracker) {
      presenceManager.setManualEditorState(editorState);
      presenceManager.updateFromSnapshot(tracker.getSnapshot());
    }
  } else if (editorState) {
    // Follower forwards its manual editor activity to Leader
    forwardEditorStateToLeader(editorState);
  }

  updateStatusBar();
}

function forwardEditorStateToLeader(state: ManualEditorState): void {
  try {
    const payload = JSON.stringify({
      fileName: state.fileName,
      language: state.language,
      currentLine: state.currentLine,
      totalLines: state.totalLines,
      workspaceName: state.workspaceName,
      updatedAt: state.updatedAt,
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 41177,
        path: '/api/editor',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 1000,
      },
      (res) => {
        res.resume();
      }
    );
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch {
    // Fail-open
  }
}

function updateStatusBar(): void {
  if (!statusBarItem) return;

  const agentState = agentWatcher?.getState();
  const isAgentActive = agentState?.isAgentActive ?? false;

  if (isAgentActive) {
    const count = agentState?.activeAgentCount ?? 1;
    statusBarItem.text = `$(hubot) Antigravity: ${count} AI ${count === 1 ? 'Agent' : 'Agents'} Active`;
    statusBarItem.tooltip = `Antigravity Presence\nModels: ${agentState?.activeModels.join(', ') || 'Gemini 3.8 Flash'}\nClick to open Dashboard`;
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document) {
      const fileName = path.basename(editor.document.fileName);
      const line = editor.selection.active.line + 1;
      statusBarItem.text = `$(edit) Antigravity: ${fileName}:${line}`;
      statusBarItem.tooltip = `Editing ${fileName} (${editor.document.languageId}) - Line ${line} of ${editor.document.lineCount}\nClick to open Dashboard`;
    } else {
      statusBarItem.text = isLeader ? '$(broadcast) Antigravity: Ready' : '$(check) Antigravity: Connected';
      statusBarItem.tooltip = 'Antigravity Presence • Click to open Local Usage Dashboard';
    }
  }
}

function startFollowerSync(): void {
  if (followerSyncTimer) {
    clearInterval(followerSyncTimer);
    followerSyncTimer = null;
  }

  const pollLeader = () => {
    if (isLeader) {
      if (followerSyncTimer) {
        clearInterval(followerSyncTimer);
        followerSyncTimer = null;
      }
      return;
    }

    fetchOverviewFromLeader((fullState) => {
      if (!fullState || isLeader) return;
      if (tracker) {
        tracker.syncFromLeaderSnapshot(fullState);
      }
      sidebarProvider?.updateSnapshot(fullState);
      updateStatusBarFromLeader(fullState);
    });
  };

  // Immediate poll
  pollLeader();
  // Poll every 1500ms
  followerSyncTimer = setInterval(pollLeader, 1500);
}

function fetchOverviewFromLeader(callback: (data: any | null) => void): void {
  try {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 41177,
        path: '/api/overview',
        method: 'GET',
        timeout: 1200,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          callback(null);
          return;
        }
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            callback(data);
          } catch {
            callback(null);
          }
        });
      }
    );
    req.on('error', () => {
      callback(null);
    });
    req.on('timeout', () => {
      req.destroy();
      callback(null);
    });
    req.end();
  } catch {
    callback(null);
  }
}

function updateStatusBarFromLeader(state: any): void {
  if (!statusBarItem || isLeader) return;
  const activeAgents = state.activeAgents || [];
  if (activeAgents.length > 0) {
    const count = activeAgents.length;
    statusBarItem.text = `$(hubot) Antigravity: ${count} AI ${count === 1 ? 'Agent' : 'Agents'} Active`;
    const models = Array.from(new Set(activeAgents.map((a: any) => a.model).filter(Boolean)));
    statusBarItem.tooltip = `Antigravity Presence (Follower)\nModels: ${models.join(', ') || 'Gemini 3.8 Flash'}\nClick to open Dashboard`;
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document) {
      const fileName = path.basename(editor.document.fileName);
      const line = editor.selection.active.line + 1;
      statusBarItem.text = `$(edit) Antigravity: ${fileName}:${line}`;
      statusBarItem.tooltip = `Editing ${fileName} (${editor.document.languageId}) - Line ${line} of ${editor.document.lineCount}\nClick to open Dashboard`;
    } else {
      statusBarItem.text = '$(check) Antigravity: Connected';
      statusBarItem.tooltip = 'Antigravity Presence • Click to open Local Usage Dashboard';
    }
  }
}

function forwardSessionActionToLeader(action: 'pause' | 'resume' | 'fresh'): void {
  try {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 41177,
        path: `/api/session/${action}`,
        method: 'POST',
        timeout: 1500,
      },
      (res) => {
        res.resume();
      }
    );
    req.on('error', () => {});
    req.end();
  } catch {}
}
