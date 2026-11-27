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
import type { TrackerSnapshot, ModelStats, TokenUsageRecord, Agent, TimeBreakdown } from '../shared/types.js';
import { getGroundTruthConversationStatuses } from './agent-watcher.js';
import { formatLifetimeHours, formatModelDisplayName } from '../discord/presence-manager.js';
import { getMascotCss, getMascotSfxJs, getMascotSvgHtml } from '../shared/mascot-rig.js';
import { getSidebarThemeCss, getSidebarHeroHtml } from './sidebar-hero.js';
import { getSidebarTimelineAndTokensHtml } from './sidebar-timeline.js';
import { getSidebarProfileAndTabsHtml } from './sidebar-profile.js';

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
    const timeFile = path.join(baseDir, 'presence-time.json');

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
    let lifetimeActiveSeconds = 0;

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
          if (typeof sessData.lifetimeActiveSeconds === 'number') {
            lifetimeActiveSeconds = sessData.lifetimeActiveSeconds;
          } else if (typeof sessData.elapsedSeconds === 'number') {
            lifetimeActiveSeconds = sessData.elapsedSeconds;
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

    let timeBreakdown: TimeBreakdown = {
      last24h: 0,
      weekly: lifetimeActiveSeconds,
      monthly: lifetimeActiveSeconds,
      yearly: lifetimeActiveSeconds,
      overall: lifetimeActiveSeconds,
    };

    if (fs.existsSync(timeFile)) {
      try {
        const tData = JSON.parse(fs.readFileSync(timeFile, 'utf8'));
        if (tData && typeof tData.overallActiveSeconds === 'number') {
          lifetimeActiveSeconds = Math.max(lifetimeActiveSeconds, tData.overallActiveSeconds);
          const now = Date.now();
          let last24h = 0;
          if (tData.hourlyActiveSeconds && typeof tData.hourlyActiveSeconds === 'object') {
            for (let i = 0; i < 24; i++) {
              const d = new Date(now - i * 3600_000);
              const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`;
              last24h += Number(tData.hourlyActiveSeconds[k] || 0);
            }
          }
          const sumDays = (days: number) => {
            let s = 0;
            if (tData.dailyActiveSeconds && typeof tData.dailyActiveSeconds === 'object') {
              for (let i = 0; i < days; i++) {
                const d = new Date(now - i * 86400_000);
                const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
                s += Number(tData.dailyActiveSeconds[k] || 0);
              }
            }
            return s;
          };
          timeBreakdown = {
            last24h,
            weekly: Math.max(last24h, sumDays(7)),
            monthly: Math.max(last24h, sumDays(30)),
            yearly: Math.max(last24h, sumDays(365)),
            overall: lifetimeActiveSeconds,
          };
        }
      } catch {}
    }

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
        lifetimeActiveSeconds,
        timeBreakdown,
      },
      sessionTokens,
      lifetimeTokens: tokenRec,
      timeBreakdown,
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
  const tb =
    snapshot?.timeBreakdown ??
    snapshot?.session?.timeBreakdown ??
    diskFallback?.timeBreakdown ??
    diskFallback?.session?.timeBreakdown;
  const lifetimeActiveSecs =
    tb?.overall ??
    snapshot?.session?.lifetimeActiveSeconds ??
    diskFallback?.session?.lifetimeActiveSeconds ??
    0;
  const last24hSecs = tb?.last24h ?? Math.min(elapsedSec, lifetimeActiveSecs || elapsedSec);
  const lifetimeHoursFormatted = formatLifetimeHours(lifetimeActiveSecs);
  const last24hHoursFormatted = formatLifetimeHours(last24hSecs);

  const sideMascotState = isAgentActive
    ? activeAgent?.status === 'running_tool'
      ? 'working'
      : 'thinking'
    : 'idle';
  const sideMascotSvg = getMascotSvgHtml('side', 60, sideMascotState);
  const sideMascotCss = getMascotCss();
  const sideMascotSfx = getMascotSfxJs();

  const modelsHtml =
    models.length > 0
      ? models
          .slice(0, 4)
          .map((m, idx) => {
            const share = totalTokens > 0 ? Math.round((m.tokens.totalTokens / totalTokens) * 100) : 0;
            const color = idx === 0 ? '#14191A' : idx === 1 ? '#485452' : '#768481';
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
      : `<div style="font-size:10px; color:#6B7678; padding:4px 0;">No model tokens logged yet.</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src http://127.0.0.1:* http://localhost:* ws:; img-src https: data:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Antigravity Presence</title>
  <style>
    ${getSidebarThemeCss()}
    ${sideMascotCss}
  </style>
</head>
<body>
  ${getSidebarHeroHtml('Live Synced')}

  <div class="side-panel-view active" id="side-view-overview">
    ${getSidebarTimelineAndTokensHtml({
      timeFormatted,
      lifetimeHoursFormatted,
      last24hHoursFormatted,
      totalTokensFormatted: formatNumber(totalTokens),
      sessionTokensCompact: formatCompactNumber(sessionTokens),
      cacheRatio,
      cacheBarRatio,
      inRatio,
      outRatio,
      cacheCompact: formatCompactNumber(cacheTokens),
      inCompact: formatCompactNumber(inTokens),
      outCompact: formatCompactNumber(outTokens),
    })}
    ${getSidebarProfileAndTabsHtml({
      sideMascotSvg,
      sideMascotState,
      isAgentActive,
      activeAgentModel: activeAgent?.model ?? 'AI Agent',
      activeAgentTool: activeAgent?.activeTool ?? '',
      activeAgentsCount: activeAgents.length,
      modelsHtml,
      modelsCount: models.length,
    })}

  <script>
    ${sideMascotSfx}
    const vscode = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : null;
    let isPaused = false;
    let startedAtIso = "${startedAt}";
    let timerInterval = null;
    let hasReceivedUpdate = false;
    let currentCompanion = { enabled: true, mode: 'mascot', mascotBehavior: 'sit_corner' };

    function setSideMascotState(state, speech) {
      const rig = document.getElementById('mascot-rig-side');
      const badge = document.getElementById('sideMascotBadge');
      const sp = document.getElementById('sideMascotSpeech');
      if (rig) rig.setAttribute('data-state', state);
      if (badge) badge.innerText = state.charAt(0).toUpperCase() + state.slice(1);
      if (sp && speech) sp.innerText = speech;
    }

    function chirpSideMascot() {
      if (window.agMascotAudio) window.agMascotAudio.playWake();
      const rig = document.getElementById('mascot-rig-side');
      const prev = rig ? (rig.getAttribute('data-state') || 'idle') : 'idle';
      setSideMascotState('surprised', '"Antigravity Rig Ready"');
      setTimeout(function() {
        setSideMascotState(prev, prev === 'working' || prev === 'thinking' ? '"Agent Working..."' : '"Ready in Antigravity"');
      }, 950);
    }

    async function postSideCompanion(partial) {
      try {
        if (window.agMascotAudio) {
          if (partial.mode) window.agMascotAudio.playMorph();
          else window.agMascotAudio.playClick();
        }
        const res = await fetch('http://127.0.0.1:41177/api/companion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.companion) syncSideCompanionUi(json.companion);
        }
      } catch {}
    }

    function syncSideCompanionUi(comp) {
      if (!comp) return;
      currentCompanion = comp;
      const notchOn = comp.enabled !== false && comp.notchEnabled !== false;
      const chip = document.getElementById('sideCompModeChip');
      if (chip) chip.innerText = !comp.enabled ? 'Overlay Off' : (notchOn ? 'Notch Active' : 'Mascot Active');
      const btnN = document.getElementById('btnSideNotch');
      const lblN = document.getElementById('lblSideNotch');
      if (btnN && lblN) {
        btnN.classList.toggle('active', notchOn);
        lblN.innerText = notchOn ? 'Notch: On' : 'Toggle Notch';
      }
      const lblB = document.getElementById('lblSideBehavior');
      if (lblB) {
        const map = { 'sit_corner': 'Mascot: Corner', 'walk_follow': 'Mascot: Follow', 'sleep': 'Mascot: Sleep' };
        lblB.innerText = map[comp.mascotBehavior] || 'Mascot: Corner';
      }
    }

    function toggleSideNotch() {
      const curNotch = currentCompanion.enabled !== false && currentCompanion.notchEnabled !== false;
      postSideCompanion({ enabled: true, notchEnabled: !curNotch });
      if (vscode) vscode.postMessage({ command: 'toggleNotch' });
    }

    function cycleSideBehavior() {
      const order = ['sit_corner', 'walk_follow', 'sleep'];
      const next = order[(order.indexOf(currentCompanion.mascotBehavior) + 1) % order.length];
      postSideCompanion({ enabled: true, mode: 'mascot', mascotBehavior: next });
    }

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

    function formatLifetimeHoursJs(sec) {
      if (typeof sec !== 'number' || !isFinite(sec) || sec <= 0) return '0m';
      if (sec < 3600) {
        return Math.max(1, Math.floor(sec / 60)) + 'm';
      }
      return (sec / 3600).toFixed(1).replace(/\.0$/, '') + 'h';
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

    function switchSideTab(tabName, btn) {
      document.querySelectorAll('.hero-tab').forEach(function(b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      if (btn) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      }
      document.querySelectorAll('.side-panel-view').forEach(function(v) {
        v.classList.remove('active');
      });
      const target = document.getElementById('side-view-' + tabName);
      if (target) target.classList.add('active');
    }

    function updateFromSnapshot(snap) {
      if (!snap) return;
      hasReceivedUpdate = true;

      const badge = document.getElementById('sideStatusText');
      if (badge && (badge.innerText === 'Connecting...' || badge.innerText === 'Initializing')) {
        badge.innerText = 'Live Synced';
      }
      if (snap.discord && snap.discord.user && snap.discord.user.avatarUrl) {
        const av = document.getElementById('sideDiscordAvatar');
        if (av) {
          av.src = snap.discord.user.avatarUrl;
          av.title = snap.discord.user.globalName || snap.discord.user.username || 'Discord';
          av.style.display = 'block';
        }
        const pav = document.getElementById('sideProfileAvatar');
        if (pav) {
          pav.src = snap.discord.user.avatarUrl;
          pav.style.display = 'block';
        }
        const pname = document.getElementById('sideProfileName');
        if (pname) pname.innerText = snap.discord.user.globalName || snap.discord.user.username || 'Discord User';
        const psub = document.getElementById('sideProfileSub');
        if (psub) psub.innerText = snap.discord.connected ? 'Discord Connected' : 'Standby';
      }

      const tokens = (snap.session && snap.session.tokens && snap.session.tokens.totalTokens > 0)
        ? snap.session.tokens
        : (snap.lifetimeTokens && snap.lifetimeTokens.totalTokens > 0 ? snap.lifetimeTokens : (snap.session ? snap.session.tokens : null));

      if (tokens) {
        const tot = tokens.totalTokens || 0;
        const cTok = tokens.cacheReadTokens || 0;
        const inTok = tokens.inputTokens || 0;
        const outTok = tokens.outputTokens || 0;
        const ratio = inTok + cTok > 0 ? Math.round((cTok / (inTok + cTok)) * 100) : 0;

        const totEl = document.getElementById('sideTotalTokens');
        if (totEl) totEl.innerText = formatNumberJs(tot);
        const cEl = document.getElementById('sideCacheTokens');
        if (cEl) cEl.innerText = formatCompactJs(cTok);
        const inEl = document.getElementById('sideInTokens');
        if (inEl) inEl.innerText = formatCompactJs(inTok);
        const outEl = document.getElementById('sideOutTokens');
        if (outEl) outEl.innerText = formatCompactJs(outTok);
        const ratEl = document.getElementById('sideCacheRatio');
        if (ratEl) ratEl.innerText = ratio + '% SAVED';

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
      const tb = snap.timeBreakdown || (snap.session && snap.session.timeBreakdown);
      const lifeSecs = (tb && typeof tb.overall === 'number')
        ? tb.overall
        : (snap.session && typeof snap.session.lifetimeActiveSeconds === 'number' ? snap.session.lifetimeActiveSeconds : 0);
      const last24Secs = (tb && typeof tb.last24h === 'number') ? tb.last24h : lifeSecs;

      const lifeHoursEl = document.getElementById('sideLifetimeHours');
      if (lifeHoursEl) {
        lifeHoursEl.innerText = 'Overall: ' + formatLifetimeHoursJs(lifeSecs);
      }
      const b24El = document.getElementById('side24hHours');
      if (b24El) {
        b24El.innerText = '24H: ' + formatLifetimeHoursJs(last24Secs);
      }
      const bAllEl = document.getElementById('sideOverallBadge');
      if (bAllEl) {
        bAllEl.innerText = 'ALL: ' + formatLifetimeHoursJs(lifeSecs);
      }

      if (snap.dailyFocus) {
        const dfEl = document.getElementById('sideDailyFocus');
        if (dfEl) {
          const goalH = Math.round((snap.dailyFocus.goalSeconds || 21600) / 3600);
          dfEl.innerText = formatLifetimeHoursJs(snap.dailyFocus.todaySeconds) + ' / ' + goalH + 'h • ' + snap.dailyFocus.streakDays + 'd';
        }
      }

      if (snap.contextWindow) {
        const cw = snap.contextWindow;
        const cLbl = document.getElementById('sideCtxLabel');
        const cPct = document.getElementById('sideCtxPct');
        const cBar = document.getElementById('sideCtxBar');
        if (cLbl) cLbl.innerText = 'CTX: ' + formatCompactJs(cw.usedTokens) + ' / ' + formatCompactJs(cw.maxTokens);
        if (cPct) {
          cPct.innerText = cw.percentFull + '%' + (cw.isNearLimit ? ' !' : '');
          cPct.style.background = cw.isNearLimit ? '#FDECE8' : '#DCF291';
          cPct.style.color = cw.isNearLimit ? '#DC2626' : '#14191A';
        }
        if (cBar) {
          cBar.style.width = Math.min(100, Math.max(0, cw.percentFull)) + '%';
          cBar.style.background = cw.isNearLimit ? '#DC2626' : '#14191A';
        }
      }

      const skList = document.getElementById('sideSkillList');
      const skCount = document.getElementById('sideSkillCount');
      const skills = snap.skillStats || [];
      if (skCount) skCount.innerText = skills.length + ' SKILLS';
      if (skList && skills.length > 0) {
        const maxSk = Math.max(1, skills[0].tokens.totalTokens);
        skList.innerHTML = skills.slice(0, 5).map(function(sk) {
          const pct = Math.round((sk.tokens.totalTokens / maxSk) * 100);
          return '<div class="model-row">' +
            '<div class="model-meta">' +
            '<span class="model-name">' + sk.skillName + '</span>' +
            '<span class="model-stat-num mono">' + formatCompactJs(sk.tokens.totalTokens) + ' (' + sk.invocationCount + 'x)</span>' +
            '</div>' +
            '<div class="model-bar-wrap"><div class="model-bar-fill" style="width:' + pct + '%; background:#14191A;"></div></div>' +
            '</div>';
        }).join('');
      }
      if (snap.companion) {
        syncSideCompanionUi(snap.companion);
      }

      // Update Active Agents Radar & Mascot Rig
      const agents = snap.activeAgents || [];
      if (agents.length > 0) {
        const lead = agents[0];
        const st = lead.status === 'running_tool' ? 'working' : 'thinking';
        setSideMascotState(st, '"' + (lead.model || 'Agent') + (lead.activeTool ? ' • ' + lead.activeTool : ' Thinking...') + '"');
      } else if (snap.companion && snap.companion.mascotBehavior === 'sleep') {
        setSideMascotState('sleeping', '"Zzz... Resting circuits"');
      } else {
        setSideMascotState('idle', '"Ready in Antigravity!"');
      }
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
          const color = i === 0 ? '#14191A' : i === 1 ? '#137A50' : i === 2 ? '#4E6482' : '#464B48';
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
  private syncTimer?: NodeJS.Timeout;

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

    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.syncTimer = setInterval(() => {
      const snap = this.currentSnapshot || loadDiskFallbackSnapshot();
      if (snap && this.view?.visible) {
        void this.view.webview.postMessage({
          type: 'update',
          snapshot: snap,
        });
      }
    }, 1500);

    if (typeof webviewView.onDidDispose === 'function') {
      webviewView.onDidDispose(() => {
        if (this.syncTimer) {
          clearInterval(this.syncTimer);
          this.syncTimer = undefined;
        }
      });
    }

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
        case 'toggleNotch':
          void this.getVscode().commands.executeCommand('antigravityPresence.toggleNotch');
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

  public dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }
}
