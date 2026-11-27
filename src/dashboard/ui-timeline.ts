export function getDashboardRightColumnHtml(): string {
  return /* html */ `
    <div style="display:flex;flex-direction:column;gap:16px;">
      <!-- 1. Time & Activity Timeline Card -->
      <section class="nx-card" style="padding:20px;display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="font-size:13px;font-weight:700;color:#14191A;letter-spacing:0.01em;">
            ID: <span id="nxSessionIdLabel" class="mono">SESSION</span>
          </div>
          <button
            id="btnPauseLeave"
            type="button"
            onclick="togglePauseLeave()"
            style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1px solid #CBD6D3;background:#FFFFFF;color:#14191A;font-size:11px;font-weight:700;cursor:pointer;"
          >
            <span id="pauseIcon" aria-hidden="true">||</span>
            <span id="pauseText">Pause &amp; Leave</span>
          </button>
        </div>

        <div style="background:#C0B8A8;border-radius:14px;padding:16px;border:1px solid #B2A998;">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#5E6E6B;margin-bottom:14px;">
            OVERALL IDE TIME &amp; TIMELINE
          </div>

          <div style="position:relative;display:flex;flex-direction:column;gap:14px;padding-left:20px;">
            <div
              aria-hidden="true"
              style="position:absolute;left:5px;top:6px;bottom:6px;width:1.5px;background:linear-gradient(to bottom,#14191A 0%,#14191A 65%,#CBD6D3 100%);"
            ></div>

            <div style="position:relative;display:flex;flex-direction:column;gap:2px;">
              <span aria-hidden="true" style="position:absolute;left:-20px;top:4px;width:11px;height:11px;border-radius:50%;background:#14191A;"></span>
              <div style="font-size:13px;color:#14191A;">
                Overall IDE Time: <b id="nxOverallTimeVal" class="mono">0m</b>
              </div>
              <div style="font-size:11px;color:#5E6E6B;">Total time spent in Antigravity IDE</div>
            </div>

            <div style="position:relative;display:flex;flex-direction:column;gap:2px;">
              <span aria-hidden="true" style="position:absolute;left:-20px;top:4px;width:11px;height:11px;border-radius:50%;background:#14191A;"></span>
              <div style="font-size:13px;color:#14191A;">
                Last 24 Hours: <b id="nx24hTimeVal" class="mono">0m</b>
              </div>
              <div style="font-size:11px;color:#5E6E6B;">Active coding &amp; agent telemetry</div>
            </div>

            <div style="position:relative;display:flex;flex-direction:column;gap:2px;">
              <span aria-hidden="true" style="position:absolute;left:-20px;top:4px;width:11px;height:11px;border-radius:50%;background:#14191A;"></span>
              <div style="font-size:13px;color:#14191A;">
                7-Day / 30-Day: <b id="nx7d30dTimeVal" class="mono">0m &bull; 0m</b>
              </div>
            </div>

            <div style="position:relative;display:flex;flex-direction:column;gap:2px;">
              <span aria-hidden="true" style="position:absolute;left:-20px;top:4px;width:11px;height:11px;border-radius:50%;background:#FFFFFF;border:2px solid #14191A;"></span>
              <div style="font-size:13px;color:#14191A;">
                Current Session: <b id="kpiSessionTimer" class="mono">00:00:00</b>
              </div>
              <div id="kpiLifetimeHours" class="mono" style="font-size:11px;color:#5E6E6B;">0m overall</div>
            </div>

            <div style="position:relative;display:flex;flex-direction:column;gap:2px;">
              <span id="discordDot" aria-hidden="true" style="position:absolute;left:-20px;top:4px;width:11px;height:11px;border-radius:50%;background:#FFFFFF;border:2px solid #14191A;"></span>
              <div style="font-size:13px;color:#14191A;">
                Discord RPC: <b id="discordText">Connecting...</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Discord Profile & Mascot Card -->
      <section class="nx-card" style="position:relative;padding:20px;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:14px;">
        <div style="display:flex;flex-direction:column;gap:14px;min-width:0;position:relative;z-index:1;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="position:relative;width:44px;height:44px;border-radius:50%;overflow:hidden;background:#F4F7F6;border:1px solid #CBD6D3;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
              <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5E6E6B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;inset:0;margin:auto;pointer-events:none;">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <img id="nxProfileAvatar" alt="Discord Avatar" style="position:relative;width:100%;height:100%;object-fit:cover;display:none;" onerror="this.style.display='none'" />
            </div>

            <div style="min-width:0;">
              <div id="nxProfileName" style="font-size:14px;font-weight:700;color:#14191A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Antigravity User</div>
              <div id="nxProfileSub" style="font-size:12px;color:#5E6E6B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Discord Connected</div>
            </div>
          </div>

          <div style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;border-radius:999px;background:#F4F7F6;border:1px solid #E4EAE8;font-size:11px;font-weight:600;color:#14191A;width:fit-content;">
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="#14191A">
              <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
            </svg>
            <span><span id="kpiCachePct">0%</span> Cache Hit</span>
            <span aria-hidden="true" style="color:#CBD6D3;">&bull;</span>
            <span><span id="kpiAgentCount">0</span> Active</span>
          </div>
        </div>

        <div style="position:relative;display:flex;align-items:center;justify-content:center;flex-shrink:0;width:56px;height:56px;">
          <span aria-hidden="true" style="position:absolute;width:88px;height:88px;border-radius:50%;border:1px solid rgba(20,25,26,0.08);pointer-events:none;"></span>
          <span aria-hidden="true" style="position:absolute;width:66px;height:66px;border-radius:50%;border:1px solid rgba(20,25,26,0.14);pointer-events:none;"></span>
          <button
            type="button"
            title="Open Analytics"
            aria-label="Open Analytics"
            onclick="switchTab('analytics', document.querySelector('[data-tab=analytics]'))"
            style="position:relative;z-index:1;width:42px;height:42px;border-radius:50%;border:none;background:#14191A;color:#FFFFFF;display:flex;align-items:center;justify-content:center;cursor:pointer;"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12h16" />
              <path d="m14 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </section>
    </div>
  `;
}
