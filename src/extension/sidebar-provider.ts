/**
 * SidebarDashboardProvider — Native Activity Bar Sidebar Dashboard for Antigravity IDE
 *
 * Implements vscode.WebviewViewProvider to render real-time agent telemetry,
 * tokenmaxxing counters, 24h session controls, and model breakdowns directly
 * inside the IDE primary sidebar.
 */

import type * as vscode from 'vscode';
import type { TrackerSnapshot } from '../shared/types.js';

export function formatNumber(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

export function formatDuration(elapsedSec: number): string {
  const hrs = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  const pad = (v: number) => (v < 10 ? '0' + v : String(v));
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function getSidebarHtml(snapshot?: TrackerSnapshot | null): string {
  const tokens = snapshot?.session.tokens;
  const totalTokens = tokens?.totalTokens ?? 0;
  const cacheTokens = tokens?.cacheReadTokens ?? 0;
  const inTokens = tokens?.inputTokens ?? 0;
  const outTokens = tokens?.outputTokens ?? 0;

  const cacheRatio = inTokens + cacheTokens > 0
    ? Math.round((cacheTokens / (inTokens + cacheTokens)) * 100)
    : 0;

  const models = snapshot?.modelStats ?? [];
  const activeAgents = snapshot?.activeAgents ?? [];
  const isAgentActive = activeAgents.length > 0;
  const activeAgent = activeAgents[0];

  const startedAt = snapshot?.session.startedAt ?? new Date().toISOString();
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const timeFormatted = formatDuration(elapsedSec);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Antigravity Telemetry</title>
  <style>
    :root {
      --bg: #09090b;
      --card-bg: rgba(255, 255, 255, 0.035);
      --card-border: rgba(255, 255, 255, 0.08);
      --acc: #E8FF1F;
      --emerald: #10b981;
      --t1: #ffffff;
      --t2: rgba(255, 255, 255, 0.65);
      --t3: rgba(255, 255, 255, 0.4);
      --radius: 12px;
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--t1);
      font-family: var(--font-sans);
      font-size: 12px;
      line-height: 1.4;
      padding: 12px 10px 20px;
      overflow-x: hidden;
      user-select: none;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--card-border);
    }
    .brand-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: -0.02em;
      color: var(--t1);
    }
    .brand-title svg {
      width: 16px;
      height: 16px;
      color: var(--acc);
    }
    .status-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .status-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 12px;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
    }
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .cap {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--t3);
    }
    .chip {
      font-size: 9.5px;
      font-weight: 600;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--t2);
    }

    .mono { font-family: var(--font-mono); }
    .hero-tokens {
      font-size: 1.7rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--t1);
      margin: 4px 0 6px;
      line-height: 1.1;
    }
    .token-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 10.5px;
      color: var(--t2);
    }
    .token-breakdown span { display: inline-flex; align-items: center; gap: 3px; }
    .token-breakdown i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    .timer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .timer-display {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--acc);
    }

    .btn-group {
      display: flex;
      gap: 6px;
      margin-top: 8px;
    }
    .btn {
      flex: 1;
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.06);
      color: var(--t1);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s ease;
      outline: none;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .btn-primary {
      background: rgba(232, 255, 31, 0.12);
      border-color: rgba(232, 255, 31, 0.35);
      color: var(--acc);
    }
    .btn-primary:hover {
      background: rgba(232, 255, 31, 0.2);
      border-color: var(--acc);
    }

    .model-row {
      margin-top: 8px;
    }
    .model-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .model-name { font-weight: 600; color: var(--t1); }
    .model-val { color: var(--t2); }
    .progress-bar {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--acc);
    }

    .agent-active-box {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 8px;
      background: rgba(232, 255, 31, 0.06);
      border: 1px solid rgba(232, 255, 31, 0.2);
      margin-top: 4px;
    }
    .pulse-ring {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--acc);
      box-shadow: 0 0 8px var(--acc);
    }

    .full-dash-btn {
      width: 100%;
      padding: 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 700;
      margin-top: 8px;
    }
  </style>
