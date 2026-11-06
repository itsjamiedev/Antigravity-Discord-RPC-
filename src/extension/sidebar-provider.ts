/**
 * SidebarDashboardProvider — Elite Native Activity Bar Sidebar Dashboard for Antigravity IDE
 *
 * Implements vscode.WebviewViewProvider to render real-time agent telemetry,
 * compact Bento grid metrics, model consumption share, and dual-dashboard access (In-IDE & Browser)
 * with zero generic emojis, agency-grade Linear/Apple dark aesthetics, and resilient multi-window sync.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type * as vscode from 'vscode';
import type { TrackerSnapshot, ModelStats, TokenUsageRecord, Agent } from '../shared/types.js';
import { getGroundTruthConversationStatuses } from './agent-watcher.js';
import { formatModelDisplayName } from '../discord/presence-manager.js';

export function formatNumber(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
  return n.toLocaleString('en-US');
}

export function formatCompactNumber(n: number): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n === 0) return '0';
  if (n >= 1_000_000_000) {
    return (n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 1 : 2) + 'B';
  }
  if (n >= 1_000_000) {
    return (n / 1_000_000).toFixed(n >= 100_000_000 ? 0 : 1) + 'M';
  }
  if (n >= 1_000) {
    return (n / 1_000).toFixed(1) + 'K';
  }
  return String(Math.round(n));
}

export function formatDuration(elapsedSec: number): string {
  const hrs = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  const pad = (v: number) => (v < 10 ? '0' + v : String(v));
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function loadDiskFallbackSnapshot(): TrackerSnapshot | null {
  try {
    const baseDir = path.join(os.homedir(), '.gemini', 'antigravity');
    const sessionFile = path.join(baseDir, 'presence-session.json');
    const tokensFile = path.join(baseDir, 'presence-tokens.json');

    let startedAt = new Date().toISOString();
    let isPaused = false;
    let sessionId = 'session-fallback';
    let sessionTokens: TokenUsageRecord = {
      inputTokens: 0,
      cacheReadTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimated: false,
      source: 'transcript_exact',
    };
    let initialLifetimeTokens: number | undefined;

    if (fs.existsSync(sessionFile)) {
      try {
        const sessData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        if (sessData && sessData.startedAt) {
          startedAt = sessData.startedAt;
          isPaused = Boolean(sessData.isPaused);
          sessionId = sessData.sessionId || sessionId;
          if (sessData.sessionTokens) {
            sessionTokens = sessData.sessionTokens;
          }
          if (typeof sessData.initialLifetimeTokens === 'number') {
            initialLifetimeTokens = sessData.initialLifetimeTokens;
          }
        }
      } catch {}
    }

    let inputTokens = 0;
    let cacheReadTokens = 0;
    let outputTokens = 0;
    let totalTokens = 0;
    const modelStats: ModelStats[] = [];

    if (fs.existsSync(tokensFile)) {
      try {
        const tokData = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
        if (tokData && tokData.cumulativeTokensByModel) {
          for (const [rawModel, mTokens] of Object.entries(
            tokData.cumulativeTokensByModel as Record<string, TokenUsageRecord>
          )) {
            if (!mTokens) continue;
            const model = formatModelDisplayName(rawModel);
            inputTokens += mTokens.inputTokens || 0;
            cacheReadTokens += mTokens.cacheReadTokens || 0;
            outputTokens += mTokens.outputTokens || 0;
            totalTokens += mTokens.totalTokens || 0;

            modelStats.push({
              model,
              conversationCount: 1,
              invocationCount: 1,
              toolCallCount: 0,
              errorCount: 0,
              tokens: {
                inputTokens: mTokens.inputTokens || 0,
                cacheReadTokens: mTokens.cacheReadTokens || 0,
                outputTokens: mTokens.outputTokens || 0,
                totalTokens: mTokens.totalTokens || 0,
                estimated: false,
                source: 'transcript_exact',
              },
              lastUsedAt: tokData.lastSavedAt || new Date().toISOString(),
            });
          }
        }
      } catch {}
    }

    modelStats.sort((a, b) => b.tokens.totalTokens - a.tokens.totalTokens);

    if (
      sessionTokens.totalTokens === 0 &&
      initialLifetimeTokens !== undefined &&
      totalTokens > initialLifetimeTokens
    ) {
      const diff = totalTokens - initialLifetimeTokens;
      sessionTokens.totalTokens = diff;
      sessionTokens.outputTokens = diff;
    }

    // Discover ground-truth running agents from conversation_summaries.db
    const runningAgents: Agent[] = [];
    try {
      const runningMap = getGroundTruthConversationStatuses();
      for (const [convId, status] of runningMap.entries()) {
        if (status === 'CASCADE_RUN_STATUS_RUNNING') {
          runningAgents.push({
            conversationId: convId,
            model: 'Gemini 3.8 Flash',
            status: 'thinking',
            statusEstimated: false,
            activeTool: null,
            startedAt: new Date().toISOString(),
            lastEventAt: new Date().toISOString(),
            lastEventType: 'SessionStart',
            parentConversationId: null,
            isSubagent: false,
            hasError: false,
          });
        }
      }
    } catch {}

    const tokenRec: TokenUsageRecord = {
      inputTokens,
      cacheReadTokens,
      outputTokens,
      totalTokens,
      estimated: false,
      source: 'transcript_exact',
    };

    return {
      session: {
        sessionId,
        startedAt,
        lastActivityAt: new Date().toISOString(),
        activeAgentCount: runningAgents.length,
        totalConversations: 0,
        totalEventsProcessed: 0,
        tokens: tokenRec,
        sessionTokens,
        lifetimeTokens: tokenRec,
      },
      sessionTokens,
      lifetimeTokens: tokenRec,
      agents: runningAgents,
      activeAgents: runningAgents,
      conversations: [],
      modelStats,
      dailyUsage: [],
    };
  } catch {
    return null;
  }
}

export function getSidebarHtml(snapshot?: TrackerSnapshot | null): string {
  const diskFallback = loadDiskFallbackSnapshot();

  const effective = {
    ...(diskFallback ?? {}),
    ...(snapshot ?? {}),
    session: {
      ...(diskFallback?.session ?? {}),
      ...(snapshot?.session ?? {}),
      tokens:
        (snapshot?.session?.tokens?.totalTokens ?? 0) > 0
          ? snapshot!.session.tokens
          : (diskFallback?.session.tokens ?? {
              inputTokens: 0,
              cacheReadTokens: 0,
              outputTokens: 0,
              totalTokens: 0,
              estimated: false,
              source: 'transcript_exact' as const,
            }),
      startedAt:
        snapshot?.session?.startedAt && snapshot.session.startedAt !== snapshot.session.lastActivityAt
          ? snapshot.session.startedAt
          : (diskFallback?.session.startedAt ?? new Date().toISOString()),
    },
    activeAgents:
      snapshot?.activeAgents && snapshot.activeAgents.length > 0
        ? snapshot.activeAgents
        : (diskFallback?.activeAgents ?? []),
    modelStats:
      snapshot?.modelStats && snapshot.modelStats.length > 0
        ? snapshot.modelStats
        : (diskFallback?.modelStats ?? []),
  };

  const tokens = effective.session.tokens;
  const totalTokens = tokens?.totalTokens ?? 0;
  const cacheTokens = tokens?.cacheReadTokens ?? 0;
  const inTokens = tokens?.inputTokens ?? 0;
  const outTokens = tokens?.outputTokens ?? 0;

  const sessionTokRecord =
    effective.session?.sessionTokens ??
    snapshot?.sessionTokens ??
    diskFallback?.sessionTokens;
  const sessionTokens = sessionTokRecord?.totalTokens ?? 0;

  const cacheRatio =
    inTokens + cacheTokens > 0 ? Math.round((cacheTokens / (inTokens + cacheTokens)) * 100) : 0;

  const inRatio = totalTokens > 0 ? Math.max(1, Math.round((inTokens / totalTokens) * 100)) : 0;
  const outRatio = totalTokens > 0 ? Math.max(1, Math.round((outTokens / totalTokens) * 100)) : 0;
  const cacheBarRatio = totalTokens > 0 ? Math.max(0, 100 - inRatio - outRatio) : 0;

  const models = effective.modelStats ?? [];
  const activeAgents = effective.activeAgents ?? [];
  const isAgentActive = activeAgents.length > 0;
  const activeAgent = activeAgents[0];

  const startedAt = effective.session.startedAt ?? new Date().toISOString();
  const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  const timeFormatted = formatDuration(elapsedSec);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src http://127.0.0.1:* http://localhost:* ws:; img-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Antigravity Telemetry</title>
  <style>
    :root {
      --bg: #070709;
      --card: #0c0c10;
      --card-inner: #111116;
      --border: rgba(255, 255, 255, 0.08);
      --border-hover: rgba(232, 255, 31, 0.3);
      --acc: #E8FF1F;
      --acc-glow: rgba(232, 255, 31, 0.15);
      --emerald: #10b981;
      --lavender: #a9b2ff;
      --cyan: #38bdf8;
      --coral: #ffb37a;
      --t1: #ffffff;
      --t2: rgba(255, 255, 255, 0.68);
      --t3: rgba(255, 255, 255, 0.38);
      --ease: cubic-bezier(0.32, 0.72, 0, 1);
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--t1);
      font-family: var(--font-sans);
      font-size: 11.5px;
      line-height: 1.4;
      padding: 8px 6px 16px;
      overflow-x: hidden;
      user-select: none;
      -webkit-font-smoothing: antialiased;
    }

    /* TOP BAR */
    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 2px 2px 8px;
      margin-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .brand-mark {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: -0.02em;
      color: var(--t1);
    }
    .brand-mark svg {
      color: var(--acc);
      filter: drop-shadow(0 0 5px rgba(232, 255, 31, 0.5));
    }
    .live-pill {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 2px 6px;
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

    /* BENTO CARD CONTAINER */
    .bento-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 9px 10px;
      margin-bottom: 7px;
      position: relative;
      overflow: hidden;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease);
    }
    .bento-card:hover {
      border-color: rgba(255, 255, 255, 0.16);
    }
    .bento-card.hero-card:hover {
      border-color: var(--border-hover);
      box-shadow: 0 4px 18px -4px rgba(232, 255, 31, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    /* CARD HEADER & EYEBROW */
    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .eyebrow {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--t3);
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .eyebrow svg {
      opacity: 0.7;
    }
    .chip {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.03em;
      padding: 1px 5px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.04);
      color: var(--t2);
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    /* DUAL STUDIO HUB (IN-IDE + BROWSER) */
    .hub-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 7px;
    }
    .hub-tile {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 7px 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 52px;
      position: relative;
      overflow: hidden;
      transition: all 0.2s var(--ease);
    }
    .hub-tile:hover {
      border-color: rgba(255, 255, 255, 0.22);
      background: var(--card-inner);
      transform: translateY(-1px);
    }
    .hub-tile.primary:hover {
      border-color: rgba(232, 255, 31, 0.4);
      box-shadow: 0 4px 12px -2px rgba(232, 255, 31, 0.15);
    }
    .hub-tile-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .hub-badge {
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--t3);
    }
    .hub-tile.primary .hub-badge {
      background: rgba(232, 255, 31, 0.12);
      color: var(--acc);
    }
    .hub-title {
      font-weight: 700;
      font-size: 11px;
      color: var(--t1);
      margin-top: 2px;
      letter-spacing: -0.01em;
    }
    .hub-sub {
      font-size: 9px;
      color: var(--t3);
    }

    /* 2-COLUMN SPLIT BENTO (SESSION + RADAR) */
    .split-bento-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 7px;
    }
    .split-tile {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 11px;
      padding: 8px 8px 7px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 84px;
    }
    .clock-display {
      font-size: 1.15rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--acc);
      margin: 2px 0 6px;
      text-shadow: 0 0 10px rgba(232, 255, 31, 0.2);
    }
    .clock-actions {
      display: flex;
      gap: 4px;
    }
    .micro-btn {
      flex: 1;
      padding: 4px 6px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.05);
      color: var(--t2);
      font-size: 9.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      outline: none;
      transition: all 0.18s var(--ease);
    }
    .micro-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--t1);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .micro-btn.primary {
      background: rgba(232, 255, 31, 0.08);
      border-color: rgba(232, 255, 31, 0.28);
      color: var(--acc);
    }
    .micro-btn.primary:hover {
      background: rgba(232, 255, 31, 0.18);
      border-color: var(--acc);
    }

    /* RADAR ACTIVE AGENT BOX */
    .radar-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin-top: 3px;
    }
    .agent-active-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 11px;
      color: var(--t1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .radar-sonar-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--acc);
      box-shadow: 0 0 8px var(--acc);
      flex-shrink: 0;
      animation: sonarPulse 1.8s infinite ease-in-out;
    }
    .radar-sonar-dot.idle {
      background: var(--t3);
      box-shadow: none;
      animation: none;
    }
    @keyframes sonarPulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.6; }
    }
    .agent-tool-text {
      font-size: 9px;
      color: var(--t2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* HERO TOKEN VOLUME */
    .hero-tokens {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--t1);
      margin: 3px 0 6px;
    }
    .ratio-bar {
      height: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      overflow: hidden;
      margin-bottom: 7px;
    }
    .ratio-fill-cache { background: var(--emerald); }
    .ratio-fill-in { background: #ffffff; }
    .ratio-fill-out { background: var(--acc); }

    .micro-stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4px;
      font-size: 9.5px;
    }
    .micro-stat-col {
      display: flex;
      flex-direction: column;
    }
    .micro-stat-label {
      color: var(--t3);
      font-size: 8.5px;
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .micro-stat-label i {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      display: inline-block;
    }
    .micro-stat-val {
      font-weight: 700;
      color: var(--t2);
      margin-top: 1px;
    }

    /* MODEL SHARE BENTO */
    .model-row {
      margin-top: 6px;
    }
    .model-meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .model-name {
      font-weight: 600;
      color: var(--t1);
      max-width: 140px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .model-stat-num {
      color: var(--t2);
    }
    .model-bar-wrap {
      height: 3px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.07);
      overflow: hidden;
    }
    .model-bar-fill {
      height: 100%;
      border-radius: 2px;
    }

    /* FOOTER BAR */
    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 2px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      margin-top: 4px;
      font-size: 9.5px;
      color: var(--t3);
    }
    .reconnect-btn {
      color: var(--t2);
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 9.5px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.15s ease;
    }
    .reconnect-btn:hover {
      color: var(--acc);
    }

    .mono { font-family: var(--font-mono); }
  </style>
</head>
<body>

  <!-- TOP HEADER -->
  <div class="top-header">
    <div class="brand-mark">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 22 18 2 18" />
        <polygon points="12 7 17 15 7 15" fill="currentColor" opacity="0.3" />
      </svg>
      <span>Antigravity Telemetry</span>
    </div>
    <div class="live-pill" id="sideStatusBadge">
      <span class="live-dot"></span>
      <span id="sideStatusText">Live Synced</span>
    </div>
  </div>

  <!-- DUAL DASHBOARD ACCESS HUB (IN-IDE + BROWSER) -->
  <div class="hub-grid">
    <div class="hub-tile primary" id="btnOpenFull" onclick="openFullDashboard()" title="Open interactive Bento dashboard as an editor tab inside Antigravity IDE">
      <div class="hub-tile-head">
        <span class="hub-badge">EDITOR TAB</span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="2.5"/>
          <path d="M8 2v12"/>
        </svg>
      </div>
      <div>
        <div class="hub-title">In-IDE Studio</div>
        <div class="hub-sub">Bento metrics panel</div>
      </div>
    </div>
    <div class="hub-tile" id="btnOpenBrowser" onclick="openBrowserDashboard()" title="Launch companion dashboard at http://127.0.0.1:41177 in your browser">
      <div class="hub-tile-head">
        <span class="hub-badge">127.0.0.1</span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 2h4v4M6.5 9.5L14 2M14 8.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4.5"/>
        </svg>
      </div>
      <div>
        <div class="hub-title">Web Browser</div>
        <div class="hub-sub">Chrome / Edge / Brave</div>
      </div>
    </div>
  </div>

  <!-- 2-COLUMN SPLIT BENTO (SESSION DURATION + ACTIVE AGENT RADAR) -->
  <div class="split-bento-grid">
    <!-- Tile A: Session Duration & Clock Controls -->
    <div class="split-tile">
      <div>
        <div class="card-head" style="margin-bottom:0;">
          <span class="eyebrow">
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <circle cx="8" cy="8" r="6.2"/>
              <path d="M8 4.5V8l2.5 1.5"/>
            </svg>
            SESSION
          </span>
          <span class="chip mono" id="sideTimerStatus">RUNNING</span>
        </div>
        <div class="clock-display mono" id="sideTimerDisplay">${timeFormatted}</div>
      </div>
      <div class="clock-actions">
        <button class="micro-btn primary" id="btnPause" onclick="togglePause()">
          <span id="btnPauseIcon">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
              <rect x="4" y="3" width="2.8" height="10" rx="1.2"/>
              <rect x="9.2" y="3" width="2.8" height="10" rx="1.2"/>
            </svg>
          </span>
          <span id="btnPauseLabel">Pause</span>
        </button>
        <button class="micro-btn" id="btnFresh" onclick="startFresh()" title="Start fresh session">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9L14 6m0-4v4h-4M13.5 8a5.5 5.5 0 0 1-9.4 3.9L2 10m0 4v-4h4"/>
          </svg>
          <span>Fresh</span>
        </button>
      </div>
    </div>

    <!-- Tile B: Active Agent Radar -->
    <div class="split-tile">
      <div class="card-head" style="margin-bottom:0;">
        <span class="eyebrow">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
            <path d="M8 1.5l1.6 4.9 4.9 1.6-4.9 1.6L8 14.5l-1.6-4.9-4.9-1.6 4.9-1.6L8 1.5z"/>
          </svg>
          AGENTS
        </span>
        <span class="chip mono" id="sideAgentCountChip">${activeAgents.length} ACTIVE</span>
      </div>
      <div class="radar-content" id="sideAgentContainer">
        ${
          isAgentActive
            ? `<div class="agent-active-badge">
                <span class="radar-sonar-dot"></span>
                <span>${activeAgent?.model ?? 'AI Agent'}</span>
              </div>
              <div class="agent-tool-text">
                ${activeAgent?.activeTool ? `Tool: ${activeAgent.activeTool}` : 'Thinking & Planning...'}
              </div>`
            : `<div class="agent-active-badge">
                <span class="radar-sonar-dot idle"></span>
                <span style="color:var(--t2);">Standing By</span>
              </div>
              <div class="agent-tool-text">Context intact</div>`
        }
      </div>
      <div style="font-size:8.5px; color:var(--t3); margin-top:4px;">Auto-broadcasting</div>
    </div>
  </div>

  <!-- HERO TOKEN VOLUME BENTO CARD -->
  <div class="bento-card hero-card">
    <div class="card-head">
      <span class="eyebrow">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <ellipse cx="8" cy="4" rx="6" ry="2.2"/>
          <path d="M2 4v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V4M2 8v4c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V8"/>
        </svg>
        TOKEN VOLUME
      </span>
      <span class="chip mono" style="color:var(--emerald); border-color:rgba(16,185,129,0.3);" id="sideCacheRatio">${cacheRatio}% SAVED</span>
    </div>

    <div style="display:flex; align-items:baseline; justify-content:space-between; margin: 3px 0 6px;">
      <div class="hero-tokens mono" id="sideTotalTokens" style="margin:0;">${formatNumber(totalTokens)}</div>
      <div class="mono" id="sideSessionTokens" style="font-size:11px; font-weight:700; color:var(--acc);">${formatCompactNumber(sessionTokens)} session</div>
    </div>

    <!-- Segmented Cache Ratio Bar -->
    <div class="ratio-bar">
      <div class="ratio-fill-cache" id="barCache" style="width: ${cacheBarRatio}%;"></div>
      <div class="ratio-fill-in" id="barIn" style="width: ${inRatio}%;"></div>
      <div class="ratio-fill-out" id="barOut" style="width: ${outRatio}%;"></div>
    </div>

    <!-- 3-Column Micro Stats -->
    <div class="micro-stats-row mono">
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:var(--emerald);"></i> Cache</span>
        <span class="micro-stat-val" id="sideCacheTokens">${formatCompactNumber(cacheTokens)}</span>
      </div>
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:#ffffff;"></i> In</span>
        <span class="micro-stat-val" id="sideInTokens">${formatCompactNumber(inTokens)}</span>
      </div>
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:var(--acc);"></i> Out</span>
        <span class="micro-stat-val" id="sideOutTokens">${formatCompactNumber(outTokens)}</span>
      </div>
    </div>
  </div>

  <!-- MODEL TOKEN ALLOCATION BENTO CARD -->
  <div class="bento-card">
    <div class="card-head">
      <span class="eyebrow">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <circle cx="8" cy="8" r="6"/>
          <path d="M8 2a6 6 0 0 1 6 6H8V2z"/>
        </svg>
        MODEL SHARE
      </span>
      <span class="chip mono" id="sideModelCount">${models.length} MODELS</span>
    </div>

    <div id="sideModelList">
      ${
        models.length > 0
          ? models
              .slice(0, 4)
              .map((m, idx) => {
                const share = totalTokens > 0 ? Math.round((m.tokens.totalTokens / totalTokens) * 100) : 0;
                const color =
                  idx === 0
                    ? 'var(--acc)'
                    : idx === 1
                      ? 'var(--cyan)'
                      : idx === 2
                        ? 'var(--lavender)'
                        : 'var(--coral)';
                return `<div class="model-row">
                  <div class="model-meta">
                    <span class="model-name">${m.model}</span>
                    <span class="model-stat-num mono">${formatCompactNumber(m.tokens.totalTokens)} (${share}%)</span>
                  </div>
                  <div class="model-bar-wrap">
                    <div class="model-bar-fill" style="width: ${share}%; background: ${color};"></div>
                  </div>
                </div>`;
              })
              .join('')
          : `<div style="font-size:10px; color:var(--t3); padding:4px 0;">No model tokens logged yet.</div>`
      }
    </div>
  </div>

  <!-- FOOTER STATUS & RECONNECT -->
  <div class="footer-bar">
    <span id="footerWorkspaceText">1 Workspace active</span>
    <button class="reconnect-btn" onclick="reconnectDiscord()" title="Reconnect Discord RPC">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 8a7 7 0 1 1 12 5M15 8A7 7 0 0 1 3 3"/>
        <path d="M15 3v5h-5M1 13V8h5"/>
      </svg>
      <span>Reconnect RPC</span>
    </button>
  </div>

  <script>
    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
    let isPaused = false;
    let startedAtIso = "${startedAt}";
    let timerInterval = null;
    let hasReceivedUpdate = false;

    function formatNumberJs(n) {
      if (typeof n !== 'number' || !Number.isFinite(n)) return '0';
      return n.toLocaleString('en-US');
    }

    function formatCompactJs(n) {
      if (typeof n !== 'number' || !Number.isFinite(n) || n === 0) return '0';
      if (n >= 1000000000) return (n / 1000000000).toFixed(n >= 10000000000 ? 1 : 2) + 'B';
      if (n >= 1000000) return (n / 1000000).toFixed(n >= 100000000 ? 0 : 1) + 'M';
      if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
      return String(Math.round(n));
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
      hasReceivedUpdate = true;

      const badge = document.getElementById('sideStatusText');
      if (badge && (badge.innerText === 'Connecting...' || badge.innerText === 'Initializing')) {
        badge.innerText = 'Live Synced';
      }

      const tokens = snap.session ? snap.session.tokens : null;
      if (tokens && tokens.totalTokens > 0) {
        const tot = tokens.totalTokens || 0;
        const cTok = tokens.cacheReadTokens || 0;
        const inTok = tokens.inputTokens || 0;
        const outTok = tokens.outputTokens || 0;
        const ratio = inTok + cTok > 0 ? Math.round((cTok / (inTok + cTok)) * 100) : 0;

        document.getElementById('sideTotalTokens').innerText = formatNumberJs(tot);
        document.getElementById('sideCacheTokens').innerText = formatCompactJs(cTok);
        document.getElementById('sideInTokens').innerText = formatCompactJs(inTok);
        document.getElementById('sideOutTokens').innerText = formatCompactJs(outTok);
        document.getElementById('sideCacheRatio').innerText = ratio + '% SAVED';

        const sessionTok = (snap.session && snap.session.sessionTokens)
          ? snap.session.sessionTokens.totalTokens
          : (snap.sessionTokens ? snap.sessionTokens.totalTokens : 0);
        const sEl = document.getElementById('sideSessionTokens');
        if (sEl) sEl.innerText = formatCompactJs(sessionTok) + ' session';

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
          agentBox.innerHTML =
            '<div class="agent-active-badge">' +
            '<span class="radar-sonar-dot"></span>' +
            '<span>' + (a.model || 'AI Agent') + '</span>' +
            '</div>' +
            '<div class="agent-tool-text">' +
            (a.activeTool ? 'Tool: ' + a.activeTool : 'Thinking & Planning...') +
            '</div>';
        } else {
          agentBox.innerHTML =
            '<div class="agent-active-badge">' +
            '<span class="radar-sonar-dot idle"></span>' +
            '<span style="color:var(--t2);">Standing By</span>' +
            '</div>' +
            '<div class="agent-tool-text">Context intact</div>';
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
          const color = i === 0 ? 'var(--acc)' : i === 1 ? 'var(--cyan)' : i === 2 ? 'var(--lavender)' : 'var(--coral)';
          return '<div class="model-row">' +
            '<div class="model-meta">' +
            '<span class="model-name">' + m.model + '</span>' +
            '<span class="model-stat-num mono">' + formatCompactJs(m.tokens.totalTokens) + ' (' + share + '%)</span>' +
            '</div>' +
            '<div class="model-bar-wrap">' +
            '<div class="model-bar-fill" style="width:' + share + '%; background:' + color + ';"></div>' +
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
          if (badge && !hasReceivedUpdate) {
            badge.innerText = 'Connecting...';
          }
          try { es.close(); } catch {}
          setTimeout(initSSE, 4000);
        };
      } catch {
        setTimeout(initSSE, 4000);
      }
    }

    initSSE();

    // Listen for extension host messages
    window.addEventListener('message', function(event) {
      const msg = event.data;
      if (msg && msg.type === 'update') {
        updateFromSnapshot(msg.snapshot);
      }
    });

    // Request latest state immediately from Extension Host
    if (vscode) {
      vscode.postMessage({ command: 'requestState' });
    }

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

      if (isPaused) {
        if (icon) {
          icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.5v9l7.5-4.5L5 3.5z"/></svg>';
        }
        if (label) label.innerText = 'Resume';
        if (status) status.innerText = 'PAUSED';
        if (vscode) vscode.postMessage({ command: 'pauseSession' });
      } else {
        if (icon) {
          icon.innerHTML = '<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><rect x="4" y="3" width="2.8" height="10" rx="1.2"/><rect x="9.2" y="3" width="2.8" height="10" rx="1.2"/></svg>';
        }
        if (label) label.innerText = 'Pause';
        if (status) status.innerText = 'RUNNING';
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

  constructor(customVscode?: typeof vscode, initialSnapshot?: TrackerSnapshot | null) {
    this.customVscode = customVscode;
    this.currentSnapshot = initialSnapshot ?? null;
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

    const initial = this.currentSnapshot || loadDiskFallbackSnapshot();
    webviewView.webview.html = getSidebarHtml(initial);

    webviewView.webview.onDidReceiveMessage((message: { command: string }) => {
      switch (message.command) {
        case 'requestState':
          if (this.currentSnapshot) {
            void webviewView.webview.postMessage({
              type: 'update',
              snapshot: this.currentSnapshot,
            });
          } else {
            const fallback = loadDiskFallbackSnapshot();
            if (fallback) {
              void webviewView.webview.postMessage({
                type: 'update',
                snapshot: fallback,
              });
            }
          }
          break;
        case 'openFullDashboard':
          void this.getVscode().commands.executeCommand('antigravityPresence.openDashboardInIde');
          break;
        case 'openBrowserDashboard':
          void this.getVscode().commands.executeCommand('antigravityPresence.openDashboard');
          break;
        case 'pauseSession':
          void this.getVscode().commands.executeCommand('antigravityPresence.pauseAndLeaveSession');
          break;
        case 'resumeSession':
          void this.getVscode().commands.executeCommand('antigravityPresence.resumePreviousSession');
          break;
        case 'startFreshSession':
          void this.getVscode().commands.executeCommand('antigravityPresence.startFreshSession');
          break;
        case 'reconnectDiscord':
          void this.getVscode().commands.executeCommand('antigravityPresence.reconnectDiscord');
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
