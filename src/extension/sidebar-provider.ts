/**
 * SidebarDashboardProvider — Elite Native Activity Bar Sidebar Dashboard for Antigravity IDE
 *
 * Implements vscode.WebviewViewProvider to render real-time agent telemetry,
 * tokenmaxxing counters, 24h session controls, and dual-dashboard access (In-IDE & Browser)
 * directly inside the IDE primary sidebar with agency-grade Doppelrand aesthetics.
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

  const inRatio = totalTokens > 0 ? Math.max(1, Math.round((inTokens / totalTokens) * 100)) : 0;
  const outRatio = totalTokens > 0 ? Math.max(1, Math.round((outTokens / totalTokens) * 100)) : 0;
  const cacheBarRatio = totalTokens > 0 ? Math.max(0, 100 - inRatio - outRatio) : 0;

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
      --bg: #070709;
      --shell: rgba(255, 255, 255, 0.05);
      --shell-hover: rgba(232, 255, 31, 0.25);
      --core: #0c0c10;
      --card-border: rgba(255, 255, 255, 0.08);
      --acc: #E8FF1F;
      --acc-glow: rgba(232, 255, 31, 0.15);
      --emerald: #10b981;
      --lavender: #a9b2ff;
      --coral: #ffb37a;
      --t1: #ffffff;
      --t2: rgba(255, 255, 255, 0.72);
      --t3: rgba(255, 255, 255, 0.42);
      --ease: cubic-bezier(0.32, 0.72, 0, 1);
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--t1);
      font-family: var(--font-sans);
      font-size: 12px;
      line-height: 1.45;
      padding: 10px 8px 24px;
      overflow-x: hidden;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* DOUBLE-BEZEL (DOPPELRAND) NESTED HARDWARE ARCHITECTURE */
    .bezel {
      position: relative;
      border-radius: 16px;
      padding: 1px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%);
      margin-bottom: 10px;
      transition: background 0.3s var(--ease), box-shadow 0.3s var(--ease);
    }
    .bezel:hover {
      background: linear-gradient(180deg, rgba(232, 255, 31, 0.35) 0%, rgba(255, 255, 255, 0.08) 100%);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
    }
    .core {
      background: var(--core);
      border-radius: 15px;
      padding: 12px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .core-ambient-glow {
      position: absolute;
      top: -30px;
      right: -20px;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle, var(--acc-glow), transparent 70%);
      pointer-events: none;
    }

    /* TOP BAR */
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 4px 10px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .brand-mark {
      display: flex;
      align-items: center;
      gap: 7px;
      font-weight: 700;
      font-size: 12.5px;
      letter-spacing: -0.02em;
      color: var(--t1);
    }
    .brand-mark svg {
      width: 16px;
      height: 16px;
      color: var(--acc);
      filter: drop-shadow(0 0 6px rgba(232, 255, 31, 0.5));
    }
    .live-pill {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--emerald);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .live-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }

    /* DUAL DASHBOARD HUB (USER DIRECTIVE: IN-IDE + BROWSER) */
    .hub-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .hub-tile {
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 13px;
      padding: 10px 9px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 74px;
      position: relative;
      overflow: hidden;
      transition: all 0.25s var(--ease);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .hub-tile:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%);
    }
    .hub-tile.primary:hover {
      border-color: rgba(232, 255, 31, 0.4);
      box-shadow: 0 4px 16px -2px rgba(232, 255, 31, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
    }
    .hub-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .hub-badge {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 1px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--t2);
    }
    .hub-tile.primary .hub-badge {
      background: rgba(232, 255, 31, 0.15);
      color: var(--acc);
    }
    .icon-bubble {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      transition: transform 0.2s ease;
    }
    .hub-tile:hover .icon-bubble {
      transform: scale(1.1) rotate(4deg);
    }
    .hub-title {
      font-weight: 700;
      font-size: 11.5px;
      color: var(--t1);
      letter-spacing: -0.01em;
      margin-top: 2px;
    }
    .hub-sub {
      font-size: 9.5px;
      color: var(--t3);
      line-height: 1.2;
      margin-top: 2px;
    }

    /* CARD HEADERS & EYEBROWS */
    .card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .eyebrow {
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--t3);
    }
    .tag {
      font-size: 9px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--t2);
    }

    /* TOKENMAXXING METRICS */
    .mono { font-family: var(--font-mono); }
    .hero-metric {
      font-size: 1.65rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--t1);
      line-height: 1.1;
      margin: 4px 0 8px;
      text-shadow: 0 0 20px rgba(232, 255, 31, 0.1);
    }
    .segmented-ratio-bar {
      display: flex;
      height: 6px;
      width: 100%;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.06);
      margin-bottom: 8px;
    }
    .ratio-cache { background: var(--emerald); transition: width 0.4s var(--ease); }
    .ratio-in { background: #ffffff; transition: width 0.4s var(--ease); }
    .ratio-out { background: var(--acc); transition: width 0.4s var(--ease); }

    .micro-legend {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--t2);
    }
    .micro-legend span { display: inline-flex; align-items: center; gap: 4px; }
    .micro-legend i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }

    /* SESSION TIMER & 24H RESILIENCE */
    .timer-wrap {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin: 2px 0 8px;
    }
    .clock-num {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--acc);
      text-shadow: 0 0 15px rgba(232, 255, 31, 0.25);
    }
    .ctrl-strip {
      display: flex;
      gap: 6px;
    }
    .action-btn {
      flex: 1;
      padding: 7px 10px;
      border-radius: 9px;
      border: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.05);
      color: var(--t1);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      outline: none;
      transition: all 0.2s var(--ease);
    }
    .action-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .action-btn.primary {
      background: rgba(232, 255, 31, 0.1);
      border-color: rgba(232, 255, 31, 0.35);
      color: var(--acc);
    }
    .action-btn.primary:hover {
      background: rgba(232, 255, 31, 0.2);
      border-color: var(--acc);
    }

    /* ACTIVE AGENT RADAR */
    .radar-box {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(232, 255, 31, 0.05);
      border: 1px solid rgba(232, 255, 31, 0.2);
      margin-top: 4px;
    }
    .radar-pulse {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: var(--acc);
      box-shadow: 0 0 10px var(--acc);
      animation: pulseAnim 2s infinite ease-in-out;
    }
    @keyframes pulseAnim {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    /* MODEL DISTRIBUTION */
    .model-item {
      margin-top: 7px;
    }
    .model-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 3px;
    }
    .model-progress {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }
    .model-fill {
      height: 100%;
      border-radius: 2px;
    }

    /* FOOTER STATUS */
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      margin-top: 8px;
      font-size: 10px;
      color: var(--t3);
    }
    .footer-link {
      color: var(--t2);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 10.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .footer-link:hover { color: var(--acc); }
  </style>
</head>
<body>

  <!-- TOP HEADER -->
  <div class="top-header">
    <div class="brand-mark">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="12 2 22 18 2 18" />
        <polygon points="12 7 17 15 7 15" fill="currentColor" opacity="0.3" />
      </svg>
      <span>Antigravity Telemetry</span>
    </div>
    <div class="live-pill" id="sideStatusBadge">
      <span class="live-dot"></span>
      <span id="sideStatusText">Live SSE</span>
    </div>
  </div>

  <!-- DUAL DASHBOARD ACCESS HUB (IN-IDE + BROWSER) -->
  <div class="hub-grid">
    <div class="hub-tile primary" id="btnOpenFull" onclick="openFullDashboard()" title="Open the full interactive Bento dashboard as an editor tab inside Antigravity IDE">
      <div class="hub-header">
        <span class="hub-badge">EDITOR TAB</span>
        <span class="icon-bubble">⚡</span>
      </div>
      <div>
        <div class="hub-title">In-IDE Studio</div>
        <div class="hub-sub">Bento metrics panel</div>
      </div>
    </div>
    <div class="hub-tile" id="btnOpenBrowser" onclick="openBrowserDashboard()" title="Launch full companion dashboard at http://127.0.0.1:41177 in your web browser">
      <div class="hub-header">
        <span class="hub-badge">127.0.0.1</span>
        <span class="icon-bubble">↗</span>
      </div>
      <div>
        <div class="hub-title">Web Browser</div>
        <div class="hub-sub">Chrome / Edge / Brave</div>
      </div>
    </div>
  </div>

  <!-- 1. HERO TOKENMAXXING TILE -->
  <div class="bezel">
    <div class="core">
      <div class="core-ambient-glow"></div>
      <div class="card-top">
        <span class="eyebrow">SESSION TOKEN VOLUME</span>
        <span class="tag" style="color:var(--acc); border-color:rgba(232,255,31,0.3);">⚡ TOKENMAXXING</span>
      </div>
      <div class="hero-metric mono" id="sideTotalTokens">${formatNumber(totalTokens)}</div>

      <!-- Segmented Distribution Ratio Bar -->
      <div class="segmented-ratio-bar">
        <div class="ratio-cache" id="barCache" style="width: ${cacheBarRatio}%;"></div>
        <div class="ratio-in" id="barIn" style="width: ${inRatio}%;"></div>
        <div class="ratio-out" id="barOut" style="width: ${outRatio}%;"></div>
      </div>

      <div class="micro-legend">
        <span><i style="background:var(--emerald);"></i> Cache: <b class="mono" id="sideCacheTokens">${formatNumber(cacheTokens)}</b></span>
        <span><i style="background:#ffffff;"></i> In: <b class="mono" id="sideInTokens">${formatNumber(inTokens)}</b></span>
        <span><i style="background:var(--acc);"></i> Out: <b class="mono" id="sideOutTokens">${formatNumber(outTokens)}</b></span>
      </div>

      <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:10.5px; color:var(--t3);">Prompt Cache Preserved</span>
        <span class="tag mono" style="color:var(--emerald); font-weight:700;" id="sideCacheRatio">${cacheRatio}% SAVINGS</span>
      </div>
    </div>
  </div>

  <!-- 2. SESSION CLOCK & 24H RESILIENCE -->
  <div class="bezel">
    <div class="core">
      <div class="card-top">
        <span class="eyebrow">ACTIVE SESSION DURATION</span>
        <span class="tag" id="sideRetentionChip" style="color:var(--emerald); border-color:rgba(16,185,129,0.3);">🛡️ 24H RESILIENT</span>
      </div>
      <div class="timer-wrap">
        <div class="clock-num mono" id="sideTimerDisplay">${timeFormatted}</div>
        <span class="tag" id="sideTimerStatus">ACTIVE</span>
      </div>
      <div class="ctrl-strip">
        <button class="action-btn primary" id="btnPause" onclick="togglePause()">
          <span id="btnPauseIcon">⏸️</span>
          <span id="btnPauseLabel">Pause & Leave (24h)</span>
        </button>
        <button class="action-btn" id="btnFresh" onclick="startFresh()">
          <span>🔄</span>
          <span>Fresh</span>
        </button>
      </div>
    </div>
  </div>

  <!-- 3. AI AGENT RADAR -->
  <div class="bezel">
    <div class="core">
      <div class="card-top">
        <span class="eyebrow">AGENT ACTIVITY RADAR</span>
        <span class="tag" id="sideAgentCountChip">${activeAgents.length} ACTIVE</span>
      </div>
      <div id="sideAgentContainer">
        ${
          isAgentActive
            ? `<div class="radar-box">
                <div class="radar-pulse"></div>
                <div style="flex:1; overflow:hidden;">
                  <div style="font-weight:700; font-size:11.5px; color:var(--t1); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">
                    ${activeAgent?.model ?? 'AI Agent'}
                  </div>
                  <div style="font-size:10px; color:var(--t2);">
                    ${activeAgent?.activeTool ? `Executing tool: ${activeAgent.activeTool}` : 'Thinking & Planning...'}
                  </div>
                </div>
              </div>`
            : `<div style="font-size:10.5px; color:var(--t3); padding:4px 0;">All agents standing by. Context and memory intact.</div>`
        }
      </div>
    </div>
  </div>

  <!-- 4. MODEL DISTRIBUTION ALLOCATION -->
  <div class="bezel">
    <div class="core">
      <div class="card-top">
        <span class="eyebrow">MODEL TOKEN SHARE</span>
        <span class="tag" id="sideModelCount">${models.length} MODELS</span>
      </div>
      <div id="sideModelList">
        ${
          models.length > 0
            ? models.slice(0, 4).map((m, idx) => {
                const share = totalTokens > 0 ? Math.round((m.tokens.totalTokens / totalTokens) * 100) : 0;
                const color = idx === 0 ? 'var(--acc)' : idx === 1 ? 'var(--lavender)' : idx === 2 ? 'var(--coral)' : 'var(--emerald)';
                return `<div class="model-item">
                  <div class="model-info">
                    <span style="font-weight:600; color:var(--t1);">${m.model}</span>
                    <span class="mono" style="color:var(--t2);">${formatNumber(m.tokens.totalTokens)} (${share}%)</span>
                  </div>
                  <div class="model-progress">
                    <div class="model-fill" style="width: ${share}%; background: ${color};"></div>
                  </div>
                </div>`;
              }).join('')
            : `<div style="font-size:10.5px; color:var(--t3); padding:4px 0;">No model tokens logged yet.</div>`
        }
      </div>
    </div>
  </div>

  <!-- FOOTER STATUS & RECONNECT -->
  <div class="footer-bar">
    <span id="footerWorkspaceText">1 Workspace connected</span>
    <button class="footer-link" onclick="reconnectDiscord()">
      <span>🔄 Reconnect RPC</span>
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
        document.getElementById('sideCacheRatio').innerText = ratio + '% SAVINGS';

        const inR = tot > 0 ? Math.max(1, Math.round((inTok / tot) * 100)) : 0;
        const outR = tot > 0 ? Math.max(1, Math.round((outTok / tot) * 100)) : 0;
        const cR = tot > 0 ? Math.max(0, 100 - inR - outR) : 0;

        const bC = document.getElementById('barCache');
        const bI = document.getElementById('barIn');
        const bO = document.getElementById('barOut');
        if (bC) bC.style.width = cR + '%';
        if (bI) bI.style.width = inR + '%';
        if (bO) bO.style.width = outR + '%';
      }

      if (snap.session && snap.session.startedAt) {
        startedAtIso = snap.session.startedAt;
        startTimer(startedAtIso, isPaused);
      }

      // Update Active Agents Radar
      const agents = snap.activeAgents || [];
      const countEl = document.getElementById('sideAgentCountChip');
      if (countEl) countEl.innerText = agents.length + ' ACTIVE';

      const agentBox = document.getElementById('sideAgentContainer');
      if (agentBox) {
        if (agents.length > 0) {
          const a = agents[0];
          agentBox.innerHTML = '<div class="radar-box">' +
            '<div class="radar-pulse"></div>' +
            '<div style="flex:1; overflow:hidden;">' +
            '<div style="font-weight:700; font-size:11.5px; color:var(--t1); white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">' + (a.model || 'AI Agent') + '</div>' +
            '<div style="font-size:10px; color:var(--t2);">' + (a.activeTool ? 'Executing tool: ' + a.activeTool : 'Thinking & Planning...') + '</div>' +
            '</div></div>';
        } else {
          agentBox.innerHTML = '<div style="font-size:10.5px; color:var(--t3); padding:4px 0;">All agents standing by. Context and memory intact.</div>';
        }
      }

      // Update Model Breakdown
      const models = snap.modelStats || [];
      const mListEl = document.getElementById('sideModelList');
      const mCountEl = document.getElementById('sideModelCount');
      if (mCountEl) mCountEl.innerText = models.length + ' MODELS';
      if (mListEl && models.length > 0) {
        const totTokens = tokens ? tokens.totalTokens : 1;
        mListEl.innerHTML = models.slice(0, 4).map(function(m, i) {
          const share = totTokens > 0 ? Math.round((m.tokens.totalTokens / totTokens) * 100) : 0;
          const color = i === 0 ? 'var(--acc)' : i === 1 ? 'var(--lavender)' : i === 2 ? 'var(--coral)' : 'var(--emerald)';
          return '<div class="model-item">' +
            '<div class="model-info">' +
            '<span style="font-weight:600; color:var(--t1);">' + m.model + '</span>' +
            '<span class="mono" style="color:var(--t2);">' + formatNumberJs(m.tokens.totalTokens) + ' (' + share + '%)</span>' +
            '</div>' +
            '<div class="model-progress">' +
            '<div class="model-fill" style="width:' + share + '%; background:' + color + ';"></div>' +
            '</div>' +
            '</div>';
        }).join('');
      }

      // Update Workspaces count
      const wsInfo = snap.workspaces;
      const wsEl = document.getElementById('footerWorkspaceText');
      if (wsEl) {
        const c = wsInfo && wsInfo.count ? wsInfo.count : 1;
        wsEl.innerText = c > 1 ? c + ' Workspaces active' : '1 Workspace active';
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
        if (label) label.innerText = 'Pause & Leave (24h)';
        if (status) status.innerText = 'ACTIVE';
        if (badge) {
          badge.style.color = 'var(--emerald)';
          badge.style.borderColor = 'rgba(16,185,129,0.3)';
          badge.innerText = '🛡️ 24H RESILIENT';
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
