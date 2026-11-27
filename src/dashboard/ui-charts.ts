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

        <div style="display:flex; gap:16px; font-size:11px; color:#464B48; margin-bottom:10px; flex-wrap:wrap;">
          <span>Input: <b id="legIn" class="mono" style="color:#14191A;">0</b></span>
          <span>Cache Read: <b id="legCache" class="mono" style="color:#14191A;">0</b></span>
          <span>Output: <b id="legOut" class="mono" style="color:#14191A;">0</b></span>
        </div>

        <!-- COMPACT CONTEXT WINDOW FULLNESS BAR -->
        <div style="background:#C0B8A8; border:1px solid #B2A998; border-radius:10px; padding:8px 12px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:5px;">
            <span style="font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#2E3331;">
              CONTEXT WINDOW &bull; <span id="nxContextText" class="mono" style="color:#14191A;">0 / 1.0M</span>
            </span>
            <span class="chip mono" id="nxContextPctBadge" style="background:#DCF291; color:#14191A; border-color:rgba(20,25,26,0.14);">0% FULL</span>
          </div>
          <div style="height:6px; border-radius:999px; background:#B2A998; overflow:hidden;">
            <div id="nxContextBar" style="height:100%; width:0%; background:#14191A; border-radius:999px; transition:width 0.3s ease, background 0.3s ease;"></div>
          </div>
        </div>

        <div id="nwSvgContainer" style="position:relative; width:100%; height:200px;">
          <svg id="nwSvg" style="width:100%; height:100%; overflow:visible; cursor:crosshair;"></svg>
        </div>
      </section>

      <!-- TABBED ACTIVITY CARD: RECENT SESSIONS | SKILL TOKENS | TOP TOOLS & FILES -->
      <section class="nx-card">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
          <div class="nx-seg-pills" id="nxBottomSeg">
            <button type="button" class="nx-seg-btn active" onclick="switchLeftBottomView('sessions', this)">RECENT SESSIONS</button>
            <button type="button" class="nx-seg-btn" onclick="switchLeftBottomView('skills', this)">SKILL TOKENS</button>
            <button type="button" class="nx-seg-btn" onclick="switchLeftBottomView('tools', this)">TOP TOOLS &amp; FILES</button>
          </div>
          <span class="chip mono" id="sessionTableCount">0 SESSIONS</span>
        </div>

        <div id="nxPanelSessions" class="table-container">
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

        <div id="nxPanelSkills" class="table-container" style="display:none;">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Invocations</th>
                <th>Input</th>
                <th>Cache</th>
                <th>Output</th>
                <th>Total Tokens</th>
              </tr>
            </thead>
            <tbody id="nxSkillsBody">
              <tr><td colspan="6" style="color:#464B48;">No skill token reads recorded yet.</td></tr>
            </tbody>
          </table>
        </div>

        <div id="nxPanelTools" style="display:none; margin-top:14px;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:#C0B8A8; border:1px solid #B2A998; border-radius:12px; padding:12px;">
              <div class="cap" style="margin-bottom:8px;">TOP TOOLS</div>
              <div id="nxTopToolsList" style="display:flex; flex-wrap:wrap; gap:6px;">
                <span class="chip">No tool calls yet</span>
              </div>
            </div>
            <div style="background:#C0B8A8; border:1px solid #B2A998; border-radius:12px; padding:12px;">
              <div class="cap" style="margin-bottom:8px;">HOT WORKSPACE FILES</div>
              <div id="nxHotFilesList" style="display:flex; flex-wrap:wrap; gap:6px;">
                <span class="chip">No file edits yet</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;
}
