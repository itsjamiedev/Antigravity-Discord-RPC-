export interface SidebarTimelineAndTokensParams {
  timeFormatted: string;
  lifetimeHoursFormatted: string;
  last24hHoursFormatted: string;
  totalTokensFormatted: string;
  sessionTokensCompact: string;
  cacheRatio: number;
  cacheBarRatio: number;
  inRatio: number;
  outRatio: number;
  cacheCompact: string;
  inCompact: string;
  outCompact: string;
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function getSidebarTimelineAndTokensHtml(params: SidebarTimelineAndTokensParams): string {
  const {
    timeFormatted,
    lifetimeHoursFormatted,
    last24hHoursFormatted,
    totalTokensFormatted,
    sessionTokensCompact,
    cacheRatio,
    cacheBarRatio,
    inRatio,
    outRatio,
    cacheCompact,
    inCompact,
    outCompact,
  } = params;

  const cacheW = clampPct(cacheBarRatio);
  const inW = clampPct(inRatio);
  const outW = clampPct(outRatio);

  const ribHeights = [28, 42, 34, 56, 48, 72, 62, 88, 76, 94, 68, 84];
  const ribbedBarsHtml = ribHeights
    .map((height, idx) => {
      const isAccent = idx >= ribHeights.length - 3;
      const bg = isAccent ? '#1C2022' : '#C8C0B0';
      return `<span class="rib-bar" style="flex:1; height:${height}%; background:${bg}; border-radius:2px;"></span>`;
    })
    .join('');

  return `
  <!-- OVERALL IDE TIME & SESSION VERTICAL TIMELINE CARD -->
  <div class="side-card">
    <div class="card-head" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
      <span class="eyebrow">TIME &amp; ACTIVITY TIMELINE</span>
      <span class="mono" id="sideTimerDisplay" style="font-size:13px; font-weight:800; color:#14191A;">${timeFormatted}</span>
    </div>

    <div class="clock-actions" style="display:flex; align-items:center; gap:6px; margin-bottom:12px;">
      <button class="micro-btn" id="btnPause" onclick="togglePause()" type="button">
        <span id="btnPauseIcon">
          <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="4" y="3" width="2.8" height="10" rx="1.2"/>
            <rect x="9.2" y="3" width="2.8" height="10" rx="1.2"/>
          </svg>
        </span>
        <span id="btnPauseLabel">Pause</span>
      </button>
      <button class="micro-btn" id="btnFresh" onclick="startFresh()" title="Start fresh session" type="button">
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9L14 6m0-4v4h-4M13.5 8a5.5 5.5 0 0 1-9.4 3.9L2 10m0 4v-4h4"/>
        </svg>
        <span>Fresh</span>
      </button>
    </div>

    <div class="timeline-list" style="position:relative; padding-left:16px; display:flex; flex-direction:column; gap:10px;">
      <div style="position:absolute; left:4.25px; top:6px; bottom:6px; width:1.5px; background:#D2DBD8;"></div>

      <div class="timeline-item" style="position:relative; display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:10px; height:10px; border-radius:50%; background:#14191A;"></span>
        <div style="display:flex; flex-direction:column; gap:1px;">
          <span style="font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#6B7678;">Overall IDE Time</span>
          <span class="mono" id="sideLifetimeHours" style="font-size:10px; font-weight:600; color:#485452;">Overall: ${lifetimeHoursFormatted}</span>
        </div>
        <b class="mono" id="sideOverallBadge" style="font-size:10.5px; font-weight:800; color:#14191A;">ALL: ${lifetimeHoursFormatted}</b>
      </div>

      <div class="timeline-item" style="position:relative; display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:10px; height:10px; border-radius:50%; background:#14191A;"></span>
        <span style="font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#6B7678;">Last 24 Hours</span>
        <b class="mono" id="side24hHours" style="font-size:10.5px; font-weight:800; color:#14191A;">24H: ${last24hHoursFormatted}</b>
      </div>

      <div class="timeline-item" style="position:relative; display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span style="position:absolute; left:-16px; top:50%; transform:translateY(-50%); width:10px; height:10px; border-radius:50%; background:#FFFFFF; border:2px solid #14191A;"></span>
        <span style="font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#6B7678;">Session Status</span>
        <span class="mono" id="sideTimerStatus" style="font-size:10px; font-weight:800; letter-spacing:0.06em; color:#14191A;">RUNNING</span>
      </div>
    </div>
  </div>

  <!-- TOKEN VOLUME CARD -->
  <div class="side-card">
    <div class="card-head" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
      <span class="eyebrow">TOKEN VOLUME</span>
      <span class="chip mono" id="sideCacheRatio" style="background:#DCF291; border-color:rgba(20,25,26,0.14);">${cacheRatio}% SAVED</span>
    </div>

    <div style="display:flex; align-items:baseline; justify-content:space-between; gap:8px; margin:2px 0 10px;">
      <span class="hero-tokens mono" id="sideTotalTokens" style="font-size:20px; font-weight:800; line-height:1;">${totalTokensFormatted}</span>
      <span class="mono" id="sideSessionTokens" style="font-size:10px; font-weight:700; color:#6B7678;">${sessionTokensCompact} session</span>
    </div>

    <div class="ribbed-chart" aria-hidden="true" style="display:flex; align-items:flex-end; gap:3px; height:28px; margin-bottom:8px;">
      ${ribbedBarsHtml}
    </div>

    <div class="ratio-bar" style="display:flex; height:5px; border-radius:3px; overflow:hidden; background:#E6ECEA; margin-bottom:8px;">
      <div class="ratio-fill-cache" id="barCache" style="width:${cacheW}%; background:#14191A;"></div>
      <div class="ratio-fill-in" id="barIn" style="width:${inW}%; background:#7A8A86;"></div>
      <div class="ratio-fill-out" id="barOut" style="width:${outW}%; background:#CBD6D3;"></div>
    </div>

    <div class="micro-stats-row mono" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:#14191A;"></i> Cache</span>
        <span class="micro-stat-val" id="sideCacheTokens">${cacheCompact}</span>
      </div>
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:#7A8A86;"></i> In</span>
        <span class="micro-stat-val" id="sideInTokens">${inCompact}</span>
      </div>
      <div class="micro-stat-col">
        <span class="micro-stat-label"><i style="background:#CBD6D3;"></i> Out</span>
        <span class="micro-stat-val" id="sideOutTokens">${outCompact}</span>
      </div>
    </div>
  </div>`;
}
