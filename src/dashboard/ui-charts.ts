export function getDashboardLeftColumnHtml(): string {
  return `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- TOKEN TELEMETRY AREA CHART CARD -->
      <section class="nx-card" id="nw">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:8px;">
          <div>
            <div class="cap">TOKEN TELEMETRY</div>
            <div style="display:flex; align-items:baseline; gap:10px; margin-top:4px;">
              <div class="mono" id="nxTelemetryTotal" style="font-size:2.2rem; font-weight:800; letter-spacing:-0.03em; color:#14191A;">0</div>
              <span class="chip mono" id="nwDelta" style="background:#DCF291; border-color:rgba(20,25,26,0.14); color:#14191A;">+0 out</span>
            </div>
          </div>
          <div class="nx-seg-pills" id="nwSeg">
            <button type="button" class="nx-seg-btn" aria-pressed="false" onclick="setNwSpan('24h')">DAY</button>
            <button type="button" class="nx-seg-btn active" aria-pressed="true" onclick="setNwSpan('30d')">MONTH</button>
            <button type="button" class="nx-seg-btn" aria-pressed="false" onclick="setNwSpan('1y')">YEAR</button>
          </div>
        </div>

        <div style="display:flex; gap:16px; font-size:11px; color:#6B7678; margin-bottom:10px;">
          <span>Input: <b id="legIn" class="mono" style="color:#14191A;">0</b></span>
          <span>Cache Read: <b id="legCache" class="mono" style="color:#14191A;">0</b></span>
          <span>Output: <b id="legOut" class="mono" style="color:#14191A;">0</b></span>
        </div>

        <div id="nwSvgContainer" style="position:relative; width:100%; height:220px;">
          <svg id="nwSvg" style="width:100%; height:100%; overflow:visible; cursor:crosshair;"></svg>
        </div>
      </section>

      <!-- RECENT SESSIONS TABLE CARD -->
      <section class="nx-card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
          <div class="cap">RECENT SESSIONS &amp; CONVERSATIONS</div>
          <span class="chip mono" id="sessionTableCount">0 SESSIONS</span>
        </div>
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
      </section>
    </div>
  `;
}
