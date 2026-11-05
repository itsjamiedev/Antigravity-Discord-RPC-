/**
 * Antigravity Presence — Embedded Spatial Glass Dashboard HTML
 *
 * 100% offline, zero-dependency, self-contained single page application
 * with real-time SSE streaming, 5 interactive tabs, SVG charts, and privacy settings.
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
      --bg: #090a0f;
      --card-bg: rgba(22, 27, 34, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --text-main: #f0f6fc;
      --text-muted: #8b949e;
      --accent: #58a6ff;
      --accent-glow: rgba(88, 166, 255, 0.25);
      --green: #3fb950;
      --green-glow: rgba(63, 185, 80, 0.2);
      --amber: #d29922;
      --purple: #bc8cff;
      --red: #f85149;
      --radius: 12px;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background-color: var(--bg);
      color: var(--text-main);
      font-family: var(--font);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(88, 166, 255, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(188, 140, 255, 0.05) 0%, transparent 40%);
    }

    header {
      background: rgba(13, 17, 23, 0.85);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--card-border);
      padding: 16px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand svg {
      width: 28px;
      height: 28px;
      fill: var(--accent);
    }

    .brand-title {
      font-size: 1.15rem;
      font-weight: 600;
      letter-spacing: -0.02em;
    }

    .brand-tag {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 20px;
      background: rgba(88, 166, 255, 0.15);
      color: var(--accent);
      border: 1px solid rgba(88, 166, 255, 0.3);
    }

    .header-status {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .status-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      padding: 6px 14px;
      border-radius: 20px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--text-muted);
    }

    .status-dot.active {
      background: var(--green);
      box-shadow: 0 0 10px var(--green);
    }

    .status-dot.amber {
      background: var(--amber);
      box-shadow: 0 0 10px var(--amber);
    }

    nav {
      background: rgba(13, 17, 23, 0.4);
      border-bottom: 1px solid var(--card-border);
      padding: 0 28px;
      display: flex;
      gap: 8px;
    }

    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      padding: 14px 16px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }

    .nav-btn:hover {
      color: var(--text-main);
    }

    .nav-btn.active {
      color: var(--accent);
      border-bottom-color: var(--accent);
    }

    main {
      padding: 28px;
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
      flex: 1;
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.2s ease;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 20px;
      margin-bottom: 28px;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 20px;
      transition: border-color 0.2s ease, transform 0.2s ease;
    }

    .card:hover {
      border-color: var(--card-hover);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .badge {
      font-size: 0.7rem;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge.exact {
      background: rgba(63, 185, 80, 0.15);
      color: var(--green);
      border: 1px solid rgba(63, 185, 80, 0.3);
    }

    .badge.estimated {
      background: rgba(188, 140, 255, 0.15);
      color: var(--purple);
      border: 1px solid rgba(188, 140, 255, 0.3);
    }

    .badge.idle { background: rgba(139, 148, 158, 0.2); color: var(--text-muted); }
    .badge.thinking { background: rgba(88, 166, 255, 0.2); color: var(--accent); }
    .badge.running_tool { background: rgba(210, 153, 34, 0.2); color: var(--amber); }
    .badge.waiting_approval { background: rgba(188, 140, 255, 0.2); color: var(--purple); }
    .badge.waiting_background { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .badge.error { background: rgba(248, 81, 73, 0.2); color: var(--red); }
    .badge.stale { background: rgba(139, 148, 158, 0.2); color: var(--text-muted); }

    .card-value {
      font-size: 1.8rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      margin-bottom: 6px;
    }

    .card-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* Table styles */
    .table-container {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      overflow: hidden;
      margin-top: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.85rem;
    }

    th {
      background: rgba(255, 255, 255, 0.03);
      padding: 12px 16px;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--card-border);
    }

    td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--card-border);
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }

    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 0.8rem; }

    /* Settings UI */
    .settings-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 700px;
    }

    .settings-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 18px 22px;
      border-radius: var(--radius);
    }

    .settings-info h4 {
      font-size: 0.95rem;
      margin-bottom: 4px;
    }

    .settings-info p {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: #21262d;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 24px;
      border: 1px solid var(--card-border);
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
    }

    input:checked + .slider {
      background-color: var(--accent);
    }

    input:checked + .slider:before {
      transform: translateX(20px);
    }

    /* Charts */
    .chart-box {
      width: 100%;
      height: 200px;
      margin-top: 12px;
    }

    svg.chart {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    footer {
      padding: 20px 28px;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-top: 1px solid var(--card-border);
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      <div class="brand-title">Antigravity Presence</div>
      <div class="brand-tag">Local 127.0.0.1</div>
    </div>
    <div class="header-status">
      <div class="status-pill" id="discordPill">
        <div class="status-dot" id="discordDot"></div>
        <span id="discordText">Discord: Connecting...</span>
      </div>
      <div class="status-pill" id="agentPill">
        <div class="status-dot active" id="agentDot"></div>
        <span id="agentText">0 Active Agents</span>
      </div>
    </div>
  </header>

  <nav>
    <button class="nav-btn active" onclick="switchTab('overview')">Overview</button>
    <button class="nav-btn" onclick="switchTab('agents')">Agents</button>
    <button class="nav-btn" onclick="switchTab('models')">Models</button>
    <button class="nav-btn" onclick="switchTab('conversations')">Conversations</button>
    <button class="nav-btn" onclick="switchTab('analytics')">Analytics</button>
    <button class="nav-btn" onclick="switchTab('settings')">Settings</button>
  </nav>

  <main>
    <!-- OVERVIEW TAB -->
    <section id="tab-overview" class="tab-content active">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-header">
            <span>ACTIVE AGENTS</span>
            <span class="badge exact" id="metricActiveBadge">EXACT</span>
          </div>
          <div class="card-value" id="metricActiveAgents">0</div>
          <div class="card-subtext" id="metricActiveBreakdown">No agents currently thinking</div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>SESSION TOKENS</span>
            <span class="badge exact" id="metricTokenBadge">EXACT</span>
          </div>
          <div class="card-value" id="metricTotalTokens">0</div>
          <div class="card-subtext" id="metricTokenBreakdown">In: 0 • Cache: 0 • Out: 0</div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>TOTAL CONVERSATIONS</span>
            <span class="badge exact">EXACT</span>
          </div>
          <div class="card-value" id="metricTotalConversations">0</div>
          <div class="card-subtext" id="metricEventsProcessed">0 hook events processed</div>
        </div>

        <div class="card">
          <div class="card-header">
            <span>MODELS IN USE</span>
            <span class="badge exact">EXACT</span>
          </div>
          <div class="card-value" id="metricModelCount">0</div>
          <div class="card-subtext" id="metricPrimaryModel">Awaiting model events</div>
        </div>
      </div>

      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <span>MANUAL EDITOR PRESENCE (DUAL-MODE)</span>
          <span class="badge exact" id="manualPresenceBadge">IDLE</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;" id="manualEditorFile">No active file in editor</div>
            <div style="font-size: 0.85rem; color: var(--text-muted);" id="manualEditorDetails">Waiting for Antigravity IDE focus</div>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);" id="manualEditorTime">--</div>
        </div>
      </div>

      <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 8px;">Active Agent Sessions</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Conversation ID</th>
              <th>Model</th>
              <th>Active Tool</th>
              <th>Last Event</th>
            </tr>
          </thead>
          <tbody id="overviewActiveTableBody">
            <tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No active agents running</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- AGENTS TAB -->
    <section id="tab-agents" class="tab-content">
      <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">All Monitored Agents</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Type</th>
              <th>Conversation</th>
              <th>Model</th>
              <th>Active Tool</th>
              <th>Started</th>
              <th>Last Event</th>
            </tr>
          </thead>
          <tbody id="agentsTableBody">
            <tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Loading agents...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- MODELS TAB -->
    <section id="tab-models" class="tab-content">
      <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">Model Performance & Token Usage</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Conversations</th>
              <th>Invocations</th>
              <th>Tool Calls</th>
              <th>Errors</th>
              <th>Total Tokens</th>
              <th>Token Source</th>
              <th>Last Used</th>
            </tr>
          </thead>
          <tbody id="modelsTableBody">
            <tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Loading models...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- CONVERSATIONS TAB -->
    <section id="tab-conversations" class="tab-content">
      <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">Recorded Conversations</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Title / ID</th>
              <th>Model</th>
              <th>Status</th>
              <th>Turns</th>
              <th>Tools</th>
              <th>Tokens</th>
              <th>Last Active</th>
            </tr>
          </thead>
          <tbody id="conversationsTableBody">
            <tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Loading conversations...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ANALYTICS TAB -->
    <section id="tab-analytics" class="tab-content">
      <h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 12px;">Daily Usage Trends (Exact Tokens)</h3>
      <div class="card" style="margin-bottom: 20px;">
        <div class="card-header">
          <span>TOKEN CONSUMPTION OVER TIME</span>
          <span class="badge exact">EXACT (TRANSCRIPTS)</span>
        </div>
        <div class="chart-box" id="analyticsChartBox">
          <svg class="chart" id="analyticsChart" viewBox="0 0 600 150">
            <text x="300" y="80" fill="#8b949e" font-size="12" text-anchor="middle">Awaiting activity data...</text>
          </svg>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Conversations</th>
              <th>Invocations</th>
              <th>Tool Calls</th>
              <th>Input Tokens</th>
              <th>Cache Tokens</th>
              <th>Output Tokens</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody id="analyticsTableBody">
            <tr><td colspan="8" style="text-align:center; color:var(--text-muted);">Loading daily usage...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- SETTINGS TAB -->
    <section id="tab-settings" class="tab-content">
      <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 16px;">Privacy & Companion Controls</h3>
      <div class="settings-list">
        <div class="settings-item">
          <div class="settings-info">
            <h4>Disable Discord Rich Presence</h4>
            <p>Completely stops all Discord IPC activity updates.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingDisableRichPresence" onchange="updateSetting('disableRichPresence', this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-info">
            <h4>Pause Tracking</h4>
            <p>Temporarily ignores incoming hook and editor events.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingPauseTracking" onchange="updateSetting('pauseTracking', this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-info">
            <h4>Hide Model Names on Discord</h4>
            <p>Hides AI model labels (e.g. Gemini, Claude) from public Rich Presence.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingHideModels" onchange="updateSetting('hideModels', this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-info">
            <h4>Hide Token Counts on Discord</h4>
            <p>Never show token metrics on your Discord profile.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingHideTokens" onchange="updateSetting('hideTokens', this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-info">
            <h4>Enable Manual Editor Presence</h4>
            <p>Shows file and line number when AI mode is idle.</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingEnableManualEditsPresence" onchange="updateSetting('enableManualEditsPresence', this.checked)">
            <span class="slider"></span>
          </label>
        </div>

        <div class="settings-item">
          <div class="settings-info">
            <h4>Hide File Names in Manual Edits</h4>
            <p>Shows only the programming language and line numbers (e.g. "Coding in TypeScript").</p>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="settingHideFileNamesInManualEdits" onchange="updateSetting('hideFileNamesInManualEdits', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </section>
  </main>

  <footer>
    Antigravity Presence • Privacy-Safe Local Companion • 100% Local (127.0.0.1) • Zero Cloud / Zero Telemetry
  </footer>

  <script>
    let currentData = null;

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      const target = document.getElementById('tab-' + tabId);
      if (target) target.classList.add('active');
      event.target.classList.add('active');
    }

    function formatNumber(num) {
      if (typeof num !== 'number') return '0';
      return num.toLocaleString();
    }

    function formatTime(iso) {
      if (!iso) return '--';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString();
      } catch {
        return iso;
      }
    }

    function formatStatusBadge(status, isEstimated) {
      const cls = status || 'idle';
      const label = status ? status.replace('_', ' ') : 'idle';
      const est = isEstimated ? ' (est)' : '';
      return '<span class="badge ' + cls + '">' + label + est + '</span>';
    }

    function renderOverview(data) {
      const activeCount = data.activeAgents.length;
      document.getElementById('metricActiveAgents').innerText = activeCount;
      document.getElementById('agentText').innerText = activeCount + (activeCount === 1 ? ' Active Agent' : ' Active Agents');
      document.getElementById('agentDot').className = 'status-dot' + (activeCount > 0 ? ' active' : '');

      const breakdown = activeCount === 0 
        ? 'No agents currently running' 
        : data.activeAgents.map(a => a.status).join(', ');
      document.getElementById('metricActiveBreakdown').innerText = breakdown;

      // Tokens
      const tokens = data.session.tokens;
      document.getElementById('metricTotalTokens').innerText = formatNumber(tokens.totalTokens);
      document.getElementById('metricTokenBreakdown').innerText = 
        'In: ' + formatNumber(tokens.inputTokens) + 
        ' • Cache: ' + formatNumber(tokens.cacheReadTokens) + 
        ' • Out: ' + formatNumber(tokens.outputTokens);

      document.getElementById('metricTokenBadge').innerText = tokens.source === 'transcript_exact' ? 'EXACT' : 'UNAVAILABLE';
      document.getElementById('metricTokenBadge').className = 'badge ' + (tokens.source === 'transcript_exact' ? 'exact' : 'idle');

      // Conversations & Models
      document.getElementById('metricTotalConversations').innerText = formatNumber(data.session.totalConversations);
      document.getElementById('metricEventsProcessed').innerText = formatNumber(data.session.totalEventsProcessed) + ' hook events processed';

      document.getElementById('metricModelCount').innerText = data.modelStats.length;
      document.getElementById('metricPrimaryModel').innerText = data.modelStats.length > 0 
        ? data.modelStats[0].model 
        : 'Awaiting model events';

      // Active Table
      const tbody = document.getElementById('overviewActiveTableBody');
      if (data.activeAgents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No active agents running</td></tr>';
      } else {
        tbody.innerHTML = data.activeAgents.map(a => 
          '<tr>' +
            '<td>' + formatStatusBadge(a.status, a.statusEstimated) + '</td>' +
            '<td class="mono">' + a.conversationId.slice(0, 18) + '...</td>' +
            '<td>' + a.model + '</td>' +
            '<td>' + (a.activeTool ? '<span class="badge running_tool">' + a.activeTool + '</span>' : '--') + '</td>' +
            '<td>' + formatTime(a.lastEventAt) + '</td>' +
          '</tr>'
        ).join('');
      }
    }

    function renderAgents(data) {
      const tbody = document.getElementById('agentsTableBody');
      if (data.agents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No agents recorded yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.agents.map(a => 
        '<tr>' +
          '<td>' + formatStatusBadge(a.status, a.statusEstimated) + '</td>' +
          '<td>' + (a.isSubagent ? '<span class="badge estimated">Subagent</span>' : '<span class="badge exact">Root</span>') + '</td>' +
          '<td class="mono">' + a.conversationId.slice(0, 24) + '...</td>' +
          '<td>' + a.model + '</td>' +
          '<td>' + (a.activeTool || '--') + '</td>' +
          '<td>' + formatTime(a.startedAt) + '</td>' +
          '<td>' + formatTime(a.lastEventAt) + '</td>' +
        '</tr>'
      ).join('');
    }

    function renderModels(data) {
      const tbody = document.getElementById('modelsTableBody');
      if (data.modelStats.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No models recorded yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.modelStats.map(m => 
        '<tr>' +
          '<td><strong>' + m.model + '</strong></td>' +
          '<td>' + formatNumber(m.conversationCount) + '</td>' +
          '<td>' + formatNumber(m.invocationCount) + '</td>' +
          '<td>' + formatNumber(m.toolCallCount) + '</td>' +
          '<td>' + (m.errorCount > 0 ? '<span class="badge error">' + m.errorCount + '</span>' : '0') + '</td>' +
          '<td>' + formatNumber(m.tokens.totalTokens) + '</td>' +
          '<td><span class="badge ' + (m.tokens.source === 'transcript_exact' ? 'exact' : 'idle') + '">' + m.tokens.source + '</span></td>' +
          '<td>' + formatTime(m.lastUsedAt) + '</td>' +
        '</tr>'
      ).join('');
    }

    function renderConversations(data) {
      const tbody = document.getElementById('conversationsTableBody');
      if (data.conversations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">No conversations recorded yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.conversations.map(c => 
        '<tr>' +
          '<td>' +
            '<div>' + (c.title ? '<strong>' + c.title + '</strong>' : '<span class="mono">' + c.conversationId.slice(0, 16) + '...</span>') + '</div>' +
            (c.isSubagent ? '<span class="badge estimated" style="margin-top:4px;">Subagent</span>' : '') +
          '</td>' +
          '<td>' + c.currentModel + '</td>' +
          '<td>' + formatStatusBadge(c.status, c.statusEstimated) + '</td>' +
          '<td>' + formatNumber(c.turnCount) + '</td>' +
          '<td>' + formatNumber(c.toolCallCount) + '</td>' +
          '<td>' + formatNumber(c.tokens.totalTokens) + '</td>' +
          '<td>' + formatTime(c.lastEventAt) + '</td>' +
        '</tr>'
      ).join('');
    }

    function renderAnalytics(data) {
      const tbody = document.getElementById('analyticsTableBody');
      if (data.dailyUsage.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted);">No daily usage data yet</td></tr>';
        return;
      }

      tbody.innerHTML = data.dailyUsage.map(d => 
        '<tr>' +
          '<td><strong>' + d.date + '</strong></td>' +
          '<td>' + formatNumber(d.conversationCount) + '</td>' +
          '<td>' + formatNumber(d.invocationCount) + '</td>' +
          '<td>' + formatNumber(d.toolCallCount) + '</td>' +
          '<td>' + formatNumber(d.tokens.inputTokens) + '</td>' +
          '<td>' + formatNumber(d.tokens.cacheReadTokens) + '</td>' +
          '<td>' + formatNumber(d.tokens.outputTokens) + '</td>' +
          '<td>' + formatNumber(d.tokens.totalTokens) + '</td>' +
        '</tr>'
      ).join('');

      renderSvgChart(data.dailyUsage);
    }

    function renderSvgChart(dailyList) {
      const svg = document.getElementById('analyticsChart');
      if (!dailyList || dailyList.length === 0) return;

      const items = [...dailyList].reverse();
      const maxTokens = Math.max(...items.map(i => i.tokens.totalTokens), 100);
      const width = 600;
      const height = 150;
      const barWidth = Math.max(16, Math.min(50, (width - 40) / items.length - 10));

      let content = '<line x1="30" y1="130" x2="580" y2="130" stroke="rgba(255,255,255,0.1)" />';

      items.forEach((item, idx) => {
        const x = 50 + idx * (barWidth + 16);
        const barHeight = Math.round((item.tokens.totalTokens / maxTokens) * 100);
        const y = 130 - barHeight;

        content += '<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' + barHeight + '" rx="4" fill="#58a6ff" opacity="0.85" />';
        content += '<text x="' + (x + barWidth/2) + '" y="145" fill="#8b949e" font-size="9" text-anchor="middle">' + item.date.slice(5) + '</text>';
        content += '<text x="' + (x + barWidth/2) + '" y="' + (y - 5) + '" fill="#f0f6fc" font-size="8" text-anchor="middle">' + Math.round(item.tokens.totalTokens/1000) + 'k</text>';
      });

      svg.innerHTML = content;
    }

    function renderManualEditor(editor) {
      if (!editor || !editor.fileName) {
        document.getElementById('manualEditorFile').innerText = 'No active file in editor';
        document.getElementById('manualEditorDetails').innerText = 'Waiting for Antigravity IDE focus';
        document.getElementById('manualPresenceBadge').innerText = 'IDLE';
        document.getElementById('manualPresenceBadge').className = 'badge idle';
        return;
      }

      document.getElementById('manualEditorFile').innerText = 'Editing ' + editor.fileName;
      document.getElementById('manualEditorDetails').innerText = 
        editor.language + ' • Line ' + editor.currentLine + ' of ' + editor.totalLines + 
        (editor.workspaceName ? ' (' + editor.workspaceName + ')' : '');
      document.getElementById('manualEditorTime').innerText = formatTime(editor.updatedAt);
      document.getElementById('manualPresenceBadge').innerText = 'ACTIVE';
      document.getElementById('manualPresenceBadge').className = 'badge exact';
    }

    function renderDiscordStatus(status) {
      const dot = document.getElementById('discordDot');
      const text = document.getElementById('discordText');

      if (status.connected) {
        dot.className = 'status-dot active';
        text.innerText = 'Discord: Connected';
      } else {
        dot.className = 'status-dot amber';
        text.innerText = 'Discord: Disconnected';
      }
    }

    function renderSettings(settings) {
      document.getElementById('settingDisableRichPresence').checked = settings.disableRichPresence;
      document.getElementById('settingPauseTracking').checked = settings.pauseTracking;
      document.getElementById('settingHideModels').checked = settings.hideModels;
      document.getElementById('settingHideTokens').checked = settings.hideTokens;
      document.getElementById('settingEnableManualEditsPresence').checked = settings.enableManualEditsPresence;
      document.getElementById('settingHideFileNamesInManualEdits').checked = settings.hideFileNamesInManualEdits;
    }

    async function updateSetting(key, val) {
      try {
        const body = {};
        body[key] = val;
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } catch (err) {
        console.error('Failed updating setting', err);
      }
    }

    function updateAll(data) {
      currentData = data;
      renderOverview(data);
      renderAgents(data);
      renderModels(data);
      renderConversations(data);
      renderAnalytics(data);
      if (data.editor) renderManualEditor(data.editor);
      if (data.discord) renderDiscordStatus(data.discord);
      if (data.settings) renderSettings(data.settings);
    }

    // Connect to Server-Sent Events (SSE)
    function startSSE() {
      const es = new EventSource('/api/stream');
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          updateAll(payload);
        } catch (err) {
          console.error('SSE JSON error', err);
        }
      };
      es.onerror = () => {
        setTimeout(startSSE, 3000);
      };
    }

    // Initial Fetch
    async function init() {
      try {
        const res = await fetch('/api/overview');
        const json = await res.json();
        updateAll(json);
      } catch (e) {
        console.error('Initial fetch failed', e);
      }
      startSSE();
    }

    init();
  </script>
</body>
</html>`;
}
