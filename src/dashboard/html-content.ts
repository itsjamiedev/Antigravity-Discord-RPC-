/**
 * Antigravity Presence — Pro Bento Executive OLED Dashboard
 *
 * Implements /impeccable, /design-taste-frontend, and the Pro Bento Design System:
 * - Deep obsidian #000 canvas with glowing specular rim cards (.rim)
 * - DotNumber bitmapped 7xN dot-matrix SVG font for tokens counter
 * - Smooth Cubic Bezier Stream Wave SVG chart for Cumulative Tokens (Input, Cache, Output)
 * - 180-degree radial tick allocation half-gauge for Model Share
 * - 4 KPI Bento tiles: Active Agents, Cache Hit Efficiency, Conversations, Session Elapsed Timer
 * - Mirrored Wave Token Flow chart (Ingestion vs Generation)
 * - Model distribution sparklines and hourly capsule volume columns
 * - Interactive slide-over conversation drawer with live turn & tool events
 * - 100% self-contained, zero external CDN dependencies, instant SSE synchronization
 */

import { getMascotCss, getMascotSfxJs, getMascotSvgHtml } from '../shared/mascot-rig.js';
import { getDashboardThemeCss, getDashboardHeroHtml } from './ui-hero.js';
import { getDashboardLeftColumnHtml } from './ui-charts.js';
import { getDashboardRightColumnHtml } from './ui-timeline.js';

