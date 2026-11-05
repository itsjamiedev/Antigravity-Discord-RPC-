/**
 * Antigravity Presence — Native Antigravity IDE (VS Code) Extension
 *
 * Provides privacy-safe Discord Rich Presence and local dashboard monitoring
 * natively inside the IDE with zero external hooks and zero agent risk.
 */

import * as vscode from 'vscode';
import path from 'node:path';
import { DiscordIpcClient } from '../discord/ipc-client.js';
import { PresenceManager } from '../discord/presence-manager.js';
import { ConfigManager, getDefaultConfigPath } from '../config/privacy-config.js';
import { PureTracker } from '../tracker/pure-tracker.js';
import { AgentWatcher, type AgentWatcherState } from './agent-watcher.js';
import { DashboardServer } from '../dashboard/server.js';
import type { CentralTracker } from '../tracker/tracker.js';

let discordClient: DiscordIpcClient | null = null;
let presenceManager: PresenceManager | null = null;
let configManager: ConfigManager | null = null;
let tracker: PureTracker | null = null;
let agentWatcher: AgentWatcher | null = null;
let dashboardServer: DashboardServer | null = null;
let statusBarItem: vscode.StatusBarItem | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('[Antigravity Presence] Native Extension activating in Antigravity IDE...');

  // 1. Create Status Bar Item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'antigravityPresence.openDashboard';
  statusBarItem.text = '$(broadcast) Antigravity: Connecting...';
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
      if (statusBarItem) {
        statusBarItem.text = '$(circle-slash) Antigravity: Disconnected';
      }
    }
  });

  // 4. Initialize Presence Manager
  presenceManager = new PresenceManager(discordClient, configManager);

  // 5. Initialize PureTracker (zero C++ dependencies)
  tracker = new PureTracker();

  // 6. Initialize Agent Watcher (Hookless)
  agentWatcher = new AgentWatcher();
  agentWatcher.on('change', (state: AgentWatcherState) => {
    onAgentStateChanged(state);
  });
  agentWatcher.start();

  // 7. Initialize Local Dashboard Server (127.0.0.1:41177)
  try {
    dashboardServer = new DashboardServer({
      port: 41177,
      tracker: tracker as unknown as CentralTracker,
      presenceManager,
      discordClient,
      configManager,
    });
    await dashboardServer.start();
  } catch (err) {
    console.log('[Antigravity Presence] Dashboard server note:', err);
  }

  // 8. Register VS Code Editor Event Listeners (Manual Coding Mode)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => onEditorChanged()),
    vscode.window.onDidChangeTextEditorSelection(() => onEditorChanged()),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('antigravityPresence')) {
        syncConfigFromVsCode();
      }
    })
  );

  // 9. Register Extension Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('antigravityPresence.openDashboard', () => {
      void vscode.env.openExternal(vscode.Uri.parse('http://127.0.0.1:41177'));
    }),
    vscode.commands.registerCommand('antigravityPresence.reconnectDiscord', async () => {
      if (discordClient) {
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
      if (presenceManager && tracker) {
        presenceManager.updateFromSnapshot(tracker.getSnapshot());
      }
      updateStatusBar();
    })
  );

  // Initial connect & state sync
  void discordClient.connect();
  onEditorChanged();
  updateStatusBar();
  console.log('[Antigravity Presence] Activated successfully in Antigravity IDE!');
}

export function deactivate(): void {
  console.log('[Antigravity Presence] Deactivating extension...');
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
  presenceManager.updateFromSnapshot(tracker.getSnapshot());
  updateStatusBar();
}

function onEditorChanged(): void {
  if (!presenceManager || !tracker) return;

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document) {
    const fileName = path.basename(editor.document.fileName);
    const language = editor.document.languageId;
    const lineCount = editor.document.lineCount;
    const currentLine = editor.selection.active.line + 1;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri)?.name ?? null;

    presenceManager.setManualEditorState({
      fileName,
      language,
      currentLine,
      totalLines: lineCount,
      workspaceName: workspaceFolder,
      updatedAt: new Date().toISOString(),
    });
  } else {
    presenceManager.setManualEditorState(null);
  }

  presenceManager.updateFromSnapshot(tracker.getSnapshot());
  updateStatusBar();
}

function updateStatusBar(): void {
  if (!statusBarItem) return;

  const agentState = agentWatcher?.getState();
  const isAgentActive = agentState?.isAgentActive ?? false;

  if (isAgentActive) {
    const count = agentState?.activeAgentCount ?? 1;
    statusBarItem.text = `$(hubot) Antigravity: ${count} AI ${count === 1 ? 'Agent' : 'Agents'} Active`;
    statusBarItem.tooltip = `Antigravity Presence\nModels: ${agentState?.activeModels.join(', ') || 'Gemini 4 Argon'}\nClick to open Dashboard`;
  } else {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document) {
      const fileName = path.basename(editor.document.fileName);
      const line = editor.selection.active.line + 1;
      statusBarItem.text = `$(edit) Antigravity: ${fileName}:${line}`;
      statusBarItem.tooltip = `Editing ${fileName} (${editor.document.languageId}) - Line ${line} of ${editor.document.lineCount}\nClick to open Dashboard`;
    } else {
      statusBarItem.text = '$(broadcast) Antigravity: Ready';
      statusBarItem.tooltip = 'Antigravity Presence • Click to open Local Usage Dashboard';
    }
  }
}
