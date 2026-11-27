export function getDashboardThemeCss(): string {
  return `
    :root {
      --bg: #141718;
      --shell: #1E2223;
      --card-bg: #CEC6B6;
      --card-inner: #C0B8A8;
      --acc: #14191A;
      --lime: #DCF291;
      --t1: #14191A;
      --t2: #2E3331;
      --t3: #464B48;
      --t4: #656A66;
      --hair: #B2A998;
      --hair-strong: #9D9484;
      --emerald: #137A50;
      --coral: #DC2626;
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      --font-pixel: "Geist Mono", monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: var(--bg);
      color: var(--t1);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 8px;
      -webkit-font-smoothing: antialiased;
    }

    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

    .nx-shell {
      max-width: 100%;
      margin: 0 auto;
      background: var(--shell);
      border: 1px solid #2C3233;
      border-radius: 18px;
      padding: 14px;
      box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.45);
    }

    /* DARK CHARCOAL HERO BANNER */
    .nx-hero {
      background: linear-gradient(135deg, #1C2324 0%, #242D2F 100%);
      border-radius: 18px;
      padding: 20px 24px;
      color: #FFFFFF;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 26px;
      box-shadow: 0 12px 30px -10px rgba(20, 25, 26, 0.25);
    }

    .nx-hero-grid-bg {
      position: absolute;
      inset: 0;
      opacity: 0.08;
      pointer-events: none;
      background-image: linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px);
      background-size: 36px 36px;
    }

    .nx-hero-top {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .nx-circle-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.08);
      color: #FFFFFF;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s var(--ease);
    }
    .nx-circle-btn:hover { background: rgba(255, 255, 255, 0.18); }

    .nx-hero-utils {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nx-search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 999px;
      padding: 6px 14px;
      min-width: 220px;
    }
    .nx-search-wrap input {
      background: transparent;
      border: none;
      outline: none;
      color: #FFFFFF;
      font-size: 12px;
      width: 100%;
    }
    .nx-search-wrap input::placeholder { color: rgba(255, 255, 255, 0.55); }

    .nx-hero-bottom {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 14px;
    }

    .nx-hero-title {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: #FFFFFF;
    }

    .nx-hero-sub {
      font-size: 12px;
      color: #A9B6B3;
      margin-top: 4px;
    }

    .nav-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .tab-btn {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.12);
      color: #FFFFFF;
      border-radius: 999px;
      padding: 8px 18px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.15s var(--ease);
    }
    .tab-btn:hover { background: rgba(255, 255, 255, 0.22); }
    .tab-btn.active {
      background: var(--lime);
      border-color: var(--lime);
      color: #14191A;
    }

    /* MAIN OVERVIEW GRID */
    .nx-overview-grid {
      display: grid;
      grid-template-columns: 1.75fr 1fr;
      gap: 16px;
      align-items: start;
    }
    @media (max-width: 1024px) {
      .nx-overview-grid { grid-template-columns: 1fr; }
    }

    .nx-card {
      background: var(--card-bg);
      border: 1px solid var(--hair);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 2px 10px -2px rgba(20, 25, 26, 0.04);
    }

    .cap {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--t3);
    }

    .ttl {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--t1);
      letter-spacing: -0.02em;
    }

    .view-panel { display: none; }
    .view-panel.active { display: block; }

    .nx-seg-pills {
      display: inline-flex;
      gap: 4px;
      background: var(--card-inner);
      padding: 3px;
      border-radius: 999px;
      border: 1px solid var(--hair);
    }
    .nx-seg-btn {
      border: none;
      background: transparent;
      color: var(--t3);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 5px 12px;
      border-radius: 999px;
      cursor: pointer;
    }
    .nx-seg-btn.active {
      background: #14191A;
      color: #FFFFFF;
    }

    /* TABLES */
    .table-container { width: 100%; overflow-x: auto; margin-top: 12px; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    thead th {
      background: #C0B8A8;
      color: var(--t3);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 10px 12px;
    }
    thead th:first-child { border-radius: 8px 0 0 8px; }
    thead th:last-child { border-radius: 0 8px 8px 0; }
    tbody td {
      padding: 11px 12px;
      border-bottom: 1px solid #B8B0A0;
      color: var(--t1);
      font-weight: 500;
    }
    tbody tr:hover { background: #C7BFAF; cursor: pointer; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      background: #EDF1F0;
      color: var(--t2);
    }
    .status-badge.running_tool, .status-badge.thinking {
      background: var(--lime);
      color: #14191A;
    }
    .status-badge.idle { background: #EDF1F0; color: var(--t3); }
    .status-badge.error { background: #FDECE8; color: #DC2626; }

    .chip {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 700;
      background: var(--card-inner);
      border: 1px solid var(--hair);
      color: var(--t2);
    }

    /* DRAWER */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(20, 25, 26, 0.55);
      backdrop-filter: blur(4px);
      display: none; justify-content: flex-end; z-index: 999;
    }
    .drawer-overlay.open { display: flex; }
    .drawer-panel, .drawer {
      width: 460px; max-width: 100%; height: 100%; background: #CEC6B6; color: #14191A;
      padding: 24px; overflow-y: auto; border-left: 1px solid #B2A998;
      box-shadow: -12px 0 36px rgba(0, 0, 0, 0.35);
      display: flex; flex-direction: column; gap: 18px;
    }
    .drawer-header {
      display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
      padding-bottom: 14px; border-bottom: 1px solid #B2A998;
    }
    .drawer-close {
      width: 30px; height: 30px; border-radius: 50%; border: 1px solid #B2A998;
      background: #C0B8A8; color: #14191A; font-size: 18px; line-height: 1;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .drawer-close:hover { background: #14191A; color: #FFFFFF; }
    .drawer-body { display: flex; flex-direction: column; gap: 16px; }

    .tip {
      position: fixed; z-index: 1000; pointer-events: none; opacity: 0;
      background: #14191A; color: #FFFFFF; border-radius: 10px; padding: 8px 12px;
      font-size: 11px; box-shadow: 0 8px 20px rgba(0,0,0,0.18);
      transition: opacity 0.12s ease;
    }
    .tip.on { opacity: 1; }
    .tip .t { font-weight: 700; margin-bottom: 4px; }
    .tip .r { display: flex; justify-content: space-between; gap: 12px; }
  `;
}

