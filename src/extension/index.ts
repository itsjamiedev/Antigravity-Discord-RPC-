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
import type { CentralTracker } from '../tracker/tracker.js';
import type { ManualEditorState } from '../shared/types.js';

let discordClient: DiscordIpcClient | null = null;
let presenceManager: PresenceManager | null = null;
let configManager: ConfigManager | null = null;
let tracker: PureTracker | null = null;
let agentWatcher: AgentWatcher | null = null;
let dashboardServer: DashboardServer | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

let isLeader = false;
let leaderCheckTimer: NodeJS.Timeout | null = null;
let workspaceHeartbeatTimer: NodeJS.Timeout | null = null;
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
  statusBarItem.command = 'antigravityPresence.openDashboard';
  statusBarItem.text = '$(broadcast) Antigravity: Initializing...';
  statusBarItem.tooltip = 'Antigravity Presence • Click to open Local Usage Dashboard';
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

  // 6. Attempt Leader Election (Port 41177 Dashboard Server)
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
    vscode.commands.registerCommand('antigravityPresence.openDashboard', () => {
      void vscode.env.openExternal(vscode.Uri.parse('http://127.0.0.1:41177'));
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
    }

    if (leaderCheckTimer) {
      clearInterval(leaderCheckTimer);
      leaderCheckTimer = null;
    }
    if (workspaceHeartbeatTimer) {
      clearInterval(workspaceHeartbeatTimer);
      workspaceHeartbeatTimer = null;
    }

    // Leader registers its own open workspace folders
    dashboardServer.registerWindowWorkspaces(windowSessionId, getCurrentWorkspaceFolders());

    updateStatusBar();
    return true;
  } catch {
    dashboardServer = null;
    isLeader = false;
    return false;
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
  if (isLeader) {
    presenceManager.updateFromSnapshot(tracker.getSnapshot());
  }
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