</head>
<body>

  <!-- SIDEBAR HEADER -->
  <div class="sidebar-header">
    <div class="brand-title">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 22 18 2 18" />
        <polygon points="12 7 17 15 7 15" fill="currentColor" opacity="0.3" />
      </svg>
      <span>Antigravity Telemetry</span>
    </div>
    <div class="status-badge" id="sideStatusBadge">
      <span class="status-dot"></span>
      <span id="sideStatusText">Live SSE</span>
    </div>
  </div>

  <!-- 1. HERO TOKENMAXXING TILE -->
  <div class="card">
    <div class="card-top">
      <span class="cap">TOKEN CONSUMPTION</span>
      <span class="chip" style="color:var(--acc); border-color:rgba(232,255,31,0.3);">⚡ TOKENMAXXING</span>
    </div>
    <div class="hero-tokens mono" id="sideTotalTokens">${formatNumber(totalTokens)}</div>
    <div class="token-breakdown">
      <span><i style="background:#10b981;"></i> Cache: <b class="mono" id="sideCacheTokens">${formatNumber(cacheTokens)}</b></span>
      <span><i style="background:#ffffff;"></i> In: <b class="mono" id="sideInTokens">${formatNumber(inTokens)}</b></span>
      <span><i style="background:var(--acc);"></i> Out: <b class="mono" id="sideOutTokens">${formatNumber(outTokens)}</b></span>
    </div>
    <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:10.5px; color:var(--t3);">Prompt Cache Efficiency</span>
      <span class="chip mono" style="color:#10b981; font-weight:700;" id="sideCacheRatio">${cacheRatio}%</span>
    </div>
  </div>

  <!-- 2. SESSION TIMER & 24H CONTROLS -->
  <div class="card">
    <div class="card-top">
      <span class="cap">SESSION DURATION</span>
      <span class="chip" id="sideRetentionChip" style="color:#10b981; border-color:rgba(16,185,129,0.3);">24H PERSISTENT</span>
    </div>
    <div class="timer-row">
      <div class="timer-display mono" id="sideTimerDisplay">${timeFormatted}</div>
      <span class="chip" id="sideTimerStatus">ACTIVE</span>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" id="btnPause" onclick="togglePause()">
        <span id="btnPauseIcon">⏸️</span>
        <span id="btnPauseLabel">Pause (24h)</span>
      </button>
      <button class="btn" id="btnFresh" onclick="startFresh()">
        <span>🔄</span>
        <span>Fresh</span>
      </button>
    </div>
  </div>

  <!-- 3. ACTIVE AGENTS CARD -->
  <div class="card">
    <div class="card-top">
      <span class="cap">ACTIVE AGENTS</span>
      <span class="chip" id="sideAgentCountChip">${activeAgents.length} ACTIVE</span>
    </div>
    <div id="sideAgentContainer">
      ${
        isAgentActive
          ? `<div class="agent-active-box">
              <div class="pulse-ring"></div>
              <div style="flex:1; overflow:hidden;">
                <div style="font-weight:600; font-size:11.5px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                  ${activeAgent?.model ?? 'AI Agent'}
                </div>
                <div style="font-size:10px; color:var(--t2);">
                  ${activeAgent?.activeTool ? `Tool: ${activeAgent.activeTool}` : 'Thinking & Planning...'}
                </div>
              </div>
            </div>`
          : `<div style="font-size:11px; color:var(--t3); padding:4px 0;">All agents currently idle. Preserving context.</div>`
      }
    </div>
  </div>

  <!-- 4. MODEL ALLOCATION LIST -->
  <div class="card">
    <div class="card-top">
      <span class="cap">MODEL ALLOCATION</span>
      <span class="chip" id="sideModelCount">${models.length} MODELS</span>
    </div>
    <div id="sideModelList">
      ${
        models.length > 0
          ? models.slice(0, 4).map((m, idx) => {
              const share = totalTokens > 0 ? Math.round((m.tokens.totalTokens / totalTokens) * 100) : 0;
              const color = idx === 0 ? 'var(--acc)' : idx === 1 ? '#a9b2ff' : idx === 2 ? '#ffb37a' : '#10b981';
              return `<div class="model-row">
                <div class="model-header">
                  <span class="model-name">${m.model}</span>
                  <span class="model-val mono">${formatNumber(m.tokens.totalTokens)} (${share}%)</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${share}%; background: ${color};"></div>
                </div>
              </div>`;
            }).join('')
          : `<div style="font-size:11px; color:var(--t3); padding:4px 0;">No model data accumulated yet.</div>`
      }
    </div>
  </div>

  <!-- 5. QUICK ACTION BUTTONS -->
  <button class="btn btn-primary full-dash-btn" id="btnOpenFull" onclick="openFullDashboard()">
    <span>📊 Open Full In-IDE Bento Dashboard</span>
  </button>
  <div style="display:flex; gap:6px; margin-top:6px;">
    <button class="btn" style="flex:1;" onclick="openBrowserDashboard()">
      <span>🌐 Browser</span>
    </button>
    <button class="btn" style="flex:1;" onclick="reconnectDiscord()">
      <span>🔄 Discord</span>
    </button>
  </div>

  <script>
    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
    let isPaused = false;
    let startedAtIso = "${startedAt}";
    let timerInterval = null;

    function formatNumberJs(n) {
      if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
      return n.toLocaleString('en-US');
    }

    function formatDurationJs(sec) {
      const hrs = Math.floor(sec / 3600);
      const mins = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const pad = (v) => (v < 10 ? '0' + v : String(v));
      return pad(hrs) + ':' + pad(mins) + ':' + pad(s);
    }

    function startTimer(startedIso, paused) {
      if (timerInterval) clearInterval(timerInterval);
      const startMs = Date.parse(startedIso) || Date.now();

      function update() {
        const sec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        const el = document.getElementById('sideTimerDisplay');
        if (el) el.innerText = formatDurationJs(sec);
      }

      update();
      if (!paused) {
        timerInterval = setInterval(update, 1000);
      }
    }

    startTimer(startedAtIso, isPaused);

    function updateFromSnapshot(snap) {
      if (!snap) return;
      const tokens = snap.session ? snap.session.tokens : null;
      if (tokens) {
        const tot = tokens.totalTokens || 0;
        const cTok = tokens.cacheReadTokens || 0;
        const inTok = tokens.inputTokens || 0;
        const outTok = tokens.outputTokens || 0;
        const ratio = inTok + cTok > 0 ? Math.round((cTok / (inTok + cTok)) * 100) : 0;

        document.getElementById('sideTotalTokens').innerText = formatNumberJs(tot);
        document.getElementById('sideCacheTokens').innerText = formatNumberJs(cTok);
        document.getElementById('sideInTokens').innerText = formatNumberJs(inTok);
        document.getElementById('sideOutTokens').innerText = formatNumberJs(outTok);
        document.getElementById('sideCacheRatio').innerText = ratio + '%';
      }

      if (snap.session && snap.session.startedAt) {
        startedAtIso = snap.session.startedAt;
        startTimer(startedAtIso, isPaused);
      }

      // Update Active Agents
      const agents = snap.activeAgents || [];
      const countEl = document.getElementById('sideAgentCountChip');
      if (countEl) countEl.innerText = agents.length + ' ACTIVE';

      const agentBox = document.getElementById('sideAgentContainer');
      if (agentBox) {
        if (agents.length > 0) {
          const a = agents[0];
          agentBox.innerHTML = '<div class="agent-active-box">' +
            '<div class="pulse-ring"></div>' +
            '<div style="flex:1; overflow:hidden;">' +
            '<div style="font-weight:600; font-size:11.5px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">' + (a.model || 'AI Agent') + '</div>' +
            '<div style="font-size:10px; color:var(--t2);">' + (a.activeTool ? 'Tool: ' + a.activeTool : 'Thinking & Planning...') + '</div>' +
            '</div></div>';
        } else {
          agentBox.innerHTML = '<div style="font-size:11px; color:var(--t3); padding:4px 0;">All agents currently idle. Preserving context.</div>';
        }
      }

      // Update Model List
      const models = snap.modelStats || [];
      const mListEl = document.getElementById('sideModelList');
      const mCountEl = document.getElementById('sideModelCount');
      if (mCountEl) mCountEl.innerText = models.length + ' MODELS';
      if (mListEl && models.length > 0) {
        const totTokens = tokens ? tokens.totalTokens : 1;
        mListEl.innerHTML = models.slice(0, 4).map(function(m, i) {
          const share = totTokens > 0 ? Math.round((m.tokens.totalTokens / totTokens) * 100) : 0;
          const color = i === 0 ? 'var(--acc)' : i === 1 ? '#a9b2ff' : i === 2 ? '#ffb37a' : '#10b981';
          return '<div class="model-row">' +
            '<div class="model-header">' +
            '<span class="model-name">' + m.model + '</span>' +
            '<span class="model-val mono">' + formatNumberJs(m.tokens.totalTokens) + ' (' + share + '%)</span>' +
            '</div>' +
            '<div class="progress-bar">' +
            '<div class="progress-fill" style="width:' + share + '%; background:' + color + ';"></div>' +
            '</div>' +
            '</div>';
        }).join('');
      }
    }

    // Connect to live SSE stream from local dashboard server
    function initSSE() {
      try {
        const es = new EventSource('http://127.0.0.1:41177/api/stream');
        es.onmessage = function(e) {
          try {
            const data = JSON.parse(e.data);
            updateFromSnapshot(data);
            const badge = document.getElementById('sideStatusText');
            if (badge) badge.innerText = 'Live SSE';
          } catch {}
        };
        es.onerror = function() {
          const badge = document.getElementById('sideStatusText');
          if (badge) badge.innerText = 'Connecting...';
          setTimeout(initSSE, 4000);
        };
      } catch {
        setTimeout(initSSE, 4000);
      }
    }

    initSSE();

    // Listen for extension messages
    window.addEventListener('message', function(event) {
      const msg = event.data;
      if (msg && msg.type === 'update') {
        updateFromSnapshot(msg.snapshot);
      }
    });

    // Actions dispatched to VS Code
    function openFullDashboard() {
      if (vscode) vscode.postMessage({ command: 'openFullDashboard' });
    }

    function openBrowserDashboard() {
      if (vscode) vscode.postMessage({ command: 'openBrowserDashboard' });
    }

    function togglePause() {
      isPaused = !isPaused;
      const icon = document.getElementById('btnPauseIcon');
      const label = document.getElementById('btnPauseLabel');
      const status = document.getElementById('sideTimerStatus');
      const badge = document.getElementById('sideRetentionChip');

      if (isPaused) {
        if (icon) icon.innerText = '▶️';
        if (label) label.innerText = 'Resume';
        if (status) status.innerText = 'PAUSED';
        if (badge) {
          badge.style.color = 'var(--acc)';
          badge.style.borderColor = 'rgba(232,255,31,0.3)';
          badge.innerText = 'PAUSED (24H)';
        }
        if (vscode) vscode.postMessage({ command: 'pauseSession' });
      } else {
        if (icon) icon.innerText = '⏸️';
        if (label) label.innerText = 'Pause (24h)';
        if (status) status.innerText = 'ACTIVE';
        if (badge) {
          badge.style.color = '#10b981';
          badge.style.borderColor = 'rgba(16,185,129,0.3)';
          badge.innerText = '24H PERSISTENT';
        }
        if (vscode) vscode.postMessage({ command: 'resumeSession' });
      }
      startTimer(startedAtIso, isPaused);
    }

    function startFresh() {
      if (vscode) vscode.postMessage({ command: 'startFreshSession' });
    }

    function reconnectDiscord() {
      if (vscode) vscode.postMessage({ command: 'reconnectDiscord' });
    }
  </script>
