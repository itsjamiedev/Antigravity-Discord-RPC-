/**
 * Sidebar Hero & Theme Module for Antigravity Presence
 *
 * Provides the light-canvas / dark-hero bento design system and hero banner HTML
 * for the VS Code Activity Bar sidebar webview.
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getSidebarThemeCss(): string {
  return `
    :root {
      --canvas: #D5CFC2;
      --card: #EAE5D9;
      --card-border: #C9C2B3;
      --card-border-hover: #B5AE9E;
      --sub-surface: #DED8CA;
      --ink: #14191A;
      --muted: #525754;
      --hero-start: #1C2324;
      --hero-end: #242D2F;
      --accent-lime: #DCF291;
      --accent-emerald: #179C65;
      --frosted: rgba(255, 255, 255, 0.12);
      --frosted-hover: rgba(255, 255, 255, 0.2);
      --radius-card: 14px;
      --radius-sub: 10px;
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
      --font-sans: "Geist", -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-mono: 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      background: var(--canvas);
      color: var(--ink);
      font-family: var(--font-sans);
      font-size: 12px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
      overflow-x: hidden;
      user-select: none;
    }

    body {
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }

    /* DARK HERO BANNER */
    .hero-banner {
      background: linear-gradient(145deg, var(--hero-start) 0%, var(--hero-end) 100%);
      border-radius: var(--radius-card);
      padding: 12px;
      color: #FFFFFF;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 4px 14px rgba(20, 25, 26, 0.12);
    }

    .hero-top-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }

    .hero-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .hero-dots-btn {
      width: 28px;
      height: 28px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: var(--frosted);
      color: #FFFFFF;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: pointer;
    }

    .hero-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #FFFFFF;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hero-status-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    #sideDiscordAvatar {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      object-fit: cover;
      border: 1.5px solid rgba(255, 255, 255, 0.24);
      display: none;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.16);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-lime);
      flex-shrink: 0;
    }

    .hero-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 6px;
    }

    .hero-tab {
      appearance: none;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: var(--frosted);
      color: #FFFFFF;
      border-radius: 999px;
      padding: 6px 8px;
      font-family: var(--font-sans);
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      transition: all 0.16s var(--ease);
    }

    .hero-tab:hover { background: var(--frosted-hover); }
    .hero-tab.active {
      background: var(--accent-lime);
      color: var(--ink);
      border-color: var(--accent-lime);
      font-weight: 700;
    }

    /* PANEL VIEWS */
    .side-panel-view {
      display: none;
      flex-direction: column;
      gap: 10px;
      width: 100%;
    }
    .side-panel-view.active { display: flex; }

    /* CARDS */
    .side-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-card);
      padding: 12px;
      color: var(--ink);
      box-shadow: 0 2px 8px -2px rgba(20, 25, 26, 0.05);
      transition: border-color 0.16s var(--ease);
    }
    .side-card:hover { border-color: var(--card-border-hover); }

    .eyebrow {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .chip {
      font-size: 9.5px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--sub-surface);
      border: 1px solid var(--card-border);
      color: var(--ink);
    }

    .micro-btn {
      flex: 1;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--card-border);
      background: var(--sub-surface);
      color: var(--ink);
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      transition: all 0.15s var(--ease);
    }
    .micro-btn:hover { background: #E4EAE8; }
    .micro-btn.active {
      background: var(--accent-lime);
      border-color: rgba(20, 25, 26, 0.18);
      color: var(--ink);
      font-weight: 700;
    }

    .micro-stat-label {
      font-size: 9px;
      font-weight: 600;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .micro-stat-label i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .micro-stat-val {
      font-size: 11px;
      font-weight: 700;
      color: var(--ink);
    }

    .profile-action-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: var(--ink);
      color: #FFFFFF;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.15s var(--ease);
    }
    .profile-action-circle:hover { transform: scale(1.06); }

    .model-row { margin-top: 8px; }
    .model-meta { display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 3px; }
    .model-name { font-weight: 600; color: var(--ink); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .model-stat-num { color: var(--muted); }
    .model-bar-wrap { height: 5px; border-radius: 999px; background: var(--sub-surface); overflow: hidden; }
    .model-bar-fill { height: 100%; border-radius: 999px; background: var(--ink); }

    .footer-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 4px 2px;
      font-size: 10px;
      color: var(--muted);
    }
    .reconnect-btn {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 600;
      color: var(--ink);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .reconnect-btn:hover { background: var(--sub-surface); }
  `;
}

export function getSidebarHeroHtml(statusText: string): string {
  const safeStatus = escapeHtml(statusText && statusText.trim() ? statusText.trim() : 'Live Synced');

  return `
    <header class="hero-banner" role="banner">
      <div class="hero-top-row">
        <div class="hero-brand">
          <button type="button" class="hero-dots-btn" title="Antigravity Presence" aria-label="Antigravity Presence menu">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="3" cy="3" r="1.35" fill="currentColor" />
              <circle cx="9" cy="3" r="1.35" fill="currentColor" />
              <circle cx="3" cy="9" r="1.35" fill="currentColor" />
              <circle cx="9" cy="9" r="1.35" fill="currentColor" />
            </svg>
          </button>
          <span class="hero-title">Antigravity Presence</span>
        </div>

        <div class="hero-status-group">
          <img id="sideDiscordAvatar" alt="Discord Avatar" />
          <div class="live-pill" id="sideStatusBadge">
            <span class="live-dot" aria-hidden="true"></span>
            <span id="sideStatusText">${safeStatus}</span>
          </div>
        </div>
      </div>

      <nav class="hero-tabs" role="tablist" aria-label="Sidebar Views">
        <button type="button" class="hero-tab active" role="tab" aria-selected="true" onclick="switchSideTab('overview', this)">Overview</button>
        <button type="button" class="hero-tab" role="tab" aria-selected="false" onclick="switchSideTab('agents', this)">Agents</button>
        <button type="button" class="hero-tab" role="tab" aria-selected="false" onclick="switchSideTab('models', this)">Models</button>
      </nav>
    </header>
  `.trim();
}
