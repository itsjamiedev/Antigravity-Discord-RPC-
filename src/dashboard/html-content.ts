/**
 * Antigravity Presence — Executive OLED Spatial Glass Dashboard
 *
 * Implements /impeccable and /design-taste-frontend architectural standards:
 * - Executive OLED Dark Aesthetic (#05070c) with double-bezel (Doppelrand) nested cards
 * - Geist / Geist Mono typography with Minecraft Seven pixel header badge
 * - Real-time SSE streaming for instant zero-latency updates
 * - Interactive slide-over conversation detail drawer with live agent status & active tool
 * - Per-model token accounting and visual distribution bars
 * - Multi-layer stacked SVG token graphs with hover tooltips
 * - 100% self-contained, zero-CDN, offline-ready
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
      --bg-base: #05070c;
      --bg-surface: #0a0e1a;
      --bg-card: #0d1222;
      --bg-card-inner: #090d18;
      --border-outer: rgba(255, 255, 255, 0.08);
      --border-inner: rgba(255, 255, 255, 0.05);
      --border-focus: rgba(56, 189, 248, 0.4);
      --text-main: #f8fafc;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.2);
      --emerald: #10b981;
      --emerald-glow: rgba(16, 185, 129, 0.2);
      --amber: #f59e0b;
      --amber-glow: rgba(245, 158, 11, 0.2);
      --rose: #f43f5e;
      --purple: #a855f7;
      --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "Geist Mono", "JetBrains Mono", SFMono-Regular, monospace;
      --font-pixel: "Minecraft Seven", "Courier New", monospace;
      --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      font-family: var(--font-sans);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 10% 0%, rgba(56, 189, 248, 0.06) 0%, transparent 45%),
        radial-gradient(circle at 90% 100%, rgba(16, 185, 129, 0.05) 0%, transparent 45%);
    }

    /* TOP FLOATING NAV */
    header {
      background: rgba(7, 10, 18, 0.82);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-bottom: 1px solid var(--border-outer);
      padding: 12px 28px;
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
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(16, 185, 129, 0.15));
      border: 1px solid rgba(56, 189, 248, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(56, 189, 248, 0.15);
    }

    .brand-icon svg {
      width: 18px;
      height: 18px;
      fill: var(--accent);
    }

    .brand-title {
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .pixel-tag {
      font-family: var(--font-pixel);
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.12);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
      letter-spacing: 0.08em;
    }

    /* HEADER CONTROLS */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.78rem;
      font-weight: 500;
      padding: 5px 12px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-outer);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .status-dot.active {
      background: var(--emerald);
      box-shadow: 0 0 10px var(--emerald-glow), 0 0 4px var(--emerald);
      animation: pulse-glow 2s infinite ease-in-out;
    }

    .status-dot.amber {
      background: var(--amber);
      box-shadow: 0 0 10px var(--amber-glow);
    }

    @keyframes pulse-glow {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.15); opacity: 0.8; }
    }

    /* NAV TABS */
    .tabs-wrapper {
      max-width: 1400px;
      margin: 20px auto 0;
      padding: 0 28px;
      width: 100%;
    }

    .nav-tabs {
      display: inline-flex;
      background: rgba(13, 18, 34, 0.7);
      border: 1px solid var(--border-outer);
      border-radius: 9999px;
      padding: 4px;
      gap: 4px;
    }

    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.82rem;
      font-weight: 500;
      padding: 6px 18px;
      border-radius: 9999px;
      cursor: pointer;
      transition: all 0.2s var(--ease-spring);
    }

    .tab-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.04);
    }

    .tab-btn.active {
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.35);
      box-shadow: 0 2px 10px rgba(56, 189, 248, 0.12);
    }

    /* MAIN CONTAINER */
    main {
      max-width: 1400px;
      margin: 16px auto 60px;
      padding: 0 28px;
      width: 100%;
      flex: 1;
    }

    .view-panel {
      display: none;
      animation: fadeIn 0.3s var(--ease-spring);
    }

    .view-panel.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* DOUBLE-BEZEL CARDS */
    .bezel-card {
      border-radius: 20px;
      border: 1px solid var(--border-outer);
      background: rgba(255, 255, 255, 0.015);
      padding: 6px;
      margin-bottom: 24px;
      transition: border-color 0.2s var(--ease-spring);
    }

    .bezel-card:hover {
      border-color: rgba(255, 255, 255, 0.14);
    }

    .bezel-core {
      background: var(--bg-card-inner);
      border-radius: 14px;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.06);
      padding: 24px;
      border: 1px solid var(--border-inner);
    }

    /* BENTO GRID HERO */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      border-radius: 18px;
      border: 1px solid var(--border-outer);
      background: rgba(255, 255, 255, 0.012);
      padding: 5px;
    }

    .stat-core {
      background: #090d18;
      border-radius: 13px;
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid var(--border-inner);
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .stat-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .badge-exact {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .badge-live {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      padding: 2px 7px;
      border-radius: 9999px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .stat-value {
      font-size: 1.85rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
      font-variant-numeric: tabular-nums;
    }

    .stat-sub {
      font-size: 0.76rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    /* MANUAL EDITOR PRESENCE CARD */
    .editor-presence-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .editor-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .editor-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--accent);
    }

    .editor-title {
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      margin-bottom: 2px;
    }

    .editor-meta {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-family: var(--font-mono);
    }

    /* DATA TABLES */
    .table-container {
      width: 100%;
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.84rem;
    }

    th {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-outer);
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      color: var(--text-secondary);
      vertical-align: middle;
    }

    tbody tr {
      transition: background 0.15s var(--ease-spring);
      cursor: pointer;
    }

    tbody tr:hover {
      background: rgba(255, 255, 255, 0.025);
    }

    .conv-title {
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .model-badge {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.08);
      white-space: nowrap;
    }

    .status-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-tag.thinking {
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent);
      border: 1px solid rgba(56, 189, 248, 0.35);
    }

    .status-tag.running_tool {
      background: rgba(16, 185, 129, 0.15);
      color: var(--emerald);
      border: 1px solid rgba(16, 185, 129, 0.35);
    }

    .status-tag.idle {
      background: rgba(148, 163, 184, 0.1);
      color: var(--text-muted);
      border: 1px solid rgba(148, 163, 184, 0.2);
    }

    .mono-num {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      color: var(--text-main);
    }

    /* SLIDE-OVER CONVERSATION DETAIL DRAWER */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s var(--ease-spring);
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
      width: 520px;
      max-width: 90vw;
      background: #080b14;
      border-left: 1px solid var(--border-outer);
      box-shadow: -8px 0 32px rgba(0, 0, 0, 0.6);
      z-index: 201;
      transform: translateX(100%);
      transition: transform 0.3s var(--ease-spring);
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 32px 28px;
    }

    .drawer-panel.open {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-outer);
    }

    .drawer-title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }

    .drawer-id {
      font-family: var(--font-mono);
      font-size: 0.74rem;
      color: var(--text-muted);
      word-break: break-all;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-outer);
      color: var(--text-secondary);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s var(--ease-spring);
    }

    .close-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .drawer-section {
      margin-bottom: 24px;
    }

    .section-heading {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 12px;
    }

    .token-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .token-box {
      background: #0d1220;
      border: 1px solid var(--border-inner);
      border-radius: 10px;
      padding: 12px 14px;
    }

    .token-box-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .token-box-val {
      font-family: var(--font-mono);
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
    }

    .progress-bar-wrap {
      background: rgba(255, 255, 255, 0.06);
      height: 8px;
      border-radius: 9999px;
      overflow: hidden;
      margin-top: 8px;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--emerald));
      border-radius: 9999px;
      transition: width 0.4s var(--ease-spring);
    }

    /* RECENT EVENTS LIST */
    .event-timeline {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-inner);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.78rem;
    }

    .event-type {
      font-weight: 600;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .event-time {
      font-family: var(--font-mono);
      color: var(--text-muted);
      font-size: 0.72rem;
    }

    /* INTERACTIVE SVG CHARTS */
    .chart-container {
      width: 100%;
      position: relative;
    }

    .chart-svg {
      width: 100%;
      height: 220px;
      overflow: visible;
    }

    .chart-tooltip {
      position: absolute;
      background: rgba(13, 18, 32, 0.95);
      border: 1px solid var(--accent);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.75rem;
      color: #fff;
      pointer-events: none;
      display: none;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      z-index: 10;
      font-family: var(--font-mono);
    }

    /* MODEL USAGE CARDS */
    .model-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .model-card-item {
      background: #090d18;
      border: 1px solid var(--border-inner);
      border-radius: 14px;
      padding: 18px;
    }

    .model-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .model-card-name {
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }

    /* TOAST */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #0d1222;
      border: 1px solid var(--accent);
      color: #fff;
      padding: 10px 18px;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-family: var(--font-sans);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      z-index: 300;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.25s var(--ease-spring);
      pointer-events: none;
    }

    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }

    /* RESPONSIVE OVERRIDES */
    @media (max-width: 1024px) {
      .bento-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .bento-grid {
        grid-template-columns: 1fr;
      }
      .nav-tabs {
        width: 100%;
        overflow-x: auto;
      }
      .drawer-panel {
        width: 100vw;
      }
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
      <div class="status-pill">
        <div id="discordDot" class="status-dot"></div>
        <span id="discordText">Discord: Connecting...</span>
      </div>
      <div class="status-pill">
        <div id="agentDot" class="status-dot active"></div>
        <span id="agentActiveCount">0 Active Agents</span>
      </div>
    </div>
  </header>

  <!-- NAVIGATION TABS -->
  <div class="tabs-wrapper">
    <nav class="nav-tabs">
      <button class="tab-btn active" onclick="switchTab('overview')">Overview</button>
      <button class="tab-btn" onclick="switchTab('agents')">Agents</button>
      <button class="tab-btn" onclick="switchTab('models')">Models & Tokens</button>
      <button class="tab-btn" onclick="switchTab('conversations')">Conversations</button>
      <button class="tab-btn" onclick="switchTab('analytics')">Analytics Graphs</button>
      <button class="tab-btn" onclick="switchTab('settings')">Settings</button>
    </nav>
  </div>

  <!-- MAIN VIEWS -->
  <main>

    <!-- OVERVIEW TAB -->
    <section id="tab-overview" class="view-panel active">
      <!-- HERO BENTO GRID -->
      <div class="bento-grid">
        <div class="stat-card">
          <div class="stat-core">
            <div class="stat-header">
              <span class="stat-label">Active AI Agents</span>
              <span class="badge-live">LIVE</span>
            </div>
            <div class="stat-value" id="statActiveAgents">0</div>
            <div class="stat-sub" id="statActiveSub">Waiting for turn...</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-core">
            <div class="stat-header">
              <span class="stat-label">Total Session Tokens</span>
              <span class="badge-exact">EXACT</span>
            </div>
            <div class="stat-value mono-num" id="statSessionTokens">0</div>
            <div class="stat-sub" id="statTokensSub">In: 0 • Cache: 0 • Out: 0</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-core">
            <div class="stat-header">
              <span class="stat-label">Models in Use</span>
              <span class="badge-exact">PERSISTED</span>
            </div>
            <div class="stat-value" id="statModelsCount">0</div>
            <div class="stat-sub" id="statModelsSub">None</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-core">
            <div class="stat-header">
              <span class="stat-label">Total Conversations</span>
              <span class="badge-exact">EXACT</span>
            </div>
            <div class="stat-value mono-num" id="statConversations">0</div>
            <div class="stat-sub" id="statConversationsSub">0 root • 0 subagents</div>
          </div>
        </div>
      </div>

      <!-- DUAL-MODE MANUAL EDITOR PRESENCE -->
      <div class="bezel-card">
        <div class="bezel-core">
          <div class="editor-presence-card">
            <div class="editor-info">
              <div class="editor-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div>
                <div class="editor-title" id="editorFile">No active file in editor</div>
                <div class="editor-meta" id="editorDetails">Waiting for Antigravity IDE focus</div>
              </div>
            </div>
            <div class="status-tag idle" id="editorBadge">IDLE</div>
          </div>
        </div>
      </div>

      <!-- ACTIVE AGENTS & RECENT CONVERSATIONS TABLE -->
      <div class="bezel-card">
        <div class="bezel-core">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h3 style="font-size:0.95rem; font-weight:700; color:#fff;">Active Conversations & Sessions</h3>
            <span style="font-size:0.75rem; color:var(--text-muted);">Click row to inspect agent status & tokens</span>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Conversation</th>
                  <th>Model</th>
                  <th>Active Tool</th>
                  <th>Turn</th>
                  <th>Tokens</th>
                  <th>Last Event</th>
                </tr>
              </thead>
              <tbody id="overviewTableBody">
                <tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Loading conversations...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- AGENTS TAB -->
    <section id="tab-agents" class="view-panel">
      <div class="bezel-card">
        <div class="bezel-core">
          <div style="margin-bottom:20px;">
            <h3 style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:4px;">Active & Discovered Agents</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary);">Real-time status of AI agents running across all Antigravity workspaces.</p>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Conversation ID</th>
                  <th>Model</th>
                  <th>Active Tool</th>
                  <th>Started At</th>
                  <th>Last Event</th>
                </tr>
              </thead>
              <tbody id="agentsTableBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- MODELS & TOKENS TAB -->
    <section id="tab-models" class="view-panel">
      <div class="bezel-card">
        <div class="bezel-core">
          <div style="margin-bottom:20px;">
            <h3 style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:4px;">Model Token Accounting</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary);">Exact cumulative token consumption tracked per model across restarts.</p>
          </div>
          <div class="model-cards-grid" id="modelCardsGrid">
            <!-- Dynamically populated model cards -->
          </div>
        </div>
      </div>
    </section>

    <!-- CONVERSATIONS TAB -->
    <section id="tab-conversations" class="view-panel">
      <div class="bezel-card">
        <div class="bezel-core">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div>
              <h3 style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:4px;">All Tracked Conversations</h3>
              <p style="font-size:0.8rem; color:var(--text-secondary);">Click any conversation to slide open its live agent status, tool calls, and token breakdown.</p>
            </div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Conversation ID</th>
                  <th>Status</th>
                  <th>Model</th>
                  <th>Turns</th>
                  <th>Input</th>
                  <th>Cache Read</th>
                  <th>Output</th>
                  <th>Total</th>
                  <th>Last Active</th>
                </tr>
              </thead>
              <tbody id="conversationsFullTableBody">
                <!-- Populated via JS -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- ANALYTICS TAB -->
    <section id="tab-analytics" class="view-panel">
      <div class="bezel-card">
        <div class="bezel-core">
          <div style="margin-bottom:20px;">
            <h3 style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:4px;">Daily Token Consumption Trend</h3>
            <p style="font-size:0.8rem; color:var(--text-secondary);">Interactive stacked token history (Emerald = Cache Read, Cyan = Input, Purple = Output). Hover for exact values.</p>
          </div>

          <div class="chart-container">
            <svg id="tokenDailyChart" class="chart-svg"></svg>
            <div id="chartTooltip" class="chart-tooltip"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- SETTINGS TAB -->
    <section id="tab-settings" class="view-panel">
      <div class="bezel-card">
        <div class="bezel-core" style="max-width: 640px;">
          <h3 style="font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:16px;">Privacy & Presence Configuration</h3>
          <div style="display:flex; flex-direction:column; gap:16px;">
            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; cursor:pointer;">
              <span>Disable Discord Rich Presence</span>
              <input type="checkbox" id="settingDisablePresence" onchange="updateSetting('disableRichPresence', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; cursor:pointer;">
              <span>Hide Model Names in Rich Presence</span>
              <input type="checkbox" id="settingHideModels" onchange="updateSetting('hideModels', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; cursor:pointer;">
              <span>Hide File Names in Manual Coding Mode</span>
              <input type="checkbox" id="settingHideFileNames" onchange="updateSetting('hideFileNamesInManualEdits', this.checked)">
            </label>
            <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; cursor:pointer;">
              <span>Enable Dual-Mode Manual Editor Presence</span>
              <input type="checkbox" id="settingEnableManualPresence" onchange="updateSetting('enableManualEditsPresence', this.checked)">
            </label>
          </div>
        </div>
      </div>
    </section>

  </main>

  <!-- SLIDE-OVER CONVERSATION DETAIL DRAWER -->
  <div id="drawerOverlay" class="drawer-overlay" onclick="closeDrawer()"></div>
  <aside id="drawerPanel" class="drawer-panel">
    <div class="drawer-header">
      <div>
        <div class="drawer-title" id="drawerTitle">Conversation Details</div>
        <div class="drawer-id" id="drawerId">--</div>
      </div>
      <button class="close-btn" onclick="closeDrawer()" title="Close Drawer (Esc)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- STATUS & ACTIVE TOOL -->
    <div class="drawer-section">
      <div class="section-heading">Agent Execution State</div>
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
        <span id="drawerStatusTag" class="status-tag thinking">Thinking</span>
        <span id="drawerModelBadge" class="model-badge">Gemini 3.8 Flash</span>
      </div>
      <div id="drawerActiveToolCard" style="display:none; background:#0e1424; border:1px solid rgba(16, 185, 129, 0.3); border-radius:10px; padding:12px 14px;">
        <div style="font-size:0.7rem; color:var(--emerald); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">Currently Running Tool</div>
        <div id="drawerActiveToolName" style="font-family:var(--font-mono); font-size:0.95rem; font-weight:700; color:#fff;">run_command</div>
      </div>
    </div>

    <!-- TOKEN BREAKDOWN & CACHE HIT RATIO -->
    <div class="drawer-section">
      <div class="section-heading">Token Accounting & Efficiency</div>
      <div class="token-grid">
        <div class="token-box">
          <div class="token-box-label">Input Tokens</div>
          <div class="token-box-val mono-num" id="drawerInTokens">0</div>
        </div>
        <div class="token-box">
          <div class="token-box-label">Cache Read Tokens</div>
          <div class="token-box-val mono-num" id="drawerCacheTokens">0</div>
        </div>
        <div class="token-box">
          <div class="token-box-label">Output Tokens</div>
          <div class="token-box-val mono-num" id="drawerOutTokens">0</div>
        </div>
        <div class="token-box">
          <div class="token-box-label">Total Tokens</div>
          <div class="token-box-val mono-num" id="drawerTotalTokens">0</div>
        </div>
      </div>

      <div style="background:#090d18; border:1px solid var(--border-inner); border-radius:10px; padding:12px 14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">Context Cache Efficiency</span>
          <span id="drawerCacheRatio" style="font-family:var(--font-mono); font-size:0.8rem; font-weight:700; color:var(--emerald);">0%</span>
        </div>
        <div class="progress-bar-wrap">
          <div id="drawerCacheBar" class="progress-bar-fill" style="width: 0%;"></div>
        </div>
      </div>
    </div>

    <!-- RECENT ACTIVITY TIMELINE -->
    <div class="drawer-section">
      <div class="section-heading">Recent Event Timeline</div>
      <div class="event-timeline" id="drawerEventList">
        <div style="color:var(--text-muted); font-size:0.78rem;">No events recorded.</div>
      </div>
    </div>

    <div style="margin-top:auto; padding-top:16px;">
      <button onclick="copyCurrentConvId()" style="width:100%; padding:10px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid var(--border-outer); color:#fff; font-family:var(--font-sans); font-size:0.82rem; cursor:pointer; font-weight:600;">
        Copy Conversation ID
      </button>
    </div>
  </aside>

  <!-- TOAST FEEDBACK -->
  <div id="toast" class="toast">Copied to clipboard</div>

  <!-- CLIENT-SIDE SCRIPT -->
  <script>
    let activeConversationId = null;
    let currentData = null;

    function formatNumber(num) {
      if (typeof num !== 'number' || isNaN(num)) return '0';
      return num.toLocaleString();
    }

    function formatTime(iso) {
      if (!iso) return '--';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch {
        return '--';
      }
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

      event.target.classList.add('active');
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.add('active');

      if (tabId === 'analytics' && currentData) {
        renderSvgAnalytics(currentData.dailyUsage);
      }
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }

    function copyCurrentConvId() {
      if (activeConversationId) {
        navigator.clipboard.writeText(activeConversationId);
        showToast('Conversation ID copied!');
      }
    }

    function openDrawer(convId) {
      activeConversationId = convId;
      document.getElementById('drawerId').innerText = convId;
      document.getElementById('drawerOverlay').classList.add('open');
      document.getElementById('drawerPanel').classList.add('open');

      fetch('/api/conversations/' + convId)
        .then(res => res.json())
        .then(data => renderDrawerData(data))
        .catch(() => {
          // Fallback to local cached conversation
          if (currentData) {
            const found = currentData.conversations.find(c => c.conversationId === convId);
            if (found) renderDrawerData(found);
          }
        });
    }

    function closeDrawer() {
      document.getElementById('drawerOverlay').classList.remove('open');
      document.getElementById('drawerPanel').classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });

    function renderDrawerData(data) {
      if (!data) return;

      document.getElementById('drawerTitle').innerText = data.title || 'Agent Conversation';
      document.getElementById('drawerModelBadge').innerText = data.currentModel || 'Gemini 3.8 Flash';

      const statusTag = document.getElementById('drawerStatusTag');
      statusTag.className = 'status-tag ' + (data.status || 'idle');
      statusTag.innerText = (data.status || 'idle').replace('_', ' ');

      const toolCard = document.getElementById('drawerActiveToolCard');
      if (data.activeTool) {
        toolCard.style.display = 'block';
        document.getElementById('drawerActiveToolName').innerText = data.activeTool;
      } else {
        toolCard.style.display = 'none';
      }

      const tok = data.tokens || { inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, totalTokens: 0 };
      document.getElementById('drawerInTokens').innerText = formatNumber(tok.inputTokens);
      document.getElementById('drawerCacheTokens').innerText = formatNumber(tok.cacheReadTokens);
      document.getElementById('drawerOutTokens').innerText = formatNumber(tok.outputTokens);
      document.getElementById('drawerTotalTokens').innerText = formatNumber(tok.totalTokens);

      const ratio = typeof data.cacheHitRatio === 'number' ? data.cacheHitRatio : (
        tok.inputTokens + tok.cacheReadTokens > 0
          ? Math.round((tok.cacheReadTokens / (tok.inputTokens + tok.cacheReadTokens)) * 100)
          : 0
      );

      document.getElementById('drawerCacheRatio').innerText = ratio + '% Cached';
      document.getElementById('drawerCacheBar').style.width = ratio + '%';

      const eventList = document.getElementById('drawerEventList');
      if (Array.isArray(data.recentEvents) && data.recentEvents.length > 0) {
        eventList.innerHTML = data.recentEvents
          .map(function (e) {
            return (
              '<div class="event-item">' +
              '<span class="event-type">' +
              (e.toolName
                ? '<span style="color:var(--emerald)">⚡ ' + e.toolName + '</span>'
                : e.type) +
              '</span>' +
              '<span class="event-time">' +
              formatTime(e.timestamp) +
              '</span>' +
              '</div>'
            );
          })
          .join('');
      } else {
        eventList.innerHTML =
          '<div style="color:var(--text-muted); font-size:0.78rem;">No recent events recorded.</div>';
      }
    }

    function renderOverview(data) {
      document.getElementById('statActiveAgents').innerText = data.session.activeAgentCount || 0;
      document.getElementById('agentActiveCount').innerText =
        (data.session.activeAgentCount || 0) + ' Active Agents';

      const tok = data.session.tokens;
      document.getElementById('statSessionTokens').innerText = formatNumber(tok.totalTokens);
      document.getElementById('statTokensSub').innerText =
        'In: ' +
        formatNumber(tok.inputTokens) +
        ' • Cache: ' +
        formatNumber(tok.cacheReadTokens) +
        ' • Out: ' +
        formatNumber(tok.outputTokens);

      document.getElementById('statModelsCount').innerText = data.modelStats.length;
      document.getElementById('statModelsSub').innerText =
        data.modelStats
          .map(function (m) {
            return m.model;
          })
          .join(', ') || 'None';

      document.getElementById('statConversations').innerText = data.conversations.length;

      // Table
      const tbody = document.getElementById('overviewTableBody');
      if (!data.conversations || data.conversations.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No active agents detected</td></tr>';
        return;
      }

      tbody.innerHTML = data.conversations
        .map(function (c) {
          return (
            '<tr onclick="openDrawer(\'' +
            c.conversationId +
            '\')">' +
            '<td><span class="status-tag ' +
            c.status +
            '">' +
            c.status.replace('_', ' ') +
            '</span></td>' +
            '<td><div class="conv-title">' +
            (c.title || c.conversationId.slice(0, 18) + '...') +
            '</div></td>' +
            '<td><span class="model-badge">' +
            c.currentModel +
            '</span></td>' +
            '<td class="mono-num">' +
            (c.activeTool ? '<span style="color:var(--emerald);">⚡ ' + c.activeTool + '</span>' : '--') +
            '</td>' +
            '<td class="mono-num">' +
            c.turnCount +
            '</td>' +
            '<td class="mono-num">' +
            formatNumber(c.tokens.totalTokens) +
            '</td>' +
            '<td>' +
            formatTime(c.lastEventAt) +
            '</td>' +
            '</tr>'
          );
        })
        .join('');

      // Full table on Conversations tab
      const fullTbody = document.getElementById('conversationsFullTableBody');
      fullTbody.innerHTML = data.conversations
        .map(function (c) {
          return (
            '<tr onclick="openDrawer(\'' +
            c.conversationId +
            '\')">' +
            '<td style="font-family:var(--font-mono); font-size:0.75rem; color:#fff;">' +
            c.conversationId +
            '</td>' +
            '<td><span class="status-tag ' +
            c.status +
            '">' +
            c.status.replace('_', ' ') +
            '</span></td>' +
            '<td><span class="model-badge">' +
            c.currentModel +
            '</span></td>' +
            '<td class="mono-num">' +
            c.turnCount +
            '</td>' +
            '<td class="mono-num">' +
            formatNumber(c.tokens.inputTokens) +
            '</td>' +
            '<td class="mono-num" style="color:var(--emerald);">' +
            formatNumber(c.tokens.cacheReadTokens) +
            '</td>' +
            '<td class="mono-num" style="color:var(--purple);">' +
            formatNumber(c.tokens.outputTokens) +
            '</td>' +
            '<td class="mono-num" style="font-weight:700;">' +
            formatNumber(c.tokens.totalTokens) +
            '</td>' +
            '<td>' +
            formatTime(c.lastEventAt) +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

    function renderModels(data) {
      const container = document.getElementById('modelCardsGrid');
      if (!data.modelStats || data.modelStats.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted);">No models recorded yet.</div>';
        return;
      }

      const totalSessionTokens = Math.max(1, data.session.tokens.totalTokens);

      container.innerHTML = data.modelStats
        .map(function (m) {
          const sharePct = Math.round((m.tokens.totalTokens / totalSessionTokens) * 100);
          const inPct =
            m.tokens.totalTokens > 0 ? Math.round((m.tokens.inputTokens / m.tokens.totalTokens) * 100) : 0;
          const cachePct =
            m.tokens.totalTokens > 0
              ? Math.round((m.tokens.cacheReadTokens / m.tokens.totalTokens) * 100)
              : 0;
          const outPct = m.tokens.totalTokens > 0 ? Math.max(1, 100 - inPct - cachePct) : 0;

          return (
            '<div class="model-card-item">' +
            '<div class="model-card-top">' +
            '<span class="model-card-name">' +
            m.model +
            '</span>' +
            '<span class="badge-live">' +
            sharePct +
            '% share</span>' +
            '</div>' +
            '<div style="font-family:var(--font-mono); font-size:1.4rem; font-weight:700; color:#fff; margin-bottom:8px;">' +
            formatNumber(m.tokens.totalTokens) +
            ' <span style="font-size:0.75rem; color:var(--text-muted); font-weight:400;">tokens</span></div>' +
            '<div style="font-size:0.74rem; color:var(--text-secondary); margin-bottom:12px; font-family:var(--font-mono);">' +
            'In: ' +
            formatNumber(m.tokens.inputTokens) +
            ' • Cache: ' +
            formatNumber(m.tokens.cacheReadTokens) +
            ' • Out: ' +
            formatNumber(m.tokens.outputTokens) +
            '</div>' +
            '<div style="height:6px; border-radius:9999px; background:rgba(255,255,255,0.06); display:flex; overflow:hidden;">' +
            '<div style="width:' +
            cachePct +
            '%; background:var(--emerald);" title="Cache: ' +
            cachePct +
            '%"></div>' +
            '<div style="width:' +
            inPct +
            '%; background:var(--accent);" title="Input: ' +
            inPct +
            '%"></div>' +
            '<div style="width:' +
            outPct +
            '%; background:var(--purple);" title="Output: ' +
            outPct +
            '%"></div>' +
            '</div>' +
            '</div>'
          );
        })
        .join('');
    }

    function renderSvgAnalytics(dailyUsage) {
      const svg = document.getElementById('tokenDailyChart');
      if (!dailyUsage || dailyUsage.length === 0) return;

      const items = dailyUsage.slice(-14);
      const maxTokens = Math.max.apply(
        null,
        items.map(function (i) {
          return i.tokens.totalTokens;
        }).concat([1000])
      );
      const width = svg.clientWidth || 800;
      const height = 220;
      const padding = 40;
      const barWidth = Math.max(20, Math.min(48, (width - padding * 2) / items.length - 12));

      let content =
        '<line x1="' +
        padding +
        '" y1="' +
        (height - 30) +
        '" x2="' +
        (width - padding) +
        '" y2="' +
        (height - 30) +
        '" stroke="rgba(255,255,255,0.1)" />';

      items.forEach(function (item, idx) {
        const x = padding + 16 + idx * (barWidth + 16);
        const totalHeight = Math.round((item.tokens.totalTokens / maxTokens) * (height - 70));
        const cacheHeight = Math.round((item.tokens.cacheReadTokens / maxTokens) * (height - 70));
        const inHeight = Math.round((item.tokens.inputTokens / maxTokens) * (height - 70));
        const outHeight = Math.max(2, totalHeight - cacheHeight - inHeight);

        const yBase = height - 30;
        const yCache = yBase - cacheHeight;
        const yIn = yCache - inHeight;
        const yOut = yIn - outHeight;

        const tooltipData =
          item.date +
          ' • Total: ' +
          formatNumber(item.tokens.totalTokens) +
          ' (Cache: ' +
          formatNumber(item.tokens.cacheReadTokens) +
          ', In: ' +
          formatNumber(item.tokens.inputTokens) +
          ', Out: ' +
          formatNumber(item.tokens.outputTokens) +
          ')';

        content +=
          '<g class="chart-bar" onmousemove="showChartTooltip(event, \'' +
          tooltipData +
          '\')" onmouseleave="hideChartTooltip()">' +
          '<rect x="' +
          x +
          '" y="' +
          yCache +
          '" width="' +
          barWidth +
          '" height="' +
          cacheHeight +
          '" fill="#10b981" opacity="0.85" rx="2" />' +
          '<rect x="' +
          x +
          '" y="' +
          yIn +
          '" width="' +
          barWidth +
          '" height="' +
          inHeight +
          '" fill="#38bdf8" opacity="0.85" rx="2" />' +
          '<rect x="' +
          x +
          '" y="' +
          yOut +
          '" width="' +
          barWidth +
          '" height="' +
          outHeight +
          '" fill="#a855f7" opacity="0.85" rx="2" />' +
          '<text x="' +
          (x + barWidth / 2) +
          '" y="' +
          (height - 12) +
          '" fill="#64748b" font-size="10" text-anchor="middle" font-family="var(--font-mono)">' +
          item.date.slice(5) +
          '</text>' +
          '<text x="' +
          (x + barWidth / 2) +
          '" y="' +
          (yOut - 6) +
          '" fill="#f8fafc" font-size="9" text-anchor="middle" font-family="var(--font-mono)">' +
          Math.round(item.tokens.totalTokens / 1000) +
          'k</text>' +
          '</g>';
      });

      svg.innerHTML = content;
    }

    function showChartTooltip(e, text) {
      const tip = document.getElementById('chartTooltip');
      tip.innerText = text;
      tip.style.display = 'block';
      const rect = e.currentTarget.getBoundingClientRect();
      const parentRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
      tip.style.left = (e.clientX - parentRect.left + 10) + 'px';
      tip.style.top = (e.clientY - parentRect.top - 30) + 'px';
    }

    function hideChartTooltip() {
      document.getElementById('chartTooltip').style.display = 'none';
    }

    function renderEditor(editor) {
      if (!editor || !editor.fileName) {
        document.getElementById('editorFile').innerText = 'No active file in editor';
        document.getElementById('editorDetails').innerText = 'Waiting for Antigravity IDE focus';
        document.getElementById('editorBadge').innerText = 'IDLE';
        document.getElementById('editorBadge').className = 'status-tag idle';
        return;
      }

      document.getElementById('editorFile').innerText = 'Editing ' + editor.fileName;
      document.getElementById('editorDetails').innerText = 
        editor.language + ' • Line ' + editor.currentLine + ' of ' + editor.totalLines + 
        (editor.workspaceName ? ' (' + editor.workspaceName + ')' : '');
      document.getElementById('editorBadge').innerText = 'ACTIVE';
      document.getElementById('editorBadge').className = 'status-tag running_tool';
    }

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

    function renderAgents(data) {
      const tbody = document.getElementById('agentsTableBody');
      if (!tbody) return;
      if (!data.agents || data.agents.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No agents discovered</td></tr>';
        return;
      }
      tbody.innerHTML = data.agents
        .map(function (a) {
          return (
            '<tr onclick="openDrawer(\'' +
            a.conversationId +
            '\')">' +
            '<td><span class="status-tag ' +
            a.status +
            '">' +
            a.status.replace('_', ' ') +
            '</span></td>' +
            '<td style="font-family:var(--font-mono); font-size:0.75rem; color:#fff;">' +
            a.conversationId +
            '</td>' +
            '<td><span class="model-badge">' +
            a.model +
            '</span></td>' +
            '<td class="mono-num">' +
            (a.activeTool ? '<span style="color:var(--emerald);">⚡ ' + a.activeTool + '</span>' : '--') +
            '</td>' +
            '<td>' +
            formatTime(a.startedAt) +
            '</td>' +
            '<td>' +
            formatTime(a.lastEventAt) +
            '</td>' +
            '</tr>'
          );
        })
        .join('');
    }

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
      renderAgents(data);
      renderModels(data);
      if (data.editor) renderEditor(data.editor);
      if (data.discord) renderDiscord(data.discord);
      if (data.settings) renderSettings(data.settings);

      // If drawer is open, keep it refreshed
      if (activeConversationId) {
        const activeConv = data.conversations.find(c => c.conversationId === activeConversationId);
        if (activeConv) renderDrawerData(activeConv);
      }
    }

    function startSSE() {
      const es = new EventSource('/api/stream');
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          updateAll(payload);
        } catch {}
      };
      es.onerror = () => setTimeout(startSSE, 3000);
    }

    async function init() {
      try {
        const res = await fetch('/api/overview');
        const json = await res.json();
        updateAll(json);
      } catch (err) {
        console.error('Fetch overview failed', err);
      }
      startSSE();
    }

    init();
  </script>
</body>
</html>`;
}
