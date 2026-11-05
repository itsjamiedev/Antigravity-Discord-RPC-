/**
 * DashboardWebview — Native In-IDE Dashboard Webview Panel for Antigravity IDE
 *
 * Renders the Bento Observability Dashboard directly inside an editor tab
 * with live SSE telemetry, token accounting, and model breakdown.
 */

import * as vscode from 'vscode';
import { getDashboardHtml } from '../dashboard/html-content.js';

let currentPanel: vscode.WebviewPanel | null = null;

export function openDashboardWebview(context: vscode.ExtensionContext): vscode.WebviewPanel {
  const column = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : vscode.ViewColumn.One;

  if (currentPanel) {
    currentPanel.reveal(column);
    return currentPanel;
  }

  const panel = vscode.window.createWebviewPanel(
    'antigravityPresenceDashboard',
    'Antigravity Presence Dashboard',
    column || vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      enableFindWidget: true,
    }
  );

  panel.webview.html = getDashboardHtml();

  panel.onDidDispose(
    () => {
      currentPanel = null;
    },
    null,
    context.subscriptions
  );

  currentPanel = panel;
  return panel;
}