export function getDashboardHeroHtml(): string {
  const todayStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
    <header class="nx-hero">
      <div class="nx-hero-grid-bg"></div>
      <div class="nx-hero-top">
        <button type="button" class="nx-circle-btn" onclick="switchTab('overview', document.querySelector('[data-tab=overview]'))" title="Overview">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="3" cy="3" r="1.4"/><circle cx="9" cy="3" r="1.4"/>
            <circle cx="3" cy="9" r="1.4"/><circle cx="9" cy="9" r="1.4"/>
          </svg>
        </button>

        <div class="nx-hero-utils">
          <div class="nx-search-wrap">
            <input id="dashSearchInput" type="text" placeholder="Search sessions, models..." oninput="filterDashboard(this.value)" />
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
          <button type="button" class="nx-circle-btn" onclick="toggleNotchEnabled()" title="Toggle Liquid Notch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <button type="button" class="nx-circle-btn" onclick="switchTab('settings', document.querySelector('[data-tab=settings]'))" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
          <button type="button" class="nx-circle-btn" id="heroUserBtn" onclick="switchTab('settings', document.querySelector('[data-tab=settings]'))" title="Discord Account" style="overflow:hidden; padding:0;">
            <img id="heroDiscordAvatar" alt="" style="width:100%; height:100%; object-fit:cover; display:none;" />
            <svg id="heroUserIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
        </div>
      </div>

      <div class="nx-hero-bottom">
        <div>
          <h1 class="nx-hero-title" id="heroSectionTitle">Overview</h1>
          <div class="nx-hero-sub">${todayStr} &bull; <span id="workspaceText">1 Workspace</span></div>
        </div>

        <nav class="nav-tabs" aria-label="Dashboard Navigation">
          <button type="button" class="tab-btn active" data-tab="overview" onclick="switchTab('overview', this)">Overview</button>
          <button type="button" class="tab-btn" data-tab="agents" onclick="switchTab('agents', this)">Agents</button>
          <button type="button" class="tab-btn" data-tab="models" onclick="switchTab('models', this)">Models</button>
          <button type="button" class="tab-btn" data-tab="conversations" onclick="switchTab('conversations', this)">Conversations</button>
          <button type="button" class="tab-btn" data-tab="analytics" onclick="switchTab('analytics', this)">Analytics</button>
          <button type="button" class="tab-btn" data-tab="settings" onclick="switchTab('settings', this)">Settings</button>
        </nav>
      </div>
    </header>
  `;
}