</body>
</html>`;
}

export class SidebarDashboardProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private currentSnapshot?: TrackerSnapshot | null;
  private customVscode?: typeof vscode;

  constructor(customVscode?: typeof vscode) {
    this.customVscode = customVscode;
  }

  private getVscode(): typeof vscode {
    if (this.customVscode) return this.customVscode;
    try {
      return require('vscode');
    } catch {
      throw new Error('vscode module is only available inside VS Code extension runtime');
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    webviewView.webview.html = getSidebarHtml(this.currentSnapshot);

    webviewView.webview.onDidReceiveMessage((message: { command: string }) => {
      const vs = this.getVscode();
      switch (message.command) {
        case 'openFullDashboard':
          void vs.commands.executeCommand('antigravityPresence.openDashboardInIde');
          break;
        case 'openBrowserDashboard':
          void vs.commands.executeCommand('antigravityPresence.openDashboard');
          break;
        case 'pauseSession':
          void vs.commands.executeCommand('antigravityPresence.pauseAndLeaveSession');
          break;
        case 'resumeSession':
          void vs.commands.executeCommand('antigravityPresence.resumePreviousSession');
          break;
        case 'startFreshSession':
          void vs.commands.executeCommand('antigravityPresence.startFreshSession');
          break;
        case 'reconnectDiscord':
          void vs.commands.executeCommand('antigravityPresence.reconnectDiscord');
          break;
      }
    });
  }

  public updateSnapshot(snapshot: TrackerSnapshot): void {
    this.currentSnapshot = snapshot;
    if (this.view) {
      void this.view.webview.postMessage({
        type: 'update',
        snapshot,
      });
    }
  }
}
