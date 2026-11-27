export interface SidebarProfileAndTabsParams {
  sideMascotSvg: string;
  sideMascotState: string;
  isAgentActive: boolean;
  activeAgentModel: string;
  activeAgentTool: string;
  activeAgentsCount: number;
  modelsHtml: string;
  modelsCount: number;
}

export function getSidebarProfileAndTabsHtml(params: SidebarProfileAndTabsParams): string {
  const {
    sideMascotSvg,
    sideMascotState,
    isAgentActive,
    activeAgentModel,
    activeAgentTool,
    activeAgentsCount,
    modelsHtml,
    modelsCount,
  } = params;

  const badgeLabel = sideMascotState.charAt(0).toUpperCase() + sideMascotState.slice(1);

  return `
  <!-- DISCORD PROFILE & COMPANION CARD (OVERVIEW) -->
  <div class="side-card" style="display:flex; flex-direction:column; gap:10px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <div style="display:flex; align-items:center; gap:9px; min-width:0; flex:1;">
        <div style="position:relative; width:34px; height:34px; border-radius:50%; background:#F4F7F6; border:1px solid #E4EAE8; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7678" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <img id="sideProfileAvatar" alt="" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:none;" onerror="this.style.display='none'" />
        </div>
        <div style="min-width:0;">
          <div id="sideProfileName" style="font-size:12px; font-weight:700; color:#14191A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Antigravity User</div>
          <div id="sideProfileSub" style="font-size:10px; color:#6B7678; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Discord Rich Presence</div>
        </div>
      </div>
      <button type="button" class="profile-action-circle" id="btnOpenFull" onclick="openFullDashboard()" title="Open Studio in IDE">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12L12 4M12 4H6M12 4V10"/></svg>
      </button>
    </div>

    <div onclick="chirpSideMascot()" title="Click mascot" style="display:flex; align-items:center; gap:10px; background:#C0B8A8; border:1px solid #B2A998; border-radius:10px; padding:8px; cursor:pointer;">
      ${sideMascotSvg}
      <div style="flex:1; min-width:0; display:flex; flex-direction:column; gap:3px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="eyebrow" id="sideMascotBadge" style="color:#14191A;">${badgeLabel}</span>
          <span class="chip mono" id="sideCompModeChip" style="font-size:8.5px;">Mascot + Notch</span>
        </div>
        <div id="sideMascotSpeech" style="font-size:10.5px; font-weight:600; color:#485452; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
          ${isAgentActive ? `"${activeAgentModel} Active"` : '"Ready in Antigravity"'}
        </div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
      <button type="button" class="micro-btn" id="btnSideNotch" onclick="toggleSideNotch()">
        <span id="lblSideNotch">Toggle Notch</span>
      </button>
      <button type="button" class="micro-btn" id="btnSideBehavior" onclick="cycleSideBehavior()">
        <span id="lblSideBehavior">Mascot: Corner</span>
      </button>
    </div>

    <button type="button" class="micro-btn" id="btnOpenBrowser" onclick="openBrowserDashboard()" style="width:100%;">
      <span>Open Web Studio (127.0.0.1:41177)</span>
    </button>
  </div>
  </div> <!-- End #side-view-overview -->

  <!-- AGENTS TAB PANEL -->
  <div class="side-panel-view" id="side-view-agents">
    <div class="side-card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
        <span class="eyebrow">ACTIVE AGENTS</span>
        <span class="chip mono" id="sideAgentCountChip" style="background:#DCF291;">${activeAgentsCount} ACTIVE</span>
      </div>
      <div id="sideAgentContainer" style="display:flex; flex-direction:column; gap:6px;">
        ${
          isAgentActive
            ? `<div style="display:flex; align-items:center; gap:6px; font-weight:700; font-size:11.5px; color:#14191A;">
                <span style="width:7px; height:7px; border-radius:50%; background:#179C65;"></span>
                <span>${activeAgentModel}</span>
              </div>
              <div style="font-size:10px; color:#6B7678;">${activeAgentTool ? 'Tool: ' + activeAgentTool : 'Planning & Acting...'}</div>`
            : `<div style="display:flex; align-items:center; gap:6px; font-weight:600; font-size:11px; color:#6B7678;">
                <span style="width:7px; height:7px; border-radius:50%; background:#CBD6D3;"></span>
                <span>Standing By</span>
              </div>
              <div style="font-size:10px; color:#6B7678;">Telemetry Ready</div>`
        }
      </div>
    </div>
  </div>

  <!-- MODELS & SKILLS TAB PANEL -->
  <div class="side-panel-view" id="side-view-models">
    <div class="side-card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <span class="eyebrow">MODEL ALLOCATION</span>
        <span class="chip mono" id="sideModelCount">${modelsCount} MODELS</span>
      </div>
      <div id="sideModelList">${modelsHtml}</div>
    </div>
    <div class="side-card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <span class="eyebrow">SKILL TOKENS</span>
        <span class="chip mono" id="sideSkillCount">0 SKILLS</span>
      </div>
      <div id="sideSkillList"><div style="font-size:10px; color:#464B48; padding:4px 0;">No skill token reads yet.</div></div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer-bar">
    <span id="footerWorkspaceText">1 Workspace active</span>
    <button type="button" class="reconnect-btn" onclick="reconnectDiscord()" title="Reconnect Discord RPC">
      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1 8a7 7 0 1 1 12 5M15 8A7 7 0 0 1 3 3"/><path d="M15 3v5h-5M1 13V8h5"/></svg>
      <span>Reconnect RPC</span>
    </button>
  </div>`;
}
