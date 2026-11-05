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

export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Presence — Local Dashboard</title>
  <style>
    :root {
      --bg: #000000;
      --card-bg: #0b0b0c;
      --card-inner: #111114;
      --acc: #E8FF1F;
      --t1: #ffffff;
      --t2: rgba(255, 255, 255, 0.62);
      --t3: rgba(255, 255, 255, 0.38);
      --hair: rgba(255, 255, 255, 0.12);
      --hair-subtle: rgba(255, 255, 255, 0.06);
      --ease: cubic-bezier(0.32, 0.72, 0, 1);
      
      --flash: #E8FF1F;
      --argon: #A9B2FF;
      --sonnet: #FFB37A;
      --lite: #38bdf8;
      --emerald: #10b981;
      --purple: #c084fc;
      --rose: #f43f5e;
      --amber: #f59e0b;

      --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "Geist Mono", SFMono-Regular, monospace;
      --font-pixel: "Minecraft Seven", monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: var(--bg);
      color: var(--t1);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 0%, rgba(232, 255, 31, 0.05) 0%, transparent 40%),
        radial-gradient(circle at 85% 100%, rgba(169, 178, 255, 0.05) 0%, transparent 45%);
    }

    /* TOP BAR */
    header {
      background: rgba(10, 10, 12, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid var(--hair);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(232, 255, 31, 0.2), rgba(169, 178, 255, 0.15));
      border: 1px solid rgba(232, 255, 31, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(232, 255, 31, 0.15);
    }

    .brand-icon svg {
      width: 20px;
      height: 20px;
      fill: var(--acc);
    }

    .brand-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pixel-tag {
      font-family: var(--font-pixel);
      font-size: 0.68rem;
      background: rgba(232, 255, 31, 0.12);
      border: 1px solid rgba(232, 255, 31, 0.3);
      color: var(--acc);
      padding: 2px 7px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--hair);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--t2);
      transition: all 0.25s var(--ease);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--t3);
      transition: background 0.25s var(--ease);
    }

    .status-dot.active {
      background: var(--emerald);
      box-shadow: 0 0 10px var(--emerald);
    }

    .status-dot.amber {
      background: var(--amber);
      box-shadow: 0 0 8px var(--amber);
    }

    .status-dot.pulsing {
      animation: pulse-dot 1.6s infinite ease-in-out;
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.35); opacity: 0.7; }
    }

    /* NAVIGATION TABS */
    .tabs-wrapper {
      padding: 12px 28px 0;
      border-bottom: 1px solid var(--hair);
      display: flex;
      justify-content: flex-start;
      background: #000;
    }

    .nav-tabs {
      display: flex;
      gap: 6px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--t2);
      font-family: var(--font-sans);
      font-size: 0.84rem;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 12px 12px 0 0;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }

    .tab-btn:hover {
      color: var(--t1);
    }

    .tab-btn.active {
      color: var(--acc);
      background: rgba(232, 255, 31, 0.06);
      border-bottom: 2px solid var(--acc);
    }

    /* MAIN CONTAINER */
    main {
      flex: 1;
      padding: 24px 28px 48px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
    }

    .view-panel {
      display: none;
    }

    .view-panel.active {
      display: block;
      animation: fadeIn 0.3s var(--ease);
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: none; }
    }

    /* PRO BENTO GRID */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 16px;
    }

    .card {
      position: relative;
      border-radius: 28px;
      overflow: hidden;
      background: var(--card-bg);
      border: 1px solid var(--hair);
      transition: border-color 0.25s var(--ease), box-shadow 0.25s var(--ease);
    }

    .card:hover {
      border-color: rgba(255, 255, 255, 0.2);
    }

    .rim {
      position: absolute;
      inset: 0;
      border-radius: inherit;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
      pointer-events: none;
      z-index: 9;
    }

    .core {
      position: absolute;
      left: 10%;
      right: 10%;
      top: 16%;
      bottom: -6%;
      border-radius: 90px;
      filter: blur(60px);
      pointer-events: none;
      opacity: 0.85;
    }

    .in-c {
      position: relative;
      padding: 22px 24px;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .h1 { height: 380px; }
    .h2 { height: 168px; }
    .h3 { height: 330px; }

    #nw { grid-column: span 8; }
    #alloc { grid-column: span 4; }
    .kpi { grid-column: span 3; }
    #flow { grid-column: span 5; }
    #crypto { grid-column: span 4; }
    #stocks { grid-column: span 3; }
    .full-width { grid-column: span 12; }

    @media (max-width: 1199px) {
      #nw { grid-column: span 12; }
      #alloc { grid-column: span 6; }
      .kpi { grid-column: span 6; }
      #flow { grid-column: span 12; }
      #crypto, #stocks { grid-column: span 6; }
    }

    @media (max-width: 767px) {
      .bento-grid { gap: 12px; }
      #nw { height: 420px; }
      #alloc { grid-column: span 12; }
      .kpi { grid-column: span 12; }
      #crypto, #stocks { grid-column: span 12; }
    }

    /* CARD HEADER TYPOGRAPHY */
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .ttl {
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cap {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--t2);
    }

    .big-num {
      font-size: 2.2rem;
      font-weight: 300;
      letter-spacing: -0.04em;
      line-height: 1.1;
      font-family: var(--font-sans);
      font-variant-numeric: tabular-nums;
      color: #fff;
    }

    .delta {
      font: 600 12.5px var(--font-mono);
      color: var(--acc);
      letter-spacing: -0.02em;
    }

    .muted {
      font-size: 12px;
      color: var(--t3);
      font-weight: 500;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 9px;
      border-radius: 11px;
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      font: 600 11px var(--font-mono);
      letter-spacing: -0.02em;
      border: 1px solid var(--hair);
    }

    .legend {
      display: flex;
      gap: 16px;
      font-size: 12px;
      font-weight: 500;
      color: var(--t2);
    }

    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .legend i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mono {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }

    /* SEGMENTED TOGGLE */
    .seg {
      display: flex;
      padding: 3px;
      gap: 2px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .seg button {
      border: 0;
      height: 26px;
      min-width: 40px;
      padding: 0 10px;
      border-radius: 10px;
      background: transparent;
      color: var(--t2);
      font: 600 11.5px var(--font-sans);
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }

    .seg button[aria-pressed="true"] {
      background: #fff;
      color: #000;
    }

    /* DOT MATRIX SVG */
    .dots circle {
      transition: opacity 0.26s, transform 0.26s;
      transform-box: fill-box;
      transform-origin: center;
    }

    /* FLOATING TOOLTIP */
    .tip {
      position: fixed;
      z-index: 200;
      pointer-events: none;
      background: rgba(14, 14, 16, 0.94);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 10px 14px;
      font-size: 12px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      box-shadow: 0 16px 36px -10px rgba(0, 0, 0, 0.7);
      opacity: 0;
      transform: translateY(4px);
      transition: opacity 0.15s, transform 0.15s;
      white-space: nowrap;
      min-width: 160px;
    }

    .tip.on {
      opacity: 1;
      transform: none;
    }

    .tip .t {
      color: var(--t2);
      margin-bottom: 6px;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .tip .r {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      align-items: center;
      line-height: 20px;
    }

    .tip .r span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--t2);
    }

    .tip i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .tip b {
      font: 500 12px var(--font-mono);
      color: #fff;
    }

    /* SVG CHART ELEMENTS */
    svg line.hl {
      stroke: rgba(255, 255, 255, 0.35);
      stroke-dasharray: 3 3;
      stroke-width: 1px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s;
    }

    svg g.chart-hover:hover line.hl {
      opacity: 1;
    }

    /* CONVERSATION TABLE & DRAWER */
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin-top: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.82rem;
    }

    th {
      text-align: left;
      padding: 10px 14px;
      color: var(--t3);
      font-weight: 600;
      font-size: 0.72rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      border-bottom: 1px solid var(--hair);
    }

    td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--hair-subtle);
      color: var(--t2);
    }

    tr:hover td {
      background: rgba(255, 255, 255, 0.02);
      color: var(--t1);
      cursor: pointer;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
    }

    .status-badge.thinking {
      background: rgba(56, 189, 248, 0.14);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .status-badge.running_tool {
      background: rgba(232, 255, 31, 0.14);
      color: var(--acc);
      border: 1px solid rgba(232, 255, 31, 0.3);
    }

    .status-badge.idle {
      background: rgba(255, 255, 255, 0.06);
      color: var(--t3);
      border: 1px solid var(--hair);
    }

    /* SLIDE OVER DRAWER */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 300;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s var(--ease);
    }

    .drawer-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }

    .drawer-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 90vw;
      background: #0d0d10;
      border-left: 1px solid var(--hair);
      z-index: 310;
      transform: translateX(100%);
      transition: transform 0.3s var(--ease);
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
      overflow-y: auto;
    }

    .drawer-overlay.open .drawer-panel {
      transform: translateX(0);
    }

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--hair);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .drawer-close {
      background: transparent;
      border: none;
      color: var(--t2);
      font-size: 1.4rem;
      cursor: pointer;
      line-height: 1;
    }

    .drawer-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    /* FOOTER */
    footer {
      border-top: 1px solid var(--hair);
      padding: 20px 28px;
      text-align: center;
      color: var(--t3);
      font-size: 0.75rem;
      font-family: var(--font-sans);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    footer a {
      color: var(--t2);
      text-decoration: none;
    }

    footer a:hover {
      color: var(--acc);
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <header>
    <div class="brand-group">
      <div class="brand-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 19.5h20L12 2zm0 3.8L18.5 17H5.5L12 5.8z"/></svg>
      </div>
      <div>
        <div class="brand-title">
          Antigravity Presence
          <span class="pixel-tag">LOCAL 127.0.0.1</span>
        </div>
      </div>
    </div>

    <div class="header-actions">
      <div class="status-pill" id="tokenmaxxingPill" style="border-color:rgba(232,255,31,0.3); background:rgba(232,255,31,0.06);">
        <span style="color:var(--acc); font-weight:700;" id="tokenmaxxingText">⚡ TOKENMAXXING • 0</span>
      </div>
      <div class="status-pill" id="workspacePill" title="Open workspaces">
        <span id="workspaceText">1 Workspace</span>
      </div>
      <div class="status-pill">
        <div id="discordDot" class="status-dot"></div>
        <span id="discordText">Discord: Connecting...</span>
      </div>
      <div class="status-pill">
        <div id="agentDot" class="status-dot active pulsing"></div>
        <span id="agentActiveCount">0 Active Agents</span>
      </div>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <div class="tabs-wrapper">
    <nav class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('overview', this)">Overview</button>
      <button class="tab-btn" onclick="switchTab('agents', this)">Agents</button>
      <button class="tab-btn" onclick="switchTab('models', this)">Models & Tokens</button>
      <button class="tab-btn" onclick="switchTab('conversations', this)">Conversations</button>
      <button class="tab-btn" onclick="switchTab('analytics', this)">Analytics</button>
      <button class="tab-btn" onclick="switchTab('settings', this)">Settings</button>
    </nav>
  </div>

  <!-- FLOATING TOOLTIP -->
  <div class="tip" id="globalTip"></div>

  <!-- MAIN -->
  <main>

    <!-- OVERVIEW TAB -->
    <section id="tab-overview" class="view-panel active">
      <div class="bento-grid">

        <!-- 1. CUMULATIVE TOKENS STREAM WAVE (#nw, span 8) -->
        <div class="card h1" id="nw">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(169, 178, 255, 0.22), rgba(64, 50, 130, 0.08));"></div>
          <div class="in-c">
            <div class="card-top">
              <div>
                <div class="cap">CUMULATIVE TOKENS STREAM</div>
                <div class="ttl" style="margin-top:2px;">
                  <span id="nwTitleText">Session Token Volume</span>
                  <span class="delta" id="nwDelta">+0 this turn</span>
                  <span class="chip" style="margin-left:8px; font-size:11px; color:var(--acc); border-color:var(--acc);" id="nwMaxxingChip">⚡ AI MAXXING</span>
                </div>
              </div>
              <div class="seg" id="nwSeg">
                <button type="button" aria-pressed="true" onclick="setNwSpan('all')">All</button>
                <button type="button" aria-pressed="false" onclick="setNwSpan('30d')">30d</button>
                <button type="button" aria-pressed="false" onclick="setNwSpan('7d')">7d</button>
                <button type="button" aria-pressed="false" onclick="setNwSpan('24h')">24h</button>
              </div>
            </div>

            <!-- DotNumber matrix SVG -->
            <div id="nwDotNumber" style="margin: 4px 0 10px; height: 32px; display: flex; align-items: center;"></div>

            <!-- Legend -->
            <div class="legend" style="margin-bottom: 8px;">
              <span><i style="background:#ffffff;"></i>Input: <b id="legIn" class="mono">0</b></span>
              <span><i style="background:var(--argon);"></i>Cache Read: <b id="legCache" class="mono">0</b></span>
              <span><i style="background:var(--acc);"></i>Output: <b id="legOut" class="mono">0</b></span>
            </div>

            <!-- Interactive SVG Stream Wave -->
            <div style="flex:1; width:100%; position:relative;" id="nwSvgContainer">
              <svg id="nwSvg" style="width:100%; height:100%; overflow:visible; cursor:crosshair;"></svg>
            </div>
          </div>
        </div>

        <!-- 2. MODEL TOKEN ALLOCATION GAUGE (#alloc, span 4) -->
        <div class="card h1" id="alloc">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(232, 255, 31, 0.16), rgba(40, 50, 10, 0.06));"></div>
          <div class="in-c">
            <div class="card-top">
              <div class="cap">MODEL TOKEN SHARE</div>
              <span class="chip" id="allocModelCount">0 MODELS</span>
            </div>
            <div class="ttl">Token Allocation</div>

            <!-- 180-degree Half Gauge SVG -->
            <div style="height: 180px; position:relative; margin-top: 6px;" id="allocGaugeContainer">
              <svg id="allocSvg" viewBox="0 0 240 130" style="width:100%; height:100%; overflow:visible;"></svg>
            </div>

            <!-- Model Allocation Table List -->
            <div id="allocList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; margin-top:6px;"></div>
          </div>
        </div>

        <!-- 3. KPI 1: ACTIVE AGENTS -->
        <div class="card h2 kpi" id="kpiAgents">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.08));"></div>
          <div class="in-c" style="justify-content: space-between;">
            <div class="card-top" style="margin-bottom:0;">
              <span class="cap">ACTIVE AGENTS</span>
              <span class="status-badge thinking" id="kpiAgentBadge">IDLE</span>
            </div>
            <div>
              <div class="big-num" id="kpiAgentCount">0</div>
              <div class="muted" id="kpiAgentSub" style="margin-top:2px;">Waiting for turn...</div>
            </div>
          </div>
        </div>

        <!-- 4. KPI 2: CACHE HIT EFFICIENCY -->
        <div class="card h2 kpi" id="kpiCache">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(232, 255, 31, 0.2), rgba(16, 185, 129, 0.1));"></div>
          <div class="in-c" style="justify-content: space-between;">
            <div class="card-top" style="margin-bottom:0;">
              <span class="cap">CACHE EFFICIENCY</span>
              <span class="chip">PROMPT CACHE</span>
            </div>
            <div>
              <div class="big-num" id="kpiCachePct" style="color:var(--acc);">0%</div>
              <div class="muted" id="kpiCacheSub" style="margin-top:2px;">0 prompt tokens saved</div>
            </div>
          </div>
        </div>

        <!-- 5. KPI 3: TOTAL CONVERSATIONS -->
        <div class="card h2 kpi" id="kpiConvs">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(169, 178, 255, 0.18), rgba(99, 102, 241, 0.08));"></div>
          <div class="in-c" style="justify-content: space-between;">
            <div class="card-top" style="margin-bottom:0;">
              <span class="cap">CONVERSATIONS</span>
              <span class="chip">WATERMARKED</span>
            </div>
            <div>
              <div class="big-num" id="kpiConvsCount">0</div>
              <div class="muted" id="kpiConvsSub" style="margin-top:2px;">0 root • 0 subagents</div>
            </div>
          </div>
        </div>

        <!-- 6. KPI 4: SESSION ELAPSED TIMER -->
        <div class="card h2 kpi" id="kpiSession">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(244, 63, 94, 0.18), rgba(168, 85, 247, 0.08));"></div>
          <div class="in-c" style="justify-content: space-between;">
            <div class="card-top" style="margin-bottom:0;">
              <span class="cap">SESSION TIMER</span>
              <span class="status-badge running_tool">ANTIGRAVITY</span>
            </div>
            <div>
              <div class="big-num mono" id="kpiSessionTimer">00:00:00</div>
              <div class="muted" id="kpiSessionSub" style="margin-top:2px;">Preserved across turns</div>
            </div>
          </div>
        </div>

        <!-- 7. MIRRORED WAVE TOKEN FLOW (#flow, span 5) -->
        <div class="card h3" id="flow">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(244, 63, 94, 0.14), rgba(168, 85, 247, 0.08));"></div>
          <div class="in-c">
            <div class="card-top">
              <div>
                <div class="cap">INGESTION VS GENERATION FLOW</div>
                <div class="ttl" style="margin-top:2px;">Token I/O Flow</div>
              </div>
              <div class="legend" style="font-size:11px;">
                <span><i style="background:#ffffff;"></i>Ingestion (▲)</span>
                <span><i style="background:var(--acc);"></i>Generation (▼)</span>
              </div>
            </div>
            <div style="flex:1; width:100%; position:relative;">
              <svg id="flowSvg" style="width:100%; height:100%; overflow:visible; cursor:crosshair;"></svg>
            </div>
          </div>
        </div>

        <!-- 8. MODEL TOKEN DISTRIBUTION (#crypto, span 4) -->
        <div class="card h3" id="crypto">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(255, 179, 122, 0.16), rgba(180, 83, 9, 0.08));"></div>
          <div class="in-c">
            <div class="card-top">
              <div class="cap">MODELS USAGE</div>
              <span class="chip">PERSISTENT</span>
            </div>
            <div class="ttl">Model Distribution</div>
            <div id="cryptoList" style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
          </div>
        </div>

        <!-- 9. HOURLY ACTIVITY CAPSULES (#stocks, span 3) -->
        <div class="card h3" id="stocks">
          <div class="rim"></div>
          <div class="core" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.08));"></div>
          <div class="in-c">
            <div class="card-top">
              <div class="cap">ACTIVITY PULSE</div>
              <span class="chip">HOURLY</span>
            </div>
            <div class="ttl">Token Ingestion</div>
            <div style="flex:1; width:100%; position:relative; margin-top:6px;">
              <svg id="stocksSvg" style="width:100%; height:100%; overflow:visible;"></svg>
            </div>
          </div>
        </div>

        <!-- 10. DUAL-MODE MANUAL CODING PRESENCE (span 12) -->
        <div class="card full-width" style="height: auto;" id="editorCard">
          <div class="rim"></div>
          <div class="in-c" style="padding: 16px 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:36px; height:36px; border-radius:10px; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <div>
                  <div style="font-weight:700; font-size:0.95rem;" id="editorFile">No active file in editor</div>
                  <div style="font-size:0.75rem; color:var(--t3); margin-top:2px;" id="editorDetails">Waiting for Antigravity IDE focus</div>
                </div>
              </div>
              <span class="status-badge idle" id="editorBadge">IDLE</span>
            </div>
          </div>
        </div>

        <!-- 11. ACTIVE SESSIONS TABLE (span 12) -->
        <div class="card full-width" style="height: auto;">
          <div class="rim"></div>
          <div class="in-c">
            <div class="card-top">
              <div class="cap">DISCOVERED CONVERSATIONS & SESSIONS</div>
              <span class="chip" id="sessionTableCount">0 SESSIONS</span>
            </div>
            <div class="ttl">Active Agent Sessions</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Conversation ID</th>
                    <th>Model</th>
                    <th>Active Tool</th>
                    <th>Turn</th>
                    <th>Total Tokens</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody id="overviewTableBody"></tbody>
              </table>
            </div>
          </div>
        </div>

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
            <div class="cap">HISTORICAL USAGE TELEMETRY</div>
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
    </section>

  </main>

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

    function setNwSpan(span) {
      nwSpan = span;
      document.querySelectorAll('#nwSeg button').forEach(function(b) {
        b.setAttribute('aria-pressed', b.innerText.toLowerCase() === span ? 'true' : 'false');
      });
      if (currentData) renderNwStream(currentData);
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

    function startLiveSessionTimer(startedAtIso) {
      if (sessionTimerInterval) clearInterval(sessionTimerInterval);
      const startMs = Date.parse(startedAtIso) || Date.now();

      function update() {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
        const hrs = Math.floor(elapsedSec / 3600);
        const mins = Math.floor((elapsedSec % 3600) / 60);
        const secs = elapsedSec % 60;
        const pad = function(n) { return n < 10 ? '0' + n : String(n); };
        document.getElementById('kpiSessionTimer').innerText = pad(hrs) + ':' + pad(mins) + ':' + pad(secs);
      }

      update();
      sessionTimerInterval = setInterval(update, 1000);
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

      // Update DotNumber matrix
      if (!dotNumInstance) {
        dotNumInstance = createDotNumber(document.getElementById('nwDotNumber'), 4);
      }
      dotNumInstance.count(spanTotal);

      // Update Title & Legend
      const titleEl = document.getElementById('nwTitleText');
      if (titleEl) {
        titleEl.innerText = timeframeTitle;
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
      s += '<linearGradient id="nwGradIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
      s += '<linearGradient id="nwGradCache" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#A9B2FF" stop-opacity="0.3"/><stop offset="100%" stop-color="#A9B2FF" stop-opacity="0"/></linearGradient>';
      s += '<linearGradient id="nwGradOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E8FF1F" stop-opacity="0.35"/><stop offset="100%" stop-color="#E8FF1F" stop-opacity="0"/></linearGradient>';
      s += '</defs>';

      // Horizontal subtle grid
      for (let g = 0; g <= 4; g++) {
        const yG = padY + (g / 4) * plotH;
        s += '<line x1="' + padX + '" y1="' + yG + '" x2="' + (w - padX) + '" y2="' + yG + '" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>';
      }

      // Filled Area curves
      s += '<path d="' + makeAreaPath('total') + '" fill="url(#nwGradIn)"/>';
      s += '<path d="' + makeAreaPath('cacheTok') + '" fill="url(#nwGradCache)"/>';
      s += '<path d="' + makeAreaPath('outTok') + '" fill="url(#nwGradOut)"/>';

      // Stroke lines
      s += '<path d="' + makeLinePath('total') + '" fill="none" stroke="#ffffff" stroke-width="1.8"/>';
      s += '<path d="' + makeLinePath('cacheTok') + '" fill="none" stroke="#A9B2FF" stroke-width="1.8"/>';
      s += '<path d="' + makeLinePath('outTok') + '" fill="none" stroke="#E8FF1F" stroke-width="2"/>';

      // Crosshair tracking hairline
      s += '<line class="hl" id="nwHairline" x1="0" y1="' + padY + '" x2="0" y2="' + (h - padY) + '"/>';

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
    function renderOverview(data) {
      // 1. Workspaces Pill
      const wsCount = (data.workspaces && data.workspaces.count) || 1;
      const wsNames = (data.workspaces && data.workspaces.names) || [];
      const wsPill = document.getElementById('workspaceText');
      if (wsPill) {
        wsPill.innerText = wsCount === 1 ? '1 Workspace' : wsCount + ' Workspaces';
        if (wsNames.length > 0) {
          const wsElem = document.getElementById('workspacePill');
          if (wsElem) wsElem.title = 'Active Workspaces:\n' + wsNames.join('\n');
        }
      }

      // 2. Tokenmaxxing Pill
      const totalTok = (data.session && data.session.tokens) ? data.session.tokens.totalTokens : 0;
      const maxxingText = document.getElementById('tokenmaxxingText');
      if (maxxingText) {
        maxxingText.innerText = '⚡ TOKENMAXXING • ' + formatNumberShort(totalTok);
      }

      // 3. Delta
      const activeCount = data.activeAgents.length;
      document.getElementById('nwDelta').innerText = '+' + formatNumber(data.session.tokens.outputTokens) + ' out tokens';

      // 4. Stream Wave (calculates spanTotal, updates dot matrix, legend, and curve for nwSpan)
      renderNwStream(data);

      // 5. Allocation Gauge
      renderAllocGauge(data);

      // 4. KPI Cards
      document.getElementById('kpiAgentCount').innerText = activeCount;
      const kpiBadge = document.getElementById('kpiAgentBadge');
      if (activeCount > 0) {
        const firstAgent = data.activeAgents[0];
        const status = firstAgent.status === 'running_tool' ? 'RUNNING TOOL' : 'THINKING';
        kpiBadge.innerText = status;
        kpiBadge.className = 'status-badge ' + (firstAgent.status === 'running_tool' ? 'running_tool' : 'thinking');
        document.getElementById('kpiAgentSub').innerText = firstAgent.activeTool ? 'Tool: ' + firstAgent.activeTool : 'Planning step...';
      } else {
        kpiBadge.innerText = 'IDLE';
        kpiBadge.className = 'status-badge idle';
        document.getElementById('kpiAgentSub').innerText = 'Waiting for turn...';
      }

      // KPI Cache efficiency
      const inT = data.session.tokens.inputTokens;
      const cacheT = data.session.tokens.cacheReadTokens;
      const cacheRatio = (inT + cacheT > 0) ? Math.round((cacheT / (inT + cacheT)) * 100) : 0;
      document.getElementById('kpiCachePct').innerText = cacheRatio + '%';
      document.getElementById('kpiCacheSub').innerText = formatNumber(cacheT) + ' cached tokens';

      // KPI Conversations
      document.getElementById('kpiConvsCount').innerText = data.session.totalConversations;
      document.getElementById('kpiConvsSub').innerText = data.conversations.length + ' registered sessions';

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
    function renderSettings(s) {
      document.getElementById('settingDisablePresence').checked = !!s.disableRichPresence;
      document.getElementById('settingHideModels').checked = !!s.hideModels;
      document.getElementById('settingHideFileNames').checked = !!s.hideFileNamesInManualEdits;
      document.getElementById('settingEnableManualPresence').checked = !!s.enableManualEditsPresence;
    }

    async function updateSetting(key, val) {
      const body = {};
      body[key] = val;
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    function updateAll(data) {
      currentData = data;
      renderOverview(data);
      renderModelsTab(data);
      renderConversationsTab(data);
      renderAgentsTab(data);
      renderAnalyticsTab(data);
      if (data.editor) renderEditor(data.editor);
      if (data.discord) renderDiscord(data.discord);
      if (data.settings) renderSettings(data.settings);
      if (data.session && data.session.startedAt) startLiveSessionTimer(data.session.startedAt);

      if (activeConversationId) {
        const activeConv = data.conversations.find(function(c) { return c.conversationId === activeConversationId; });
        if (activeConv) renderDrawerData(activeConv);
      }
    }

    window.addEventListener('resize', function() {
      if (currentData) {
        renderOverview(currentData);
        renderAnalyticsTab(currentData);
      }
    });

    function startSSE() {
      const es = new EventSource('/api/stream');
      es.onmessage = function(e) {
        try {
          const payload = JSON.parse(e.data);
          updateAll(payload);
        } catch {}
      };
      es.onerror = function() {
        renderDiscord({ connected: false });
        setTimeout(startSSE, 3000);
      };
    }

    async function init() {
      try {
        const res = await fetch('/api/overview');
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