export function getDashboardHtml(): string {
  const mascotHeroSvg = getMascotSvgHtml('dashHero', 92, 'idle');
  const mascotStyles = getMascotCss();
  const mascotSfxScript = getMascotSfxJs();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Presence — Local Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@500;700&family=Geist:wght@400;500;600;700&family=Silkscreen:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    ${getDashboardThemeCss()}
    ${mascotStyles}
    .card { background: #EAE5D9; border: 1px solid #C9C2B3; border-radius: 16px; padding: 20px; box-shadow: 0 2px 10px -2px rgba(20, 25, 26, 0.06); }
    .rim, .core { display: none !important; }
    .card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .big-num { font-size: 2rem; font-weight: 800; color: #14191A; font-family: var(--font-mono); }
    .muted { font-size: 12px; color: #6B7678; }
    .full-width { width: 100%; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    @media (max-width: 960px) { .grid-2, .grid-4 { grid-template-columns: 1fr; } }
    .setting-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #EDF2F0; gap: 12px; }
    .setting-row:last-child { border-bottom: none; }
    .retro-btn { border: 1px solid #CBD6D3; background: #F4F7F6; color: #14191A; border-radius: 999px; padding: 6px 14px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .retro-btn.active { background: #DCF291; border-color: rgba(20,25,26,0.16); }
    .ag-vec-icon { width: 14px; height: 14px; }
    .tab-btn { appearance: none; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.12); color: #FFFFFF; border-radius: 999px; padding: 8px 18px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
    .tab-btn.active { background: #DCF291; border-color: #DCF291; color: #14191A; }
  </style>
</head>
<body>
  <div class="nx-page-frame">
    <div class="nx-shell">
      ${getDashboardHeroHtml()}
      <div class="tip" id="globalTip"></div>
      <main>
        <section id="tab-overview" class="view-panel active">
          <div class="nx-overview-grid">
            ${getDashboardLeftColumnHtml()}
            ${getDashboardRightColumnHtml()}
          </div>
          <div style="display:none;">
            <div id="mascot-rig-dash"></div>
            <span>24 HOURS</span><span>WEEKLY (7D)</span><span>MONTHLY (30D)</span><span>YEARLY (365D)</span><span>OVERALL</span>
          </div>
        </section>

    <!-- AGENTS TAB -->
    <section id="tab-agents" class="view-panel">
      <div class="card full-width" style="height: auto;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="cap">AI AGENT INSTANCES</div>
            <span class="chip">LIVE WATCHER</span>
          </div>
          <div class="ttl">Active Agents Directory</div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Conversation</th>
                  <th>Model</th>
                  <th>Active Tool</th>
                  <th>Turn Count</th>
                  <th>Tokens Used</th>
                  <th>Last Event</th>
                </tr>
              </thead>
              <tbody id="agentsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- MODELS & TOKENS TAB -->
    <section id="tab-models" class="view-panel">
      <div class="card full-width" style="height: auto; margin-bottom:16px;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="cap">MODEL ACCOUNTING</div>
            <span class="chip">PERSISTED</span>
          </div>
          <div class="ttl">All Models Breakdown</div>
          <div id="modelsCardsGrid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px; margin-top:16px;"></div>
        </div>
      </div>
    </section>

    <!-- CONVERSATIONS TAB -->
    <section id="tab-conversations" class="view-panel">
      <div class="card full-width" style="height: auto;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="cap">CONVERSATION DISCOVERY</div>
            <span class="chip">ALL SESSIONS</span>
          </div>
          <div class="ttl">Conversation History & Status</div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Conversation ID</th>
                  <th>Model</th>
                  <th>Input</th>
                  <th>Cache Read</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Last Event</th>
                </tr>
              </thead>
              <tbody id="conversationsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- ANALYTICS TAB -->
    <section id="tab-analytics" class="view-panel">
      <!-- 1. Hero 14-Day Stacked Bar Card -->
      <div class="card full-width" style="height: 440px; margin-bottom:16px;">
        <div class="rim"></div>
        <div class="core" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(232, 255, 31, 0.08));"></div>
        <div class="in-c">
          <div class="card-top">
            <div>
              <div class="cap">DAILY TOKEN CONSUMPTION</div>
              <div class="ttl" style="margin-top:2px;">
                Tokens by Day
                <span class="muted" style="font-size:13px; font-weight:500; margin-left:8px;" id="analyticsDailySubtitle">Last 14 Days</span>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
              <div class="legend" style="display:flex; gap:14px; font-size:12px; font-weight:600;">
                <span style="display:inline-flex; align-items:center; gap:5px; color:#10b981;">
                  <i style="width:8px; height:8px; border-radius:50%; background:#10b981; display:inline-block;"></i>Cache Read
                </span>
                <span style="display:inline-flex; align-items:center; gap:5px; color:#ffffff;">
                  <i style="width:8px; height:8px; border-radius:50%; background:#ffffff; display:inline-block;"></i>Input
                </span>
                <span style="display:inline-flex; align-items:center; gap:5px; color:#E8FF1F;">
                  <i style="width:8px; height:8px; border-radius:50%; background:#E8FF1F; display:inline-block;"></i>Output
                </span>
              </div>
              <span class="chip" id="analyticsTotal14d">0 TOKENS</span>
            </div>
          </div>
          <div id="tokenDailyChartContainer" style="flex:1; width:100%; min-height:280px; height:320px; position:relative; margin-top:16px;">
            <svg id="tokenDailyChart" style="width:100%; height:100%; overflow:visible;"></svg>
          </div>
        </div>
      </div>

      <!-- 2. Bento Summary Row (3 Cards) -->
      <div class="bento-grid" style="margin-bottom:16px;">
        <div class="card" style="grid-column: span 4; height: 180px;">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), transparent);"></div>
          <div class="in-c" style="justify-content:space-between;">
            <div class="card-top">
              <span class="cap">PROMPT CACHE EFFICIENCY</span>
              <span class="status-badge running_tool" id="analyticsCacheBadge">SAVINGS</span>
            </div>
            <div>
              <div class="big-num mono" style="font-size:2.2rem; color:var(--emerald);" id="analyticsCacheRatio">0%</div>
              <div class="muted" style="margin-top:4px;" id="analyticsCacheDetail">0 cached tokens preserved</div>
            </div>
          </div>
        </div>

        <div class="card" style="grid-column: span 4; height: 180px;">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(232, 255, 31, 0.18), transparent);"></div>
          <div class="in-c" style="justify-content:space-between;">
            <div class="card-top">
              <span class="cap">14-DAY PEAK VELOCITY</span>
              <span class="chip">HIGHEST DAY</span>
            </div>
            <div>
              <div class="big-num mono" style="font-size:2.2rem; color:var(--acc);" id="analyticsPeakTokens">0</div>
              <div class="muted" style="margin-top:4px;" id="analyticsPeakDate">No peak recorded</div>
            </div>
          </div>
        </div>

        <div class="card" style="grid-column: span 4; height: 180px;">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(169, 178, 255, 0.2), transparent);"></div>
          <div class="in-c" style="justify-content:space-between;">
            <div class="card-top">
              <span class="cap">DOMINANT MODEL</span>
              <span class="chip" id="analyticsModelShare">0% SHARE</span>
            </div>
            <div>
              <div class="ttl" style="font-size:1.4rem; color:var(--t1);" id="analyticsDominantModel">None</div>
              <div class="muted" style="margin-top:4px;" id="analyticsModelTotal">0 tokens accumulated</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Daily Historical Ledger Table -->
      <div class="card full-width" style="height: auto;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="cap">HISTORICAL USAGE METRICS</div>
            <span class="chip" id="analyticsTableCount">0 DAYS RECORDED</span>
          </div>
          <div class="ttl">Day-by-Day Token Accounting</div>
          <div class="table-container" style="margin-top:14px;">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Tokens</th>
                  <th>Cache Read</th>
                  <th>Input</th>
                  <th>Output</th>
                  <th>Cache Ratio</th>
                  <th>Models Used</th>
                </tr>
              </thead>
              <tbody id="analyticsTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- SETTINGS TAB -->
    <section id="tab-settings" class="view-panel">
      <div class="card full-width" style="height: auto;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="cap">PRIVACY & DISCORD CONTROLS</div>
            <span class="chip">LOCAL CONFIG</span>
          </div>
          <div class="ttl">Rich Presence Settings</div>
          <div style="display:flex; flex-direction:column; gap:16px; margin-top:20px; max-width:680px;">
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600;">Disable Discord Rich Presence</div>
                <div style="font-size:0.75rem; color:var(--t3);">Turn off all Rich Presence updates on Discord entirely.</div>
              </div>
              <input type="checkbox" id="settingDisablePresence" onchange="updateSetting('disableRichPresence', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600;">Hide AI Model Names</div>
                <div style="font-size:0.75rem; color:var(--t3);">Do not disclose model names (e.g. Gemini 3.8 Flash) in Discord status.</div>
              </div>
              <input type="checkbox" id="settingHideModels" onchange="updateSetting('hideModels', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600;">Hide Active File Names in Manual Edits</div>
                <div style="font-size:0.75rem; color:var(--t3);">Only show language (e.g. TypeScript) instead of exact filename when coding.</div>
              </div>
              <input type="checkbox" id="settingHideFileNames" onchange="updateSetting('hideFileNamesInManualEdits', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div>
                <div style="font-weight:600;">Enable Manual Coding Mode</div>
                <div style="font-size:0.75rem; color:var(--t3);">Show current file and line number when AI agents are idle.</div>
              </div>
              <input type="checkbox" id="settingEnableManualPresence" onchange="updateSetting('enableManualEditsPresence', this.checked)">
            </label>
          </div>
        </div>
      </div>

      <!-- LIQUID GLASS DYNAMIC NOTCH & DESKTOP MASCOT CONTROLS -->
      <div class="card full-width" style="height: auto; margin-top: 16px;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="ttl">Liquid Glass Notch &amp; Mascot Companion</div>
            <span class="chip">Desktop Overlay</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:14px; margin-top:12px; max-width:680px;">
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div style="font-weight:600;">Enable Liquid Glass Dynamic Island Notch</div>
              <input type="checkbox" id="settingNotchEnabled" onchange="updateCompanion({ enabled: true, notchEnabled: this.checked })" checked>
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div style="font-weight:600;">Enable Desktop Mascot Companion</div>
              <input type="checkbox" id="settingMascotEnabled" onchange="updateCompanion({ enabled: true, mascotEnabled: this.checked })" checked>
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div style="font-weight:600;">Mascot Behavior</div>
              <select id="settingCompBehavior" onchange="updateCompanion({ mascotBehavior: this.value })" style="background:var(--card-inner); color:var(--t1); border:1px solid var(--hair); border-radius:8px; padding:6px 10px; font-family:var(--font-mono); font-size:12px;">
                <option value="sit_corner">Sit in Corner</option>
                <option value="walk_follow">Walk &amp; Follow Cursor</option>
                <option value="sleep">Sleep Mode</option>
              </select>
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div style="font-weight:600;">Corner Anchor</div>
              <select id="settingCompCorner" onchange="updateCompanion({ corner: this.value })" style="background:var(--card-inner); color:var(--t1); border:1px solid var(--hair); border-radius:8px; padding:6px 10px; font-family:var(--font-mono); font-size:12px;">
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="top-right">Top Right</option>
                <option value="top-left">Top Left</option>
              </select>
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
              <div style="font-weight:600;">Mute 8-Bit Audio</div>
              <input type="checkbox" id="settingCompMuteSfx" onchange="updateCompanion({ soundMuted: this.checked })">
            </label>
          </div>
        </div>
      </div>

      <!-- 30-MINUTE GITHUB TOKEN AUTO-UPDATER & RELEASE CHANGELOG -->
      <div class="card full-width" style="height: auto; margin-top: 16px;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="ttl">GitHub Auto-Updater (Every 30 Minutes)</div>
            <span class="chip" id="settingsUpdaterBadge">30m Auto-Check Active</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px; max-width:680px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <input type="password" id="inputGithubToken" placeholder="GitHub Token (ghp_...)" style="flex:1; min-width:240px; background:var(--card-inner); color:var(--t1); border:1px solid var(--hair); border-radius:9px; padding:8px 12px; font-family:var(--font-mono); font-size:12px; outline:none;" />
              <button type="button" class="retro-btn active" onclick="saveGithubToken()">
                <span>Save Token</span>
              </button>
              <button type="button" class="retro-btn" onclick="checkGithubUpdatesNow()">
                <span>Check Now</span>
              </button>
            </div>
            <div class="mono" style="font-size:11.5px; color:var(--t2);" id="settingsUpdaterMeta">
              Current: v2.1.0 • Polling every 30 minutes
            </div>
            <div class="update-notes-list" id="settingsReleaseNotesBox" style="display:none;"></div>
          </div>
        </div>
      </div>

      <!-- ANTIGRAVITY IDE AUTO-DETECTOR & EXTENSION SELF-INSTALLER -->
      <div class="card full-width" style="height: auto; margin-top: 16px;">
        <div class="rim"></div>
        <div class="in-c">
          <div class="card-top">
            <div class="ttl">Antigravity IDE Extension Sync</div>
            <span class="chip" id="settingsIdeSyncChip">Synced</span>
          </div>
          <div id="settingsIdeTargetsList" style="display:flex; flex-direction:column; gap:8px; margin-top:10px; max-width:680px;"></div>
          <div style="display:flex; gap:10px; margin-top:12px;">
            <button type="button" class="retro-btn active" onclick="reinstallIdeExtension()">
              <svg class="ag-vec-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M13.5 8a5.5 5.5 0 0 1-9.4 3.9L2.5 10.5M2.5 8a5.5 5.5 0 0 1 9.4-3.9l1.6 1.4"/></svg>
              <span>Sync Antigravity Extension</span>
            </button>
          </div>
        </div>
      </div>
    </section>

      </main>
    </div>
  </div>

  <!-- SLIDE-OVER CONVERSATION INSPECTION DRAWER -->
  <div class="drawer-overlay" id="drawerOverlay" onclick="closeDrawer(event)">
    <div class="drawer-panel" onclick="event.stopPropagation()">
      <div class="drawer-header">
        <div>
          <div class="cap">CONVERSATION INSPECTOR</div>
          <div class="ttl" id="drawerTitle">Conversation Details</div>
        </div>
        <button class="drawer-close" onclick="closeDrawer()">&times;</button>
      </div>
      <div class="drawer-body">
        <div>
          <div class="muted" style="margin-bottom:4px;">Conversation ID</div>
          <div class="mono" id="drawerConvId" style="font-size:0.8rem; word-break:break-all; color:var(--t1);"></div>
        </div>
        <div>
          <div class="muted" style="margin-bottom:4px;">Active Model</div>
          <div class="ttl" id="drawerModel" style="color:var(--acc);">--</div>
        </div>
        <div>
          <div class="muted" style="margin-bottom:4px;">Prompt Cache Hit Ratio</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="flex:1; height:8px; border-radius:4px; background:rgba(255,255,255,0.08); overflow:hidden;">
              <div id="drawerCacheBar" style="width:0%; height:100%; background:var(--emerald); transition:width 0.4s var(--ease);"></div>
            </div>
            <span class="mono" id="drawerCacheRatio" style="font-weight:700; color:var(--emerald);">0%</span>
          </div>
        </div>
        <div>
          <div class="muted" style="margin-bottom:8px;">Exact Token Breakdown</div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--hair);">
              <div class="muted" style="font-size:10px;">INPUT</div>
              <div class="mono" id="drawerInTokens" style="font-weight:700; margin-top:4px;">0</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--hair);">
              <div class="muted" style="font-size:10px; color:var(--emerald);">CACHE READ</div>
              <div class="mono" id="drawerCacheTokens" style="font-weight:700; margin-top:4px; color:var(--emerald);">0</div>
            </div>
            <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:8px; border:1px solid var(--hair);">
              <div class="muted" style="font-size:10px; color:var(--acc);">OUTPUT</div>
              <div class="mono" id="drawerOutTokens" style="font-weight:700; margin-top:4px; color:var(--acc);">0</div>
            </div>
          </div>
        </div>
        <div>
          <div class="muted" style="margin-bottom:8px;">Recent Turn & Tool Timeline</div>
          <div id="drawerEvents" style="display:flex; flex-direction:column; gap:6px;"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <footer>
    <div>Antigravity Presence • Privacy-Safe Local Companion • 100% Local (127.0.0.1)</div>
    <div>Made with <span style="color:#f43f5e;">❤</span> by <a href="https://github.com/itsjamiedev" target="_blank">itsjamiedev</a> — a 16-year-old developer using Google Antigravity</div>
  </footer>

  <!-- CLIENT-SIDE LOGIC -->
  <script>
    ${mascotSfxScript}

    /* ------------------------------------------------------------------ */
    /*  Pro Bento DotNumber 7xN Matrix Font Definition                    */
    /* ------------------------------------------------------------------ */
    const F = {
      '0': ['01110','10001','10011','10101','11001','10001','01110'],
      '1': ['00100','01100','00100','00100','00100','00100','01110'],
      '2': ['01110','10001','00001','00010','00100','01000','11111'],
      '3': ['11111','00010','00100','00010','00001','10001','01110'],
      '4': ['00010','00110','01010','10010','11111','00010','00010'],
      '5': ['11111','10000','11110','00001','00001','10001','01110'],
      '6': ['00110','01000','10000','11110','10001','10001','01110'],
      '7': ['11111','00001','00010','00100','01000','01000','01000'],
      '8': ['01110','10001','10001','01110','10001','10001','01110'],
      '9': ['01110','10001','10001','01111','00001','00010','01100'],
      ',': ['0','0','0','0','0','1','1'],
      '.': ['0','0','0','0','0','0','1'],
      ' ': ['00','00','00','00','00','00','00'],
      '+': ['00000','00100','00100','11111','00100','00100','00000'],
      '-': ['00000','00000','00000','11111','00000','00000','00000']
    };

    function createDotNumber(host, pitch) {
      pitch = pitch || 4;
      const cols = 80;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'dots');
      svg.setAttribute('aria-hidden', 'true');
      host.innerHTML = '';
      host.appendChild(svg);

      const cells = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < 7; r++) {
          const ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ci.setAttribute('cx', String(c * pitch + pitch / 2));
          ci.setAttribute('cy', String(r * pitch + pitch / 2));
          ci.setAttribute('r', String(pitch * 0.36));
          ci.setAttribute('fill', '#ffffff');
          ci.setAttribute('opacity', '0');
          ci.style.transitionDelay = (c * 7) + 'ms';
          svg.appendChild(ci);
          cells.push([c, r, ci]);
        }
      }

      function setText(t) {
        const on = new Set();
        let x = 0;
        for (let i = 0; i < t.length; i++) {
          const ch = t[i];
          const g = F[ch] || F[' '];
          const w = g[0].length;
          for (let r = 0; r < 7; r++) {
            for (let k = 0; k < w; k++) {
              if (g[r][k] === '1') on.add((x + k) * 8 + r);
            }
          }
          x += w + 1;
        }
        const used = Math.max(1, x - 1);
        for (let i = 0; i < cells.length; i++) {
          const c = cells[i][0];
          const r = cells[i][1];
          const ci = cells[i][2];
          const v = on.has(c * 8 + r);
          ci.setAttribute('opacity', v ? '1' : (c < used ? '0.08' : '0'));
          ci.style.transform = v ? 'none' : 'scale(0.55)';
        }
        svg.setAttribute('width', String(used * pitch));
        svg.setAttribute('height', String(7 * pitch));
        svg.setAttribute('viewBox', '0 0 ' + (used * pitch) + ' ' + (7 * pitch));
      }

      let cur = 0;
      let raf = 0;
      return {
        count: function(to, dur) {
          dur = dur || 800;
          cancelAnimationFrame(raf);
          const from = cur;
          const t0 = performance.now();
          let last = '';
          function step(now) {
            const t = Math.min(1, (now - t0) / dur);
            cur = Math.round(from + (to - from) * (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t));
            const s = cur.toLocaleString('en-US');
            if (s !== last) {
              setText(s);
              last = s;
            }
            if (t < 1) raf = requestAnimationFrame(step);
          }
          raf = requestAnimationFrame(step);
        }
      };
    }

    /* ------------------------------------------------------------------ */
    /*  Dashboard State & Helpers                                         */
    /* ------------------------------------------------------------------ */
    let currentData = null;
    let activeConversationId = null;
    let dotNumInstance = null;
    let sessionTimerInterval = null;
    let nwSpan = 'all';

    function formatNumber(num) {
      if (typeof num !== 'number' || isNaN(num)) return '0';
      return num.toLocaleString('en-US');
    }

    function formatNumberShort(num) {
      if (!num || num <= 0) return '0';
      if (num >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
      if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
      return Math.round(num).toString();
    }

    function formatLifetimeHours(seconds) {
      if (typeof seconds !== 'number' || !isFinite(seconds) || seconds <= 0) return '0m';
      if (seconds < 3600) {
        return Math.max(1, Math.floor(seconds / 60)) + 'm';
      }
      return (seconds / 3600).toFixed(1).replace(/\.0$/, '') + 'h';
    }

    function formatTime(isoStr) {
      if (!isoStr) return '--';
      try {
        const d = new Date(isoStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return '--';
      }
    }

    function switchTab(tabName, btn) {
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.view-panel').forEach(function(p) { p.classList.remove('active'); });
      if (btn) {
        btn.classList.add('active');
      } else if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('active');
      } else {
        const matchingBtn = document.querySelector('.tab-btn[onclick*="' + tabName + '"]');
        if (matchingBtn) matchingBtn.classList.add('active');
      }
      const panel = document.getElementById('tab-' + tabName);
      const heroTitle = document.getElementById('heroSectionTitle');
      if (heroTitle) {
        const titles = {
          overview: 'Overview',
          agents: 'Agents',
          models: 'Models & Tokens',
          conversations: 'Conversations',
          analytics: 'Analytics',
          settings: 'Settings',
        };
        heroTitle.innerText = titles[tabName] || 'Overview';
      }
      if (panel) {
        panel.classList.add('active');
        if (tabName === 'analytics' && currentData) {
          setTimeout(function() { renderAnalyticsTab(currentData); }, 30);
        }
        if (tabName === 'overview' && currentData) {
          setTimeout(function() { renderOverview(currentData); }, 30);
        }
      }
    }

    function filterDashboard(query) {
      const q = (query || '').trim().toLowerCase();
      document.querySelectorAll('#overviewTableBody tr, #agentsTableBody tr, #conversationsTableBody tr').forEach(function(tr) {
        tr.style.display = (!q || tr.innerText.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
      });
    }

    function setNwSpan(span) {
      nwSpan = span;
      document.querySelectorAll('#nwSeg button').forEach(function(b) {
        const isMatch = (b.getAttribute('onclick') || '').indexOf("'" + span + "'") !== -1;
        b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        b.classList.toggle('active', isMatch);
      });
      if (currentData) renderNwStream(currentData);
    }

    /* ------------------------------------------------------------------ */
    /*  Retro 5-Window Time Matrix & Mascot Companion Controls            */
    /* ------------------------------------------------------------------ */
    let selectedTimeRange = 'overall';
    let lastActiveAgentCount = 0;

    function setTimeRange(range) {
      selectedTimeRange = range;
      if (window.agMascotAudio) window.agMascotAudio.playClick();
      document.querySelectorAll('#timeRangeSeg button').forEach(function(b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-range') === range ? 'true' : 'false');
      });
      ['24h', 'weekly', 'monthly', 'yearly', 'overall'].forEach(function(r) {
        const cell = document.getElementById('cell-' + r);
        if (cell) cell.classList.toggle('active', r === range);
      });
      const spanMap = { '24h': '24h', 'weekly': '7d', 'monthly': '30d', 'yearly': '1y', 'overall': 'all' };
      if (spanMap[range]) {
        setNwSpan(spanMap[range]);
      }
    }

    function setDashMascotState(state, speechText, subText) {
      const rig = document.getElementById('mascot-rig-dashHero') || document.getElementById('mascot-rig-dash');
      const tag = document.getElementById('dashMascotStateTag');
      const speech = document.getElementById('dashMascotSpeech');
      const sub = document.getElementById('dashMascotSub');
      if (rig) rig.setAttribute('data-state', state);
      if (tag) tag.innerText = state.charAt(0).toUpperCase() + state.slice(1);
      if (speech && speechText) speech.innerText = speechText.replace(/^"|"$/g, '');
      if (sub && subText) sub.innerText = subText;
    }

    function interactDashMascot() {
      if (window.agMascotAudio) window.agMascotAudio.playWake();
      setDashMascotState('surprised', 'Antigravity Ready', 'Active');
      setTimeout(function() {
        if (currentData) {
          renderOverview(currentData);
        } else {
          setDashMascotState('idle', 'Ready', 'Antigravity');
        }
      }, 950);
    }

    async function saveGithubToken() {
      const inp = document.getElementById('inputGithubToken');
      if (!inp) return;
      const tokenVal = inp.value.trim();
      try {
        const res = await fetch(API_BASE + '/api/updater/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ githubToken: tokenVal, clearSkipped: true })
        });
        if (res.ok) {
          inp.value = '';
          await checkGithubUpdatesNow();
        }
      } catch {}
    }

    async function checkGithubUpdatesNow() {
      if (window.agMascotAudio) window.agMascotAudio.playClick();
      const badge = document.getElementById('settingsUpdaterBadge');
      if (badge) badge.innerText = 'Checking GitHub...';
      try {
        const res = await fetch(API_BASE + '/api/updater/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ignoreSkipped: true })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.updater) renderUpdaterUi(json.updater);
        }
      } catch {}
    }

    async function skipGithubUpdate() {
      if (window.agMascotAudio) window.agMascotAudio.playClick();
      const latest = (currentData && currentData.updater && currentData.updater.latestVersion) || '';
      try {
        const res = await fetch(API_BASE + '/api/updater/skip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: latest })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.updater) renderUpdaterUi(json.updater);
        }
      } catch {}
    }

    async function applyGithubUpdate() {
      if (window.agMascotAudio) window.agMascotAudio.playWake();
      const lbl = document.getElementById('lblApplyUpdate');
      if (lbl) lbl.innerText = 'Downloading Update...';
      try {
        const res = await fetch(API_BASE + '/api/updater/apply', {
          method: 'POST'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.action === 'open_release_url' && json.installerPath) {
            window.open(json.installerPath, '_blank');
          }
          if (json.updater) renderUpdaterUi(json.updater);
        }
      } catch {}
      if (lbl) lbl.innerText = 'Install Update';
    }

    function renderUpdaterUi(up) {
      if (!up) return;
      if (currentData) currentData.updater = up;

      const banner = document.getElementById('glassUpdateBanner');
      const diffEl = document.getElementById('updateVersionDiff');
      const titleEl = document.getElementById('updateReleaseTitle');
      const notesEl = document.getElementById('updateNotesList');

      if (banner) {
        banner.classList.toggle('visible', !!up.updateAvailable);
      }
      if (diffEl && up.latestVersion) {
        diffEl.innerText = 'v' + up.currentVersion + ' → v' + up.latestVersion;
      }
      if (titleEl) {
        titleEl.innerText = up.releaseName || ('Antigravity v' + (up.latestVersion || up.currentVersion));
      }

      const lines = Array.isArray(up.releaseNotesLines) && up.releaseNotesLines.length > 0
        ? up.releaseNotesLines
        : (up.releaseNotes ? [up.releaseNotes] : ['New release available on GitHub']);

      const notesHtml = lines.map(function(line) {
        const safe = String(line).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return '<div style="display:flex; gap:8px; align-items:baseline;"><span style="color:var(--emerald);">•</span><span>' + safe + '</span></div>';
      }).join('');

      if (notesEl) notesEl.innerHTML = notesHtml;

      const settingsNotes = document.getElementById('settingsReleaseNotesBox');
      if (settingsNotes) {
        if (up.latestVersion) {
          settingsNotes.style.display = 'flex';
          settingsNotes.innerHTML = '<div style="font-weight:700; color:var(--t1); margin-bottom:4px;">Release Notes (v' + up.latestVersion + ')</div>' + notesHtml;
        } else {
          settingsNotes.style.display = 'none';
        }
      }

      const badge = document.getElementById('settingsUpdaterBadge');
      if (badge) {
        badge.innerText = up.updateAvailable
          ? 'Update Ready: v' + up.latestVersion
          : (up.isSkipped ? 'Skipped v' + up.skippedVersion : 'Every ' + up.checkIntervalMinutes + 'm Auto-Check');
      }

      const meta = document.getElementById('settingsUpdaterMeta');
      if (meta) {
        const tokPart = up.hasGithubToken ? ('Token: ' + (up.maskedToken || 'Configured')) : 'Token: Public API';
        const latestPart = up.latestVersion ? ('Latest: v' + up.latestVersion) : 'Up to date';
        meta.innerText = 'Current: v' + up.currentVersion + ' • ' + latestPart + ' • ' + tokPart;
      }
    }

    async function reinstallIdeExtension() {
      const icon = document.getElementById('iconIdeSync');
      const lbl = document.getElementById('lblIdeExtensionSync');
      if (icon) icon.classList.add('ag-vec-spin');
      if (lbl) lbl.innerText = 'Antigravity IDE: Syncing...';
      if (window.agMascotAudio) window.agMascotAudio.playWake();

      try {
        const res = await fetch(API_BASE + '/api/ide-install', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.ideStatus) {
            renderIdeStatusUi(json.ideStatus);
          }
        }
      } catch (err) {
        console.error('Failed to reinstall IDE extension:', err);
      } finally {
        if (icon) icon.classList.remove('ag-vec-spin');
      }
    }

    function renderIdeStatusUi(report) {
      if (!report) return;
      const lbl = document.getElementById('lblIdeExtensionSync');
      const btn = document.getElementById('btnIdeExtensionSync');
      const chip = document.getElementById('settingsIdeSyncChip');
      const list = document.getElementById('settingsIdeTargetsList');

      if (lbl && btn) {
        if (report.allTargetsSynced) {
          btn.classList.add('active');
          lbl.innerText = 'Antigravity IDE Extension: Synced (v' + report.extensionVersion + ')';
        } else if (report.anyIdeDetected) {
          btn.classList.remove('active');
          lbl.innerText = 'Antigravity IDE Extension: Click to Sync';
        } else {
          btn.classList.remove('active');
          lbl.innerText = 'Antigravity IDE: Standalone Mode';
        }
      }

      if (chip) {
        chip.innerText = report.allTargetsSynced ? 'All Targets Synced' : (report.anyIdeDetected ? 'Update Available' : 'Standalone Mode');
      }

      if (list && Array.isArray(report.targets)) {
        list.innerHTML = report.targets.map(function(t) {
          const badgeColor = t.installed && t.bundleHashMatch ? 'var(--emerald)' : (t.detected ? 'var(--acc)' : 'var(--t3)');
          const badgeText = t.installed && t.bundleHashMatch ? 'Installed & Synced' : (t.detected ? 'Detected (Ready to Install)' : 'Not Installed');
          return (
            '<div style="background:var(--card-inner); border:2px solid var(--hair); border-radius:8px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">' +
            '<div>' +
            '<div style="font-weight:700; font-size:13px; color:var(--t1);">' + t.label + '</div>' +
            '<div class="mono" style="font-size:11px; color:var(--t3); margin-top:3px;">' + t.extensionInstallDir + '</div>' +
            '</div>' +
            '<span class="chip mono" style="color:' + badgeColor + '; border-color:' + badgeColor + ';">' + badgeText + '</span>' +
            '</div>'
          );
        }).join('');
      }
    }

    async function updateCompanion(partial) {
      try {
        if (window.agMascotAudio) {
          if (typeof partial.soundMuted === 'boolean') {
            window.agMascotAudio.setMuted(partial.soundMuted);
          }
          if (partial.mode) {
            window.agMascotAudio.playMorph();
          } else if (partial.mascotBehavior === 'sleep') {
            window.agMascotAudio.playSleep();
          } else {
            window.agMascotAudio.playClick();
          }
        }
        const res = await fetch(API_BASE + '/api/companion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(partial)
        });
        if (res.ok) {
          const json = await res.json();
          if (json.companion) {
            renderCompanionUi(json.companion, currentData ? currentData.isAntigravityRunning : true);
          }
        }
      } catch (err) {
        console.error('Failed to update companion settings:', err);
      }
    }

    function toggleNotchEnabled() {
      const comp = (currentData && currentData.companion) ? currentData.companion : { notchEnabled: true };
      const next = comp.notchEnabled === false ? true : false;
      updateCompanion({ enabled: true, notchEnabled: next });
    }

    function toggleMascotEnabled() {
      const comp = (currentData && currentData.companion) ? currentData.companion : { mascotEnabled: true };
      const next = comp.mascotEnabled === false ? true : false;
      updateCompanion({ enabled: true, mascotEnabled: next });
    }

    function cycleCompanionBehavior() {
      const comp = (currentData && currentData.companion) ? currentData.companion : { mascotBehavior: 'sit_corner' };
      const order = ['sit_corner', 'walk_follow', 'sleep'];
      const next = order[(order.indexOf(comp.mascotBehavior) + 1) % order.length];
      updateCompanion({ mascotBehavior: next, mascotEnabled: true, enabled: true });
    }

    function cycleCompanionCorner() {
      const comp = (currentData && currentData.companion) ? currentData.companion : { corner: 'bottom-right' };
      const order = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
      const next = order[(order.indexOf(comp.corner) + 1) % order.length];
      updateCompanion({ corner: next, mascotBehavior: 'sit_corner', mascotEnabled: true, enabled: true });
    }

    function toggleCompanionSfx() {
      const comp = (currentData && currentData.companion) ? currentData.companion : { soundMuted: false };
      updateCompanion({ soundMuted: !comp.soundMuted });
    }

    function renderCompanionUi(comp, isAgRunning) {
      if (!comp) return;
      if (currentData) currentData.companion = comp;
      if (window.agMascotAudio) window.agMascotAudio.setMuted(!!comp.soundMuted);

      const notchOn = comp.enabled !== false && comp.notchEnabled !== false;
      const mascotOn = comp.enabled !== false && comp.mascotEnabled !== false;

      const btnNotch = document.getElementById('btnNotchToggle');
      const lblNotch = document.getElementById('lblNotchToggle');
      if (btnNotch && lblNotch) {
        btnNotch.classList.toggle('active', notchOn);
        lblNotch.innerText = 'Liquid Notch: ' + (notchOn ? 'On' : 'Off');
      }

      const btnMascot = document.getElementById('btnMascotToggle');
      const lblMascot = document.getElementById('lblMascotToggle');
      if (btnMascot && lblMascot) {
        btnMascot.classList.toggle('active', mascotOn);
        lblMascot.innerText = 'Mascot: ' + (mascotOn ? 'On' : 'Off');
      }

      const lblBeh = document.getElementById('lblCompBehavior');
      if (lblBeh) {
        const bMap = {
          'sit_corner': 'Sit Corner',
          'walk_follow': 'Walk & Follow',
          'sleep': 'Sleep Mode'
        };
        lblBeh.innerText = bMap[comp.mascotBehavior] || 'Sit Corner';
      }

      const lblCorner = document.getElementById('lblCompCorner');
      if (lblCorner) {
        const cName = (comp.corner || 'bottom-right').split('-').map(function(w) {
          return w.charAt(0).toUpperCase() + w.slice(1);
        }).join('-');
        lblCorner.innerText = cName;
      }

      const btnSfx = document.getElementById('btnCompSfx');
      const lblSfx = document.getElementById('lblCompSfx');
      if (btnSfx && lblSfx) {
        btnSfx.classList.toggle('active', !comp.soundMuted);
        lblSfx.innerText = comp.soundMuted ? 'Audio: Muted' : 'Audio: On';
      }

      const agChip = document.getElementById('agRunningChip');
      if (agChip) {
        const online = isAgRunning !== false;
        agChip.innerText = online ? '● Online' : '○ Closed';
        agChip.style.color = online ? 'var(--emerald)' : 'var(--coral)';
        agChip.style.borderColor = online ? 'rgba(52,245,164,0.35)' : 'rgba(255,94,126,0.35)';
      }

      const setNotch = document.getElementById('settingNotchEnabled');
      if (setNotch) setNotch.checked = notchOn;
      const setMascot = document.getElementById('settingMascotEnabled');
      if (setMascot) setMascot.checked = mascotOn;
      const setBeh = document.getElementById('settingCompBehavior');
      if (setBeh) setBeh.value = comp.mascotBehavior || 'sit_corner';
      const setCor = document.getElementById('settingCompCorner');
      if (setCor) setCor.value = comp.corner || 'bottom-right';
      const setMute = document.getElementById('settingCompMuteSfx');
      if (setMute) setMute.checked = !!comp.soundMuted;
    }

    /* ------------------------------------------------------------------ */
    /*  Tooltip Tracking                                                  */
    /* ------------------------------------------------------------------ */
    const tipEl = document.getElementById('globalTip');

    function showTip(e, title, rows) {
      let html = '<div class="t">' + title + '</div>';
      rows.forEach(function(r) {
        html += '<div class="r"><span>' + (r.color ? '<i style="background:' + r.color + '"></i>' : '') + r.label + '</span><b>' + r.value + '</b></div>';
      });
      tipEl.innerHTML = html;
      tipEl.classList.add('on');
      moveTip(e);
    }

    function moveTip(e) {
      const pad = 14;
      const x = Math.min(window.innerWidth - 220, e.clientX + pad);
      const y = Math.min(window.innerHeight - 120, e.clientY + pad);
      tipEl.style.left = x + 'px';
      tipEl.style.top = y + 'px';
    }

    function hideTip() {
      tipEl.classList.remove('on');
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Discord & Session Elapsed Timer                        */
    /* ------------------------------------------------------------------ */
    function renderDiscord(discord) {
      const dot = document.getElementById('discordDot');
      const text = document.getElementById('discordText');
      if (discord && discord.connected) {
        dot.className = 'status-dot active';
        text.innerText = 'Discord: Connected';
      } else {
        dot.className = 'status-dot amber';
        text.innerText = 'Discord: Offline';
      }
    }

    let isSessionPaused = false;

    function startLiveSessionTimer(startedAtIso, isPaused) {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      const startMs = Date.parse(startedAtIso) || Date.now();

      function formatTime(elapsedSec) {
        const hrs = Math.floor(elapsedSec / 3600);
        const mins = Math.floor((elapsedSec % 3600) / 60);
        const secs = elapsedSec % 60;
        const pad = function(n) { return n < 10 ? '0' + n : String(n); };
        return pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
      }

      function update() {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        const timerEl = document.getElementById('kpiSessionTimer');
        if (timerEl) timerEl.innerText = formatTime(elapsedSec);
      }

      update();
      if (!isPaused) {
        sessionTimerInterval = setInterval(update, 1000);
      }
    }

    async function togglePauseLeave() {
      try {
        const endpoint = isSessionPaused ? '/api/session/resume' : '/api/session/pause';
        const res = await fetch(API_BASE + endpoint, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          isSessionPaused = !!json.isPaused;
          updatePauseLeaveUi(isSessionPaused);
          if (currentData && currentData.session && currentData.session.startedAt) {
            startLiveSessionTimer(currentData.session.startedAt, isSessionPaused);
          }
        }
      } catch (err) {
        console.error('Failed to toggle session pause/leave:', err);
      }
    }

    function updatePauseLeaveUi(paused) {
      const icon = document.getElementById('pauseIcon');
      const text = document.getElementById('pauseText');
      const btn = document.getElementById('btnPauseLeave');
      const badge = document.getElementById('sessionBadge');
      const sub = document.getElementById('kpiSessionSub');

      if (paused) {
        if (icon) icon.innerHTML = '<svg class="ag-vec-icon" viewBox="0 0 16 16" fill="currentColor"><polygon points="4,3 13,8 4,13"/></svg>';
        if (text) text.innerText = 'Resume Session';
        if (btn) {
          btn.style.borderColor = 'rgba(52,245,164,0.5)';
          btn.style.color = 'var(--emerald)';
          btn.style.background = 'rgba(52,245,164,0.12)';
        }
        if (badge) {
          badge.className = 'status-badge idle';
          badge.innerText = 'Paused (Saved)';
        }
        if (sub) sub.innerText = 'Timer frozen — 24h retention active';
      } else {
        if (icon) icon.innerHTML = '<svg class="ag-vec-icon" viewBox="0 0 16 16" fill="currentColor"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg>';
        if (text) text.innerText = 'Pause & Leave';
        if (btn) {
          btn.style.borderColor = 'rgba(255,184,77,0.3)';
          btn.style.color = 'var(--acc)';
          btn.style.background = 'rgba(255,184,77,0.08)';
        }
        if (badge) {
          badge.className = 'status-badge running_tool';
          badge.innerText = '24h Persistent';
        }
        if (sub) sub.innerText = 'Auto-saved for 24h shutdown recovery';
      }
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Stream Wave Area Chart (#nw)                           */
    /* ------------------------------------------------------------------ */
    function renderNwStream(data) {
      const svg = document.getElementById('nwSvg');
      const container = document.getElementById('nwSvgContainer');
      const w = container.clientWidth || 700;
      const h = container.clientHeight || 200;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      const dailyAll = (data.dailyUsage && data.dailyUsage.length > 0)
        ? data.dailyUsage
        : [{ date: new Date().toISOString().slice(0, 10), tokens: data.session.tokens }];

      let filteredDaily = dailyAll;
      let timeframeTitle = 'Session Token Volume';

      if (nwSpan === '24h') {
        timeframeTitle = 'Session Token Volume (Last 24 Hours)';
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayObj = dailyAll.find(function(d) { return d.date === todayStr; }) || dailyAll[dailyAll.length - 1];
        const totIn = todayObj.tokens.inputTokens;
        const totCache = todayObj.tokens.cacheReadTokens;
        const totOut = todayObj.tokens.outputTokens;

        const hourlyPts = [];
        const steps = 8;
        for (let s = 0; s <= steps; s++) {
          const factor = Math.pow(s / steps, 1.8);
          const hourLabel = String(Math.floor((24 / steps) * s)).padStart(2, '0') + ':00';
          hourlyPts.push({
            date: hourLabel,
            tokens: {
              inputTokens: Math.round(totIn * factor),
              cacheReadTokens: Math.round(totCache * factor),
              outputTokens: Math.round(totOut * factor),
              totalTokens: Math.round((totIn + totCache + totOut) * factor)
            }
          });
        }
        filteredDaily = hourlyPts;
      } else if (nwSpan === '7d') {
        timeframeTitle = 'Session Token Volume (Last 7 Days)';
        filteredDaily = dailyAll.slice(-7);
      } else if (nwSpan === '30d') {
        timeframeTitle = 'Session Token Volume (Last 30 Days)';
        filteredDaily = dailyAll.slice(-30);
      } else if (nwSpan === '1y') {
        timeframeTitle = 'Session Token Volume (Last 365 Days)';
        filteredDaily = dailyAll.slice(-365);
      } else {
        timeframeTitle = 'Session Token Volume (All Time)';
        filteredDaily = dailyAll;
      }

      // Compute slice totals for DotNumber and Legend
      let spanIn = 0, spanCache = 0, spanOut = 0;
      if (nwSpan === '24h') {
        const last = filteredDaily[filteredDaily.length - 1];
        spanIn = last.tokens.inputTokens;
        spanCache = last.tokens.cacheReadTokens;
        spanOut = last.tokens.outputTokens;
      } else {
        filteredDaily.forEach(function(d) {
          spanIn += d.tokens.inputTokens;
          spanCache += d.tokens.cacheReadTokens;
          spanOut += d.tokens.outputTokens;
        });
      }
      const spanTotal = spanIn + spanCache + spanOut;

      // Update DotNumber matrix safely (optional)
      const dotHost = document.getElementById('nwDotNumber');
      if (dotHost && !dotNumInstance) {
        dotNumInstance = createDotNumber(dotHost, 4);
      }
      if (dotNumInstance) {
        dotNumInstance.count(spanTotal);
      }

      // Update Title & Legend & Hero Total
      const titleEl = document.getElementById('nwTitleText');
      if (titleEl) {
        titleEl.innerText = timeframeTitle;
      }
      const nxTotalEl = document.getElementById('nxTelemetryTotal');
      if (nxTotalEl) {
        nxTotalEl.innerText = formatNumberShort(spanTotal);
      }
      const legInEl = document.getElementById('legIn');
      const legCacheEl = document.getElementById('legCache');
      const legOutEl = document.getElementById('legOut');
      if (legInEl) legInEl.innerText = formatNumber(spanIn);
      if (legCacheEl) legCacheEl.innerText = formatNumber(spanCache);
      if (legOutEl) legOutEl.innerText = formatNumber(spanOut);

      // Build turn series
      let pts = [];
      let accIn = 0, accCache = 0, accOut = 0;
      filteredDaily.forEach(function(d, i) {
        if (nwSpan === '24h') {
          pts.push({
            idx: i,
            label: d.date,
            inTok: d.tokens.inputTokens,
            cacheTok: d.tokens.cacheReadTokens,
            outTok: d.tokens.outputTokens,
            total: d.tokens.inputTokens + d.tokens.cacheReadTokens + d.tokens.outputTokens
          });
        } else {
          accIn += d.tokens.inputTokens;
          accCache += d.tokens.cacheReadTokens;
          accOut += d.tokens.outputTokens;
          pts.push({
            idx: i,
            label: d.date,
            inTok: accIn,
            cacheTok: accCache,
            outTok: accOut,
            total: accIn + accCache + accOut
          });
        }
      });

      if (pts.length === 1) {
        pts = [
          { idx: 0, label: 'Start', inTok: 0, cacheTok: 0, outTok: 0, total: 0 },
          { idx: 1, label: pts[0].label, inTok: pts[0].inTok, cacheTok: pts[0].cacheTok, outTok: pts[0].outTok, total: pts[0].total }
        ];
      }

      const maxVal = Math.max(1, pts[pts.length - 1].total);
      const padX = 20, padY = 20;
      const plotW = w - padX * 2;
      const plotH = h - padY * 2;

      const getX = function(i) { return padX + (i / (pts.length - 1)) * plotW; };
      const getY = function(v) { return h - padY - (v / maxVal) * plotH; };

      // Helper for smooth cubic bezier paths
      function makeAreaPath(key) {
        let p = 'M ' + getX(0) + ' ' + (h - padY);
        for (let i = 0; i < pts.length; i++) {
          const x = getX(i);
          const y = getY(pts[i][key]);
          if (i === 0) {
            p += ' L ' + x + ' ' + y;
          } else {
            const prevX = getX(i - 1);
            const prevY = getY(pts[i - 1][key]);
            const cpX = (prevX + x) / 2;
            p += ' C ' + cpX + ' ' + prevY + ', ' + cpX + ' ' + y + ', ' + x + ' ' + y;
          }
        }
        p += ' L ' + getX(pts.length - 1) + ' ' + (h - padY) + ' Z';
        return p;
      }

      function makeLinePath(key) {
        let p = '';
        for (let i = 0; i < pts.length; i++) {
          const x = getX(i);
          const y = getY(pts[i][key]);
          if (i === 0) {
            p += 'M ' + x + ' ' + y;
          } else {
            const prevX = getX(i - 1);
            const prevY = getY(pts[i - 1][key]);
            const cpX = (prevX + x) / 2;
            p += ' C ' + cpX + ' ' + prevY + ', ' + cpX + ' ' + y + ', ' + x + ' ' + y;
          }
        }
        return p;
      }

      let s = '';
      s += '<defs>';
      s += '<linearGradient id="nxAreaWash" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#14191A" stop-opacity="0.08"/><stop offset="100%" stop-color="#14191A" stop-opacity="0"/></linearGradient>';
      s += '</defs>';

      // Horizontal subtle grid
      for (let g = 0; g <= 4; g++) {
        const yG = padY + (g / 4) * plotH;
        s += '<line x1="' + padX + '" y1="' + yG + '" x2="' + (w - padX) + '" y2="' + yG + '" stroke="#EDF2F0" stroke-dasharray="4 4" stroke-width="1"/>';
      }

      // Vertical rib bars under curve (#CBD6D3)
      const ribCount = Math.max(24, Math.min(48, Math.floor(plotW / 14)));
      for (let r = 0; r < ribCount; r++) {
        const rx = padX + (r / (ribCount - 1)) * plotW;
        const idxFloat = (r / (ribCount - 1)) * (pts.length - 1);
        const i0 = Math.floor(idxFloat);
        const i1 = Math.min(pts.length - 1, i0 + 1);
        const frac = idxFloat - i0;
        const val = pts[i0].total + (pts[i1].total - pts[i0].total) * frac;
        const ry = getY(val);
        const barH = Math.max(2, (h - padY) - ry);
        const isLast = r === ribCount - 1;
        s += '<rect x="' + (rx - 2) + '" y="' + ry + '" width="4" height="' + barH + '" rx="2" fill="' + (isLast ? '#DCF291' : '#CBD6D3') + '" opacity="' + (isLast ? '1' : '0.65') + '"/>';
      }

      // Smooth area wash + primary #14191A curve
      s += '<path d="' + makeAreaPath('total') + '" fill="url(#nxAreaWash)"/>';
      s += '<path d="' + makeLinePath('total') + '" fill="none" stroke="#14191A" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>';

      // Terminal lime node
      const lastX = getX(pts.length - 1);
      const lastY = getY(pts[pts.length - 1].total);
      s += '<circle cx="' + lastX + '" cy="' + lastY + '" r="4.5" fill="#DCF291" stroke="#14191A" stroke-width="2"/>';

      // Crosshair tracking hairline
      s += '<line class="hl" id="nwHairline" x1="0" y1="' + padY + '" x2="0" y2="' + (h - padY) + '" stroke="#14191A" stroke-width="1" stroke-dasharray="3 3" style="opacity:0;"/>';

      svg.innerHTML = s;

      // Cursor movement tracking
      const hl = svg.querySelector('#nwHairline');
      svg.onmousemove = function(e) {
        const rect = svg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const clampedX = Math.max(padX, Math.min(w - padX, mouseX));
        hl.setAttribute('x1', clampedX);
        hl.setAttribute('x2', clampedX);
        hl.style.opacity = '1';

        // Find nearest point
        const pct = (clampedX - padX) / plotW;
        const ptIdx = Math.round(pct * (pts.length - 1));
        const pt = pts[ptIdx];
        if (pt) {
          showTip(e, pt.label, [
            { label: 'Total Tokens', value: formatNumber(pt.total), color: '#ffffff' },
            { label: 'Cache Read', value: formatNumber(pt.cacheTok), color: '#A9B2FF' },
            { label: 'Input Tokens', value: formatNumber(pt.inTok), color: '#ffffff' },
            { label: 'Output Tokens', value: formatNumber(pt.outTok), color: '#E8FF1F' }
          ]);
        }
      };

      svg.onmouseleave = function() {
        hl.style.opacity = '0';
        hideTip();
      };
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: 180-Degree Allocation Gauge (#alloc)                   */
    /* ------------------------------------------------------------------ */
    function renderAllocGauge(data) {
      const svg = document.getElementById('allocSvg');
      const list = document.getElementById('allocList');
      const models = data.modelStats || [];
      const totalTokens = Math.max(1, data.session.tokens.totalTokens);

      document.getElementById('allocModelCount').innerText = models.length + ' MODEL' + (models.length === 1 ? '' : 'S');

      // 180-degree semicircular ticks around rim
      const cx = 120, cy = 115, r = 90;
      let s = '';

      // Ticks from 180 deg to 0 deg
      for (let a = 180; a >= 0; a -= 3) {
        const rad = (a * Math.PI) / 180;
        const x1 = cx + r * Math.cos(rad);
        const y1 = cy - r * Math.sin(rad);
        const x2 = cx + (r - (a % 15 === 0 ? 9 : 5)) * Math.cos(rad);
        const y2 = cy - (r - (a % 15 === 0 ? 9 : 5)) * Math.sin(rad);
        s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>';
      }

      // Colored model arcs
      const colors = ['#E8FF1F', '#A9B2FF', '#FFB37A', '#38bdf8', '#10b981', '#f43f5e'];
      let currentDeg = 180;
      models.forEach(function(m, idx) {
        const share = m.tokens.totalTokens / totalTokens;
        const degSpan = share * 180;
        const endDeg = Math.max(0, currentDeg - degSpan);
        const c = colors[idx % colors.length];

        const rArc = 86;
        const radStart = (currentDeg * Math.PI) / 180;
        const radEnd = (endDeg * Math.PI) / 180;

        const sx = cx + rArc * Math.cos(radStart);
        const sy = cy - rArc * Math.sin(radStart);
        const ex = cx + rArc * Math.cos(radEnd);
        const ey = cy - rArc * Math.sin(radEnd);

        if (degSpan > 1) {
          s += '<path d="M ' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' A ' + rArc + ' ' + rArc + ' 0 0 1 ' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '" fill="none" stroke="' + c + '" stroke-width="5" stroke-linecap="round"/>';
        }
        currentDeg = endDeg;
      });

      // Dominant model pill in center
      const domModel = models[0] || { model: 'None', tokens: { totalTokens: 0 } };
      const domShare = Math.round((domModel.tokens.totalTokens / totalTokens) * 100);

      s += '<circle cx="' + cx + '" cy="' + cy + '" r="52" fill="#0b0b0c" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>';
      s += '<text x="' + cx + '" y="' + (cy - 10) + '" text-anchor="middle" fill="#E8FF1F" font-size="20" font-weight="700" font-family="Geist Mono">' + domShare + '%</text>';
      s += '<text x="' + cx + '" y="' + (cy + 10) + '" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="9" font-weight="600" text-transform="uppercase" letter-spacing="0.05em">' + (domModel.model || 'IDLE') + '</text>';

      svg.innerHTML = s;

      // List under gauge
      list.innerHTML = models.map(function(m, idx) {
        const sharePct = Math.round((m.tokens.totalTokens / totalTokens) * 100);
        const c = colors[idx % colors.length];
        return (
          '<div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:4px 0;">' +
          '<span style="display:flex; align-items:center; gap:6px;"><i style="width:7px; height:7px; border-radius:50%; background:' + c + '"></i>' + m.model + '</span>' +
          '<span class="mono" style="color:var(--t2); font-size:11.5px;">' + formatNumber(m.tokens.totalTokens) + ' <b style="color:#fff;">(' + sharePct + '%)</b></span>' +
          '</div>'
        );
      }).join('');
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Mirrored Wave Flow Chart (#flow)                       */
    /* ------------------------------------------------------------------ */
    function renderFlowChart(data) {
      const svg = document.getElementById('flowSvg');
      const w = svg.clientWidth || 450;
      const h = svg.clientHeight || 240;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      const mid = h / 2;
      const daily = data.dailyUsage || [];
      const pts = daily.length > 0 ? daily.slice(-8) : [{ tokens: data.session.tokens }];
      const maxIn = Math.max.apply(null, pts.map(function(p) { return p.tokens.inputTokens + p.tokens.cacheReadTokens; }).concat([1000]));
      const maxOut = Math.max.apply(null, pts.map(function(p) { return p.tokens.outputTokens; }).concat([500]));

      const plotW = w - 40;
      const getX = function(i) { return 20 + (i / Math.max(1, pts.length - 1)) * plotW; };

      // Upper curve (Ingestion)
      let pTop = 'M ' + getX(0) + ' ' + mid;
      pts.forEach(function(p, i) {
        const x = getX(i);
        const y = mid - ((p.tokens.inputTokens + p.tokens.cacheReadTokens) / maxIn) * (mid - 25);
        pTop += ' L ' + x + ' ' + y;
      });
      pTop += ' L ' + getX(pts.length - 1) + ' ' + mid + ' Z';

      // Lower curve (Generation)
      let pBot = 'M ' + getX(0) + ' ' + mid;
      pts.forEach(function(p, i) {
        const x = getX(i);
        const y = mid + (p.tokens.outputTokens / maxOut) * (mid - 25);
        pBot += ' L ' + x + ' ' + y;
      });
      pBot += ' L ' + getX(pts.length - 1) + ' ' + mid + ' Z';

      let s = '';
      s += '<line x1="10" y1="' + mid + '" x2="' + (w - 10) + '" y2="' + mid + '" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>';
      s += '<path d="' + pTop + '" fill="rgba(255,255,255,0.12)" stroke="#ffffff" stroke-width="1.6"/>';
      s += '<path d="' + pBot + '" fill="rgba(232,255,31,0.14)" stroke="#E8FF1F" stroke-width="1.8"/>';

      svg.innerHTML = s;
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Model Cards (#crypto) & Hourly Activity (#stocks)      */
    /* ------------------------------------------------------------------ */
    function renderModelSparklines(data) {
      const list = document.getElementById('cryptoList');
      const models = data.modelStats || [];
      if (models.length === 0) {
        list.innerHTML = '<div class="muted">No models recorded yet.</div>';
        return;
      }

      const total = Math.max(1, data.session.tokens.totalTokens);
      list.innerHTML = models.slice(0, 4).map(function(m) {
        const pct = Math.round((m.tokens.totalTokens / total) * 100);
        return (
          '<div style="background:rgba(255,255,255,0.03); border:1px solid var(--hair); border-radius:14px; padding:10px 14px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center;">' +
          '<span style="font-weight:700; font-size:13px;">' + m.model + '</span>' +
          '<span class="mono" style="font-size:12px; color:var(--acc);">' + pct + '%</span>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; font-size:11.5px; color:var(--t2); margin:4px 0 6px;">' +
          '<span>' + formatNumber(m.tokens.totalTokens) + ' tokens</span>' +
          '<span class="muted">' + m.invocationCount + ' turns</span>' +
          '</div>' +
          '<div style="height:4px; border-radius:9999px; background:rgba(255,255,255,0.06); overflow:hidden;">' +
          '<div style="width:' + pct + '%; height:100%; background:var(--acc);"></div>' +
          '</div>' +
          '</div>'
        );
      }).join('');
    }

    function renderHourlyCapsules(data) {
      const svg = document.getElementById('stocksSvg');
      const w = svg.clientWidth || 280;
      const h = svg.clientHeight || 220;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      const bars = 10;
      const barW = Math.max(12, Math.floor((w - 40) / bars) - 6);
      let s = '';

      for (let i = 0; i < bars; i++) {
        const x = 20 + i * (barW + 6);
        const barH = 30 + Math.sin(i * 0.8) * 40 + (i % 2 === 0 ? 35 : 10);
        const y = h - 25 - barH;
        s += '<rect x="' + x + '" y="' + y + '" width="' + barW + '" height="' + barH + '" rx="' + (barW / 2) + '" fill="rgba(16,185,129,0.75)" stroke="rgba(16,185,129,0.3)"/>';
      }
      s += '<line x1="15" y1="' + (h - 20) + '" x2="' + (w - 15) + '" y2="' + (h - 20) + '" stroke="rgba(255,255,255,0.1)"/>';

      svg.innerHTML = s;
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Overview KPI & Tables                                  */
    /* ------------------------------------------------------------------ */
    function setRefRange(range) {
      document.querySelectorAll('.ref-pill-btn').forEach(function(b) { b.classList.remove('active'); });
      const activeBtn = document.querySelector('.ref-pill-btn[onclick*="' + range + '"]');
      if (activeBtn) activeBtn.classList.add('active');
    }

    function renderOverview(data) {
      // 0. Reference Neo-Swiss Timeline & Discord Profile Updates
      const refTotalTok = (data.session && data.session.tokens) ? data.session.tokens.totalTokens : 0;
      const refInTok = (data.session && data.session.tokens) ? data.session.tokens.inputTokens : 0;
      const refCacheTok = (data.session && data.session.tokens) ? data.session.tokens.cacheReadTokens : 0;
      const refCacheRatio = (refInTok + refCacheTok > 0) ? Math.round((refCacheTok / (refInTok + refCacheTok)) * 100) : 0;
      const refTb = data.timeBreakdown || (data.session && data.session.timeBreakdown) || {};
      const refLifeSecs = typeof refTb.overall === 'number' ? refTb.overall : (data.session ? data.session.lifetimeActiveSeconds : 0) || 0;
      const refLast24Secs = typeof refTb.last24h === 'number' ? refTb.last24h : 0;
      const refWeeklySecs = typeof refTb.weekly === 'number' ? refTb.weekly : refLifeSecs;
      const refMonthlySecs = typeof refTb.monthly === 'number' ? refTb.monthly : refLifeSecs;

      const elOverall = document.getElementById('nxOverallTimeVal');
      if (elOverall) elOverall.innerText = formatLifetimeHours(refLifeSecs);
      const el24h = document.getElementById('nx24hTimeVal');
      if (el24h) el24h.innerText = formatLifetimeHours(refLast24Secs);
      const el7d30d = document.getElementById('nx7d30dTimeVal');
      if (el7d30d) el7d30d.innerText = formatLifetimeHours(refWeeklySecs) + ' • ' + formatLifetimeHours(refMonthlySecs);
      const elSessId = document.getElementById('nxSessionIdLabel');
      if (elSessId && data.session && data.session.sessionId) {
        elSessId.innerText = data.session.sessionId.replace(/^ext-/, '').toUpperCase().slice(0, 14);
      }

      if (data.discord && data.discord.user) {
        const u = data.discord.user;
        const displayName = u.globalName || u.username || 'Discord User';
        const tag = u.discriminator && u.discriminator !== '0' ? ' #' + u.discriminator : '';
        const pName = document.getElementById('nxProfileName');
        const pSub = document.getElementById('nxProfileSub');
        const pAv = document.getElementById('nxProfileAvatar');
        const hAv = document.getElementById('heroDiscordAvatar');
        const hIcon = document.getElementById('heroUserIcon');
        if (pName) pName.innerText = displayName + tag;
        if (pSub) pSub.innerText = data.discord.connected ? 'Discord Rich Presence Active' : 'Discord Standby';
        if (pAv && u.avatarUrl) {
          pAv.src = u.avatarUrl;
          pAv.style.display = 'block';
        }
        if (hAv && u.avatarUrl) {
          hAv.src = u.avatarUrl;
          hAv.style.display = 'block';
          if (hIcon) hIcon.style.display = 'none';
        }
      }

      // 1. Workspaces Pill
      const wsCount = (data.workspaces && data.workspaces.count) || 1;
      const wsPill = document.getElementById('workspaceText');
      if (wsPill) {
        wsPill.innerText = wsCount === 1 ? '1 Workspace' : wsCount + ' Workspaces';
      }

      // 2. Delta & Stream Wave
      const activeCount = data.activeAgents.length;
      const nwDeltaEl = document.getElementById('nwDelta');
      if (nwDeltaEl) nwDeltaEl.innerText = '+' + formatNumber(data.session.tokens.outputTokens) + ' out';
      renderNwStream(data);
      try { renderAllocGauge(data); } catch {}

      // 3. Null-safe KPI updates
      const kpiAg = document.getElementById('kpiAgentCount');
      if (kpiAg) kpiAg.innerText = activeCount;
      const kpiBadge = document.getElementById('kpiAgentBadge');
      const kpiAgSub = document.getElementById('kpiAgentSub');
      if (kpiBadge) {
        if (activeCount > 0) {
          const firstAgent = data.activeAgents[0];
          kpiBadge.innerText = firstAgent.status === 'running_tool' ? 'RUNNING TOOL' : 'THINKING';
          kpiBadge.className = 'status-badge ' + (firstAgent.status === 'running_tool' ? 'running_tool' : 'thinking');
          if (kpiAgSub) kpiAgSub.innerText = firstAgent.activeTool ? 'Tool: ' + firstAgent.activeTool : 'Planning step...';
        } else {
          kpiBadge.innerText = 'IDLE';
          kpiBadge.className = 'status-badge idle';
          if (kpiAgSub) kpiAgSub.innerText = 'Waiting for turn...';
        }
      }

      const kpiCachePctEl = document.getElementById('kpiCachePct');
      if (kpiCachePctEl) kpiCachePctEl.innerText = refCacheRatio + '%';
      const kpiCacheSubEl = document.getElementById('kpiCacheSub');
      if (kpiCacheSubEl) kpiCacheSubEl.innerText = formatNumber(refCacheTok) + ' cached tokens';
      const kpiConvsEl = document.getElementById('kpiConvsCount');
      if (kpiConvsEl) kpiConvsEl.innerText = data.session.totalConversations;
      const kpiConvsSubEl = document.getElementById('kpiConvsSub');
      if (kpiConvsSubEl) kpiConvsSubEl.innerText = data.conversations.length + ' registered sessions';

      // KPI Lifetime Hours & 5-Window Time/Token Matrix
      const tb = data.timeBreakdown || (data.session && data.session.timeBreakdown) || {
        last24h: data.session ? data.session.elapsedSeconds : 0,
        weekly: data.session ? data.session.lifetimeActiveSeconds : 0,
        monthly: data.session ? data.session.lifetimeActiveSeconds : 0,
        yearly: data.session ? data.session.lifetimeActiveSeconds : 0,
        overall: data.session ? data.session.lifetimeActiveSeconds : 0
      };
      const tokB = data.tokenBreakdown || (data.session && data.session.tokenBreakdown) || {
        last24h: data.session ? data.session.tokens : { totalTokens: 0 },
        weekly: data.session ? data.session.tokens : { totalTokens: 0 },
        monthly: data.session ? data.session.tokens : { totalTokens: 0 },
        yearly: data.session ? data.session.tokens : { totalTokens: 0 },
        overall: data.session ? data.session.tokens : { totalTokens: 0 }
      };

      const hrs24 = document.getElementById('hrs-24h');
      const hrsWk = document.getElementById('hrs-weekly');
      const hrsMo = document.getElementById('hrs-monthly');
      const hrsYr = document.getElementById('hrs-yearly');
      const hrsOv = document.getElementById('hrs-overall');
      if (hrs24) hrs24.innerText = formatLifetimeHours(tb.last24h);
      if (hrsWk) hrsWk.innerText = formatLifetimeHours(tb.weekly);
      if (hrsMo) hrsMo.innerText = formatLifetimeHours(tb.monthly);
      if (hrsYr) hrsYr.innerText = formatLifetimeHours(tb.yearly);
      if (hrsOv) hrsOv.innerText = formatLifetimeHours(tb.overall);

      const tok24 = document.getElementById('tok-24h');
      const tokWk = document.getElementById('tok-weekly');
      const tokMo = document.getElementById('tok-monthly');
      const tokYr = document.getElementById('tok-yearly');
      const tokOv = document.getElementById('tok-overall');
      if (tok24) tok24.innerText = formatNumberShort((tokB.last24h && tokB.last24h.totalTokens) || 0) + ' tokens';
      if (tokWk) tokWk.innerText = formatNumberShort((tokB.weekly && tokB.weekly.totalTokens) || 0) + ' tokens';
      if (tokMo) tokMo.innerText = formatNumberShort((tokB.monthly && tokB.monthly.totalTokens) || 0) + ' tokens';
      if (tokYr) tokYr.innerText = formatNumberShort((tokB.yearly && tokB.yearly.totalTokens) || 0) + ' tokens';
      if (tokOv) tokOv.innerText = formatNumberShort((tokB.overall && tokB.overall.totalTokens) || 0) + ' tokens';

      const lifetimeEl = document.getElementById('kpiLifetimeHours');
      if (lifetimeEl && data.session) {
        const lifeSecs = typeof tb.overall === 'number' ? tb.overall : (data.session.lifetimeActiveSeconds || 0);
        lifetimeEl.innerText = '24h: ' + formatLifetimeHours(tb.last24h || 0) + ' • Overall: ' + formatLifetimeHours(lifeSecs);
      }

      // Update Mascot Pedestal state, Companion controls, IDE status & GitHub Auto-Updater
      if (data.companion) {
        renderCompanionUi(data.companion, data.isAntigravityRunning);
      }
      if (data.ideStatus) {
        renderIdeStatusUi(data.ideStatus);
      }
      if (data.updater) {
        renderUpdaterUi(data.updater);
      }
      if (lastActiveAgentCount > 0 && activeCount === 0 && window.agMascotAudio) {
        window.agMascotAudio.playComplete();
      }
      lastActiveAgentCount = activeCount;

      if (data.isAntigravityRunning === false) {
        setDashMascotState('offline', '"Antigravity IDE Closed"', 'Discord RPC cleared • Waiting for launch');
      } else if (data.companion && data.companion.mascotBehavior === 'sleep' && activeCount === 0) {
        setDashMascotState('sleeping', '"Resting Circuits..."', 'Click mascot to wake up');
      } else if (activeCount > 0) {
        const lead = data.activeAgents[0];
        const mState = lead.status === 'running_tool' ? 'working' : 'thinking';
        const speech = lead.status === 'running_tool'
          ? '"Executing ' + (lead.activeTool || 'Tool') + '"'
          : '"Thinking with ' + (lead.model || 'Gemini') + '"';
        setDashMascotState(mState, speech, activeCount + ' active agent' + (activeCount === 1 ? '' : 's') + ' • Zero-lag RPC live');
      } else if (data.companion && data.companion.mascotBehavior === 'walk_follow') {
        setDashMascotState('walking', '"Following Your Cursor"', 'Walking on desktop • Click to command');
      } else {
        setDashMascotState('idle', '"Idle in Antigravity"', 'Overall: ' + formatLifetimeHours(tb.overall || 0) + ' • ' + formatNumberShort(totalTok) + ' tokens');
      }

      // 5. Mirrored Wave Flow, Sparklines & Hourly Activity
      renderFlowChart(data);
      renderModelSparklines(data);
      renderHourlyCapsules(data);

      // 6. Header Agent Pill
      const agCount = document.getElementById('agentActiveCount');
      const agDot = document.getElementById('agentDot');
      if (activeCount > 0) {
        agCount.innerText = activeCount + ' Active Agent' + (activeCount === 1 ? '' : 's');
        agDot.className = 'status-dot active pulsing';
      } else {
        agCount.innerText = 'Idle in Antigravity';
        agDot.className = 'status-dot';
      }

      // 7. Sessions Table
      document.getElementById('sessionTableCount').innerText = data.conversations.length + ' SESSIONS';
      const tbody = document.getElementById('overviewTableBody');
      tbody.innerHTML = data.conversations.map(function(c) {
        const isActive = c.status === 'thinking' || c.status === 'running_tool';
        const badgeClass = isActive ? (c.status === 'running_tool' ? 'running_tool' : 'thinking') : 'idle';
        const badgeText = isActive ? (c.status === 'running_tool' ? 'RUNNING TOOL' : 'THINKING') : 'IDLE';

        return (
          '<tr data-id="' + c.conversationId + '" onclick="openDrawer(this.dataset.id)">' +
          '<td><span class="status-badge ' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="mono">' + c.conversationId.slice(0, 14) + '...</td>' +
          '<td style="color:var(--t1); font-weight:600;">' + c.currentModel + '</td>' +
          '<td class="mono" style="color:var(--acc);">' + (c.activeTool ? c.activeTool : '--') + '</td>' +
          '<td class="mono">' + c.turnCount + '</td>' +
          '<td class="mono" style="font-weight:700;">' + formatNumber(c.tokens.totalTokens) + '</td>' +
          '<td>' + formatTime(c.lastEventAt) + '</td>' +
          '</tr>'
        );
      }).join('');
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Manual Editor Presence                                 */
    /* ------------------------------------------------------------------ */
    function renderEditor(editor) {
      if (!editor || !editor.fileName) {
        document.getElementById('editorFile').innerText = 'No active file in editor';
        document.getElementById('editorDetails').innerText = 'Waiting for Antigravity IDE focus';
        document.getElementById('editorBadge').innerText = 'IDLE';
        document.getElementById('editorBadge').className = 'status-badge idle';
        return;
      }

      document.getElementById('editorFile').innerText = 'Editing ' + editor.fileName;
      document.getElementById('editorDetails').innerText = editor.language + ' • Line ' + editor.currentLine + ' of ' + editor.totalLines + (editor.workspaceName ? ' (' + editor.workspaceName + ')' : '');
      document.getElementById('editorBadge').innerText = 'ACTIVE';
      document.getElementById('editorBadge').className = 'status-badge running_tool';
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Models Tab & Conversations Tab                         */
    /* ------------------------------------------------------------------ */
    function renderModelsTab(data) {
      const grid = document.getElementById('modelsCardsGrid');
      const models = data.modelStats || [];
      const totalTokens = Math.max(1, data.session.tokens.totalTokens);

      grid.innerHTML = models.map(function(m) {
        const share = Math.round((m.tokens.totalTokens / totalTokens) * 100);
        return (
          '<div style="background:var(--card-inner); border:1px solid var(--hair); border-radius:18px; padding:20px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
          '<span style="font-weight:700; font-size:1.1rem;">' + m.model + '</span>' +
          '<span class="chip" style="color:var(--acc);">' + share + '% share</span>' +
          '</div>' +
          '<div class="big-num mono" style="font-size:1.8rem; margin-bottom:8px;">' + formatNumber(m.tokens.totalTokens) + ' <span style="font-size:12px; color:var(--t3);">tokens</span></div>' +
          '<div style="font-size:12px; color:var(--t2); font-family:var(--font-mono); margin-bottom:12px;">' +
          'In: ' + formatNumber(m.tokens.inputTokens) + ' • Cache: ' + formatNumber(m.tokens.cacheReadTokens) + ' • Out: ' + formatNumber(m.tokens.outputTokens) +
          '</div>' +
          '<div style="font-size:11px; color:var(--t3);">Last used: ' + formatTime(m.lastUsedAt) + ' (' + m.invocationCount + ' turns)</div>' +
          '</div>'
        );
      }).join('');
    }

    function renderConversationsTab(data) {
      const tbody = document.getElementById('conversationsTableBody');
      tbody.innerHTML = data.conversations.map(function(c) {
        const isActive = c.status === 'thinking' || c.status === 'running_tool';
        const badgeClass = isActive ? (c.status === 'running_tool' ? 'running_tool' : 'thinking') : 'idle';
        const badgeText = isActive ? (c.status === 'running_tool' ? 'RUNNING TOOL' : 'THINKING') : 'IDLE';

        return (
          '<tr data-id="' + c.conversationId + '" onclick="openDrawer(this.dataset.id)">' +
          '<td><span class="status-badge ' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="mono">' + c.conversationId + '</td>' +
          '<td style="color:var(--t1); font-weight:600;">' + c.currentModel + '</td>' +
          '<td class="mono">' + formatNumber(c.tokens.inputTokens) + '</td>' +
          '<td class="mono" style="color:#A9B2FF;">' + formatNumber(c.tokens.cacheReadTokens) + '</td>' +
          '<td class="mono" style="color:var(--acc);">' + formatNumber(c.tokens.outputTokens) + '</td>' +
          '<td class="mono" style="font-weight:700;">' + formatNumber(c.tokens.totalTokens) + '</td>' +
          '<td>' + formatTime(c.lastEventAt) + '</td>' +
          '</tr>'
        );
      }).join('');
    }

    function renderAgentsTab(data) {
      const tbody = document.getElementById('agentsTableBody');
      tbody.innerHTML = data.agents.map(function(a) {
        const isActive = a.status === 'thinking' || a.status === 'running_tool';
        const badgeClass = isActive ? (a.status === 'running_tool' ? 'running_tool' : 'thinking') : 'idle';
        const badgeText = isActive ? (a.status === 'running_tool' ? 'RUNNING TOOL' : 'THINKING') : 'IDLE';

        return (
          '<tr data-id="' + a.conversationId + '" onclick="openDrawer(this.dataset.id)">' +
          '<td><span class="status-badge ' + badgeClass + '">' + badgeText + '</span></td>' +
          '<td class="mono">' + a.conversationId.slice(0, 18) + '...</td>' +
          '<td style="color:var(--t1); font-weight:600;">' + a.model + '</td>' +
          '<td class="mono" style="color:var(--acc);">' + (a.activeTool ? a.activeTool : '--') + '</td>' +
          '<td class="mono">--</td>' +
          '<td class="mono">--</td>' +
          '<td>' + formatTime(a.lastEventAt) + '</td>' +
          '</tr>'
        );
      }).join('');
    }

    /* ------------------------------------------------------------------ */
    /*  Renderers: Analytics Tab & 14-Day Stacked Token Histogram         */
    /* ------------------------------------------------------------------ */
    let analyticsTimeline = [];

    function renderAnalyticsTab(data) {
      if (!data) return;
      const svg = document.getElementById('tokenDailyChart');
      const container = document.getElementById('tokenDailyChartContainer');
      if (!svg || !container) return;

      const w = container.clientWidth || 900;
      const h = container.clientHeight || 320;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

      // 1. Strict 14-day calendar timeline ending Today
      const dayList = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const shortLabel = (i === 0) ? 'Today' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dayList.push({
          dateStr: dateStr,
          label: shortLabel,
          inputTokens: 0,
          cacheReadTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          modelsUsed: []
        });
      }

      // 2. Map existing dailyUsage into timeline
      const dailyMap = new Map();
      if (data.dailyUsage && data.dailyUsage.length > 0) {
        data.dailyUsage.forEach(function(u) {
          dailyMap.set(u.date, u);
        });
      }

      let total14d = 0;
      let totalCache14d = 0;
      let totalIn14d = 0;
      let peakDayTokens = 0;
      let peakDayLabel = '--';

      dayList.forEach(function(day) {
        const found = dailyMap.get(day.dateStr);
        if (found && found.tokens) {
          day.inputTokens = found.tokens.inputTokens || 0;
          day.cacheReadTokens = found.tokens.cacheReadTokens || 0;
          day.outputTokens = found.tokens.outputTokens || 0;
          day.totalTokens = found.tokens.totalTokens || (day.inputTokens + day.cacheReadTokens + day.outputTokens);
          day.modelsUsed = found.modelsUsed || [];
        }
        total14d += day.totalTokens;
        totalCache14d += day.cacheReadTokens;
        totalIn14d += day.inputTokens;

        if (day.totalTokens > peakDayTokens) {
          peakDayTokens = day.totalTokens;
          peakDayLabel = day.label + ' (' + formatNumber(peakDayTokens) + ')';
        }
      });

      // If dailyUsage was empty or today had no entry yet, map session tokens to Today
      if (total14d === 0 && data.session && data.session.tokens && data.session.tokens.totalTokens > 0) {
        const todayObj = dayList[dayList.length - 1];
        todayObj.inputTokens = data.session.tokens.inputTokens;
        todayObj.cacheReadTokens = data.session.tokens.cacheReadTokens;
        todayObj.outputTokens = data.session.tokens.outputTokens;
        todayObj.totalTokens = data.session.tokens.totalTokens;
        todayObj.modelsUsed = (data.modelStats || []).map(function(m) { return m.model; });
        total14d = todayObj.totalTokens;
        totalCache14d = todayObj.cacheReadTokens;
        totalIn14d = todayObj.inputTokens;
        peakDayTokens = total14d;
        peakDayLabel = 'Today (' + formatNumber(peakDayTokens) + ')';
      }

      analyticsTimeline = dayList;

      // 3. Update Summary Bento Cards
      document.getElementById('analyticsTotal14d').innerText = formatNumber(total14d) + ' TOKENS';
      const overallCacheRatio = (totalIn14d + totalCache14d > 0)
        ? Math.round((totalCache14d / (totalIn14d + totalCache14d)) * 100)
        : 0;
      document.getElementById('analyticsCacheRatio').innerText = overallCacheRatio + '%';
      document.getElementById('analyticsCacheDetail').innerText = formatNumber(totalCache14d) + ' cached tokens preserved';

      document.getElementById('analyticsPeakTokens').innerText = formatNumber(peakDayTokens);
      document.getElementById('analyticsPeakDate').innerText = peakDayTokens > 0 ? peakDayLabel : 'No activity yet';

      const models = data.modelStats || [];
      const topModel = models[0] || { model: 'None', tokens: { totalTokens: 0 } };
      const topShare = total14d > 0 ? Math.round((topModel.tokens.totalTokens / Math.max(1, data.session.tokens.totalTokens)) * 100) : 0;
      document.getElementById('analyticsDominantModel').innerText = topModel.model;
      document.getElementById('analyticsModelShare').innerText = topShare + '% SHARE';
      document.getElementById('analyticsModelTotal').innerText = formatNumber(topModel.tokens.totalTokens) + ' tokens accumulated';

      // 4. Render SVG Stacked Bar Chart
      const padLeft = 65;
      const padRight = 20;
      const padTop = 30;
      const padBottom = 40;
      const plotW = Math.max(200, w - padLeft - padRight);
      const plotH = Math.max(100, h - padTop - padBottom);

      const maxVal = Math.max(1, peakDayTokens);

      let s = '';

      // Horizontal Grid Lines & Y-Axis Labels
      const gridSteps = 4;
      for (let i = 0; i <= gridSteps; i++) {
        const yVal = (maxVal / gridSteps) * (gridSteps - i);
        const yPos = padTop + (i / gridSteps) * plotH;

        s += '<line x1="' + padLeft + '" y1="' + yPos + '" x2="' + (w - padRight) + '" y2="' + yPos + '" stroke="rgba(255,255,255,0.08)" stroke-dasharray="' + (i === gridSteps ? 'none' : '3,4') + '" stroke-width="1"/>';
        s += '<text x="' + (padLeft - 10) + '" y="' + (yPos + 4) + '" fill="rgba(255,255,255,0.4)" font-size="11" font-family="Geist Mono" text-anchor="end">' + formatNumberShort(yVal) + '</text>';
      }

      // Draw 14 stacked bars
      const barCount = dayList.length;
      const slotW = plotW / barCount;
      const barW = Math.max(14, Math.min(38, slotW - 12));

      dayList.forEach(function(d, i) {
        const xCenter = padLeft + i * slotW + slotW / 2;
        const xLeft = xCenter - barW / 2;

        const total = d.totalTokens;
        const cacheH = (d.cacheReadTokens / maxVal) * plotH;
        const inH = (d.inputTokens / maxVal) * plotH;
        const outH = (d.outputTokens / maxVal) * plotH;

        const yBase = padTop + plotH;

        if (total === 0) {
          s += '<rect x="' + xLeft + '" y="' + (yBase - 4) + '" width="' + barW + '" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>';
        } else {
          // 1. Cache Read (Emerald bottom)
          const yCache = yBase - cacheH;
          if (cacheH > 0) {
            s += '<rect x="' + xLeft + '" y="' + yCache + '" width="' + barW + '" height="' + cacheH + '" rx="' + (inH + outH === 0 ? 6 : 0) + '" fill="#10b981" opacity="0.9"/>';
          }

          // 2. Input Tokens (White middle)
          const yIn = yCache - inH;
          if (inH > 0) {
            s += '<rect x="' + xLeft + '" y="' + yIn + '" width="' + barW + '" height="' + inH + '" rx="' + (outH === 0 && cacheH === 0 ? 6 : 0) + '" fill="#ffffff" opacity="0.95"/>';
          }

          // 3. Output Tokens (Electric Lime top)
          const yOut = yIn - outH;
          if (outH > 0) {
            s += '<rect x="' + xLeft + '" y="' + yOut + '" width="' + barW + '" height="' + outH + '" rx="6" fill="#E8FF1F"/>';
          }
        }

        // X-Axis Date Label
        const isToday = i === barCount - 1;
        s += '<text x="' + xCenter + '" y="' + (yBase + 22) + '" fill="' + (isToday ? '#E8FF1F' : 'rgba(255,255,255,0.5)') + '" font-size="11" font-weight="' + (isToday ? '700' : '500') + '" font-family="Geist" text-anchor="middle">' + d.label + '</text>';

        // Hitbox for Tooltip Hover
        const colLeft = padLeft + i * slotW;
        s += '<rect class="bar-hitbox" data-idx="' + i + '" x="' + colLeft + '" y="' + padTop + '" width="' + slotW + '" height="' + plotH + '" fill="transparent" style="cursor:pointer;" onmouseenter="onBarHover(event, ' + i + ')" onmouseleave="onBarLeave()"/>';
      });

      svg.innerHTML = s;

      // 5. Populate Historical Ledger Table
      const tbody = document.getElementById('analyticsTableBody');
      if (tbody) {
        const tableDays = (data.dailyUsage && data.dailyUsage.length > 0)
          ? data.dailyUsage.slice().reverse()
          : [{
              date: new Date().toISOString().slice(0, 10),
              tokens: data.session.tokens,
              modelsUsed: models.map(function(m) { return m.model; })
            }];

        tbody.innerHTML = tableDays.map(function(row) {
          const inT = row.tokens.inputTokens;
          const cT = row.tokens.cacheReadTokens;
          const oT = row.tokens.outputTokens;
          const tot = row.tokens.totalTokens;
          const ratio = (inT + cT > 0) ? Math.round((cT / (inT + cT)) * 100) : 0;
          const isPeak = tot === peakDayTokens && tot > 0;

          const modelChips = (row.modelsUsed && row.modelsUsed.length > 0)
            ? row.modelsUsed.map(function(m) { return '<span class="chip" style="margin-right:4px;">' + m + '</span>'; }).join('')
            : '<span class="muted">--</span>';

          return (
            '<tr>' +
            '<td class="mono" style="font-weight:600;">' + row.date + (isPeak ? ' <span class="chip" style="color:var(--acc); border-color:var(--acc);">PEAK</span>' : '') + '</td>' +
            '<td class="mono" style="font-weight:700;">' + formatNumber(tot) + '</td>' +
            '<td class="mono" style="color:#10b981;">' + formatNumber(cT) + '</td>' +
            '<td class="mono">' + formatNumber(inT) + '</td>' +
            '<td class="mono" style="color:var(--acc);">' + formatNumber(oT) + '</td>' +
            '<td><span class="mono" style="font-weight:700; color:#10b981;">' + ratio + '%</span></td>' +
            '<td>' + modelChips + '</td>' +
            '</tr>'
          );
        }).join('');
        document.getElementById('analyticsTableCount').innerText = tableDays.length + ' DAYS RECORDED';
      }
    }

    function onBarHover(e, idx) {
      if (!analyticsTimeline || !analyticsTimeline[idx]) return;
      const d = analyticsTimeline[idx];
      const inT = d.inputTokens;
      const cT = d.cacheReadTokens;
      const oT = d.outputTokens;
      const tot = d.totalTokens;
      const ratio = (inT + cT > 0) ? Math.round((cT / (inT + cT)) * 100) : 0;

      showTip(e, d.dateStr + ' (' + d.label + ')', [
        { label: 'Total Tokens', value: formatNumber(tot), color: '#ffffff' },
        { label: 'Prompt Cache Hit', value: ratio + '% (' + formatNumber(cT) + ')', color: '#10b981' },
        { label: 'Input Tokens', value: formatNumber(inT), color: '#ffffff' },
        { label: 'Output Tokens', value: formatNumber(oT), color: '#E8FF1F' },
        { label: 'Active Models', value: (d.modelsUsed && d.modelsUsed.length > 0 ? d.modelsUsed.join(', ') : 'None'), color: '#A9B2FF' }
      ]);
    }

    function onBarLeave() {
      hideTip();
    }

    /* ------------------------------------------------------------------ */
    /*  Slide-Over Drawer Inspection                                      */
    /* ------------------------------------------------------------------ */
    async function openDrawer(convId) {
      activeConversationId = convId;
      document.getElementById('drawerOverlay').classList.add('open');
      document.getElementById('drawerConvId').innerText = convId;

      try {
        const res = await fetch('/api/conversations/' + convId);
        if (res.ok) {
          const detail = await res.json();
          renderDrawerData(detail);
        }
      } catch (err) {
        console.error('Failed to fetch conversation details', err);
      }
    }

    function renderDrawerData(c) {
      document.getElementById('drawerModel').innerText = c.currentModel || '--';
      const inT = c.tokens.inputTokens;
      const cacheT = c.tokens.cacheReadTokens;
      const ratio = (inT + cacheT > 0) ? Math.round((cacheT / (inT + cacheT)) * 100) : 0;

      document.getElementById('drawerCacheBar').style.width = ratio + '%';
      document.getElementById('drawerCacheRatio').innerText = ratio + '%';
      document.getElementById('drawerInTokens').innerText = formatNumber(c.tokens.inputTokens);
      document.getElementById('drawerCacheTokens').innerText = formatNumber(c.tokens.cacheReadTokens);
      document.getElementById('drawerOutTokens').innerText = formatNumber(c.tokens.outputTokens);

      const eventsContainer = document.getElementById('drawerEvents');
      if (c.recentEvents && c.recentEvents.length > 0) {
        eventsContainer.innerHTML = c.recentEvents.map(function(ev) {
          return (
            '<div style="background:rgba(255,255,255,0.02); border:1px solid var(--hair); border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">' +
            '<span style="font-weight:600; font-size:12px;">' + (ev.toolName ? 'Tool: ' + ev.toolName : ev.type) + '</span>' +
            '<span class="mono" style="font-size:11px; color:var(--t3);">' + formatTime(ev.timestamp) + '</span>' +
            '</div>'
          );
        }).join('');
      } else {
        eventsContainer.innerHTML = '<div class="muted">No recent tool events recorded.</div>';
      }
    }

    function closeDrawer(e) {
      if (e && e.target !== document.getElementById('drawerOverlay') && !e.target.classList.contains('drawer-close')) return;
      document.getElementById('drawerOverlay').classList.remove('open');
      activeConversationId = null;
    }

    /* ------------------------------------------------------------------ */
    /*  Settings Sync & EventSource Stream                                */
    /* ------------------------------------------------------------------ */
    const API_BASE = (window.location.protocol === 'vscode-webview:' || !window.location.host || !window.location.host.startsWith('127.0.0.1'))
      ? 'http://127.0.0.1:41177'
      : '';

    function renderSettings(s) {
      document.getElementById('settingDisablePresence').checked = !!s.disableRichPresence;
      document.getElementById('settingHideModels').checked = !!s.hideModels;
      document.getElementById('settingHideFileNames').checked = !!s.hideFileNamesInManualEdits;
      document.getElementById('settingEnableManualPresence').checked = !!s.enableManualEditsPresence;
    }

    async function updateSetting(key, val) {
      const body = {};
      body[key] = val;
      await fetch(API_BASE + '/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    function updateAll(data) {
      if (!data) return;
      currentData = data;
      try { renderOverview(data); } catch (e) { console.error('Overview render error:', e); }
      try { renderModelsTab(data); } catch (e) { console.error('Models render error:', e); }
      try { renderConversationsTab(data); } catch (e) { console.error('Conversations render error:', e); }
      try { renderAgentsTab(data); } catch (e) { console.error('Agents render error:', e); }
      try { renderAnalyticsTab(data); } catch (e) { console.error('Analytics render error:', e); }
      if (data.editor) { try { renderEditor(data.editor); } catch (e) {} }
      if (data.discord) { try { renderDiscord(data.discord); } catch (e) {} }
      if (data.settings) { try { renderSettings(data.settings); } catch (e) {} }

      isSessionPaused = !!(data.isPaused || (data.settings && data.settings.pauseTracking));
      updatePauseLeaveUi(isSessionPaused);

      if (data.session && data.session.startedAt) {
        startLiveSessionTimer(data.session.startedAt, isSessionPaused);
      }

      if (activeConversationId) {
        const activeConv = (data.conversations || []).find(function(c) { return c.conversationId === activeConversationId; });
        if (activeConv) { try { renderDrawerData(activeConv); } catch (e) {} }
      }
    }

    window.addEventListener('resize', function() {
      if (currentData) {
        renderOverview(currentData);
        renderAnalyticsTab(currentData);
      }
    });

    let sseClient = null;
    let sseRetryTimer = null;

    function startSSE() {
      if (sseClient) {
        try { sseClient.close(); } catch {}
        sseClient = null;
      }
      if (sseRetryTimer) {
        clearTimeout(sseRetryTimer);
        sseRetryTimer = null;
      }

      try {
        const es = new EventSource(API_BASE + '/api/stream');
        sseClient = es;

        es.onmessage = function(e) {
          try {
            const payload = JSON.parse(e.data);
            updateAll(payload);
          } catch {}
        };

        es.onerror = function() {
          try { es.close(); } catch {}
          if (sseClient === es) {
            sseClient = null;
          }
          renderDiscord({ connected: false });
          if (!sseRetryTimer) {
            sseRetryTimer = setTimeout(function() {
              sseRetryTimer = null;
              startSSE();
            }, 3000);
          }
        };
      } catch (err) {
        if (!sseRetryTimer) {
          sseRetryTimer = setTimeout(function() {
            sseRetryTimer = null;
            startSSE();
          }, 3000);
        }
      }
    }

    async function init() {
      try {
        const res = await fetch(API_BASE + '/api/overview');
        if (res.ok) {
          const json = await res.json();
          updateAll(json);
        } else {
          renderDiscord({ connected: false });
        }
      } catch (err) {
        renderDiscord({ connected: false });
      }
      startSSE();
    }

    init();
  </script>
</body>
</html>`;
}
