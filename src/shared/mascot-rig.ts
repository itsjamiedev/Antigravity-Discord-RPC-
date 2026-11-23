/**
 * Antigravity Rainbow Mascot Rig & Procedural 16-Bit Chiptune SFX Engine
 *
 * Shared across:
 *   1. Local Retro CRT Dashboard (`src/dashboard/html-content.ts`)
 *   2. Antigravity IDE Retro Sidebar (`src/extension/sidebar-provider.ts`)
 *   3. Standalone Windows Desktop App & Dynamic Notch Overlay (`desktop-app/`)
 *
 * Faithfully recreates the Antigravity Rainbow "A" Delta Mascot with articulated
 * stick arms, mitten hands, stick legs, oval shoes, and expressive rounded-square eyes.
 */

export type MascotExpressionState =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'sleeping'
  | 'walking'
  | 'sitting'
  | 'surprised'
  | 'offline';

export function getMascotSvgHtml(
  instanceId: string = 'main',
  size: number = 96,
  initialState: MascotExpressionState = 'idle'
): string {
  const gradId = `agRainbowGrad_${instanceId}`;
  const shineId = `agBodyShine_${instanceId}`;
  const shoeGradId = `agShoeGrad_${instanceId}`;

  return `<div class="ag-mascot-wrap" id="mascot-rig-${instanceId}" data-instance="${instanceId}" data-state="${initialState}" style="width:${size}px; height:${size}px;">
  <svg class="ag-mascot-svg" viewBox="0 0 160 160" width="${size}" height="${size}" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Antigravity Rainbow Mascot">
    <defs>
      <linearGradient id="${gradId}" x1="18" y1="95" x2="142" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#0044FF" />
        <stop offset="20%" stop-color="#00D4FF" />
        <stop offset="38%" stop-color="#1EFF6E" />
        <stop offset="53%" stop-color="#FFE600" />
        <stop offset="74%" stop-color="#FF6D00" />
        <stop offset="100%" stop-color="#FF1244" />
      </linearGradient>
      <linearGradient id="${shineId}" x1="80" y1="18" x2="80" y2="115" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.28" />
        <stop offset="35%" stop-color="#FFFFFF" stop-opacity="0.0" />
      </linearGradient>
      <linearGradient id="${shoeGradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#5B6782" />
        <stop offset="100%" stop-color="#353C4E" />
      </linearGradient>
    </defs>

    <!-- Floor Shadow -->
    <ellipse class="ag-mascot-shadow" cx="80" cy="148" rx="44" ry="6" fill="rgba(0,0,0,0.42)" />

    <!-- Whole Animated Character Rig -->
    <g class="ag-mascot-rig">
      <!-- Left Leg & Oval Shoe -->
      <g class="ag-mascot-leg-left" style="transform-origin: 57px 104px;">
        <path d="M58 103 L52 135" stroke="#394154" stroke-width="6.5" stroke-linecap="round" />
        <ellipse cx="48" cy="138" rx="14.5" ry="7.2" transform="rotate(-5 48 138)" fill="url(#${shoeGradId})" stroke="#222734" stroke-width="1.5" />
      </g>

      <!-- Right Leg & Oval Shoe -->
      <g class="ag-mascot-leg-right" style="transform-origin: 103px 104px;">
        <path d="M102 103 L108 135" stroke="#394154" stroke-width="6.5" stroke-linecap="round" />
        <ellipse cx="112" cy="138" rx="14.5" ry="7.2" transform="rotate(5 112 138)" fill="url(#${shoeGradId})" stroke="#222734" stroke-width="1.5" />
      </g>

      <!-- Left Stick Arm & Double-Lobed Mitten Hand -->
      <g class="ag-mascot-arm-left" style="transform-origin: 43px 72px;">
        <path d="M43 72 Q22 76 16 93" stroke="#262B38" stroke-width="6" stroke-linecap="round" fill="none" />
        <g transform="translate(15, 95) rotate(-18)">
          <ellipse cx="-2.5" cy="0" rx="6.5" ry="5.2" fill="#2A303F" />
          <ellipse cx="3.2" cy="2" rx="4.5" ry="4.2" fill="#232836" />
        </g>
      </g>

      <!-- Right Stick Arm & Double-Lobed Mitten Hand -->
      <g class="ag-mascot-arm-right" style="transform-origin: 117px 72px;">
        <path d="M117 72 Q138 76 144 93" stroke="#262B38" stroke-width="6" stroke-linecap="round" fill="none" />
        <g transform="translate(145, 95) rotate(18)">
          <ellipse cx="2.5" cy="0" rx="6.5" ry="5.2" fill="#2A303F" />
          <ellipse cx="-3.2" cy="2" rx="4.5" ry="4.2" fill="#232836" />
        </g>
      </g>

      <!-- Main Rainbow "A" Delta Boomerang Body -->
      <g class="ag-mascot-torso">
        <path
          d="M80 20
             C96 20 112 45 135 95
             C144 114 130 129 113 119
             C98 110 90 98 80 98
             C70 98 62 110 47 119
             C30 129 16 114 25 95
             C48 45 64 20 80 20 Z"
          fill="url(#${gradId})"
        />
        <path
          d="M80 20
             C96 20 112 45 135 95
             C144 114 130 129 113 119
             C98 110 90 98 80 98
             C70 98 62 110 47 119
             C30 129 16 114 25 95
             C48 45 64 20 80 20 Z"
          fill="url(#${shineId})"
        />

        <!-- Awake Rounded-Square Onyx Eyes -->
        <g class="ag-mascot-eyes-awake" style="transform-origin: 80px 62px;">
          <rect class="ag-eye-l" x="59" y="54" width="14.5" height="14.5" rx="4.2" fill="#0B0D13" />
          <rect class="ag-eye-r" x="86.5" y="54" width="14.5" height="14.5" rx="4.2" fill="#0B0D13" />
          <!-- Pixel Arcade Eye Glints (shown in working/excited states) -->
          <rect class="ag-eye-glint" x="62" y="56.5" width="3.5" height="3.5" fill="#FFFFFF" opacity="0.85" />
          <rect class="ag-eye-glint" x="89.5" y="56.5" width="3.5" height="3.5" fill="#FFFFFF" opacity="0.85" />
        </g>

        <!-- Sleeping Curved Eyelids -->
        <g class="ag-mascot-eyes-sleep">
          <path d="M59 62 Q66 68 73 62" stroke="#0B0D13" stroke-width="3.6" stroke-linecap="round" fill="none" />
          <path d="M87 62 Q94 68 101 62" stroke="#0B0D13" stroke-width="3.6" stroke-linecap="round" fill="none" />
        </g>
      </g>

      <!-- Floating Arcade Action Sparks (Working / Thinking) — Pure Vector Geometry -->
      <g class="ag-mascot-sparks">
        <polygon points="81,2 75,11 80,11 78,18 85,9 80,9" fill="#FFB84D" />
        <rect x="26" y="34" width="5" height="5" rx="1" fill="#FFB84D" />
        <rect x="128" y="30" width="6" height="6" rx="1" fill="#34F5A4" />
      </g>

      <!-- Floating Retro Vector Zzz Paths (Sleeping / Offline) -->
      <g class="ag-mascot-zzz" stroke="#38E4FF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path class="ag-z1" d="M113 33 H123 L113 43 H123" />
        <path class="ag-z2" d="M126 21 H133 L126 28 H133" />
        <path class="ag-z3" d="M136 11 H141 L136 16 H141" />
      </g>
    </g>
  </svg>
</div>`;
}

export function getMascotCss(): string {
  return `
    .ag-mascot-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ag-mascot-wrap:hover {
      transform: scale(1.05);
    }
    .ag-mascot-wrap:active {
      transform: scale(0.95);
    }
    .ag-mascot-svg {
      overflow: visible;
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45));
    }

    /* Default visibility for state-specific sublayers */
    .ag-mascot-eyes-sleep,
    .ag-mascot-sparks,
    .ag-mascot-zzz,
    .ag-eye-glint {
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    /* IDLE STATE */
    .ag-mascot-wrap[data-state="idle"] .ag-mascot-rig {
      animation: agMascotBreathe 2.8s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="idle"] .ag-mascot-eyes-awake {
      animation: agMascotBlink 4.4s ease-in-out infinite;
    }

    /* THINKING STATE */
    .ag-mascot-wrap[data-state="thinking"] .ag-mascot-rig {
      animation: agMascotThinkTilt 1.8s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="thinking"] .ag-mascot-eyes-awake {
      animation: agMascotLookAround 2.1s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="thinking"] .ag-mascot-sparks {
      opacity: 0.85;
      animation: agMascotSparkPulse 1.1s steps(2, end) infinite;
    }

    /* WORKING / RUNNING TOOL STATE */
    .ag-mascot-wrap[data-state="working"] .ag-mascot-rig {
      animation: agMascotWorkBounce 0.52s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="working"] .ag-eye-glint {
      opacity: 1;
    }
    .ag-mascot-wrap[data-state="working"] .ag-mascot-arm-left {
      animation: agMascotWaveLeft 0.52s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="working"] .ag-mascot-arm-right {
      animation: agMascotWaveRight 0.52s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="working"] .ag-mascot-sparks {
      opacity: 1;
      animation: agMascotSparkPulse 0.45s steps(2, end) infinite;
    }

    /* WALKING STATE */
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-rig {
      animation: agMascotWalkBob 0.36s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-leg-left {
      animation: agMascotStrideLeft 0.36s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-leg-right {
      animation: agMascotStrideRight 0.36s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-arm-left {
      animation: agMascotStrideRight 0.36s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-arm-right {
      animation: agMascotStrideLeft 0.36s ease-in-out infinite;
    }

    /* SITTING IN CORNER STATE */
    .ag-mascot-wrap[data-state="sitting"] .ag-mascot-rig {
      transform: translateY(8px);
      animation: agMascotSitBreathe 3.2s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="sitting"] .ag-mascot-leg-left {
      transform: rotate(28deg) translateY(-6px);
      animation: agMascotDangleLeft 2.4s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="sitting"] .ag-mascot-leg-right {
      transform: rotate(-28deg) translateY(-6px);
      animation: agMascotDangleRight 2.4s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="sitting"] .ag-mascot-eyes-awake {
      animation: agMascotBlink 4.8s ease-in-out infinite;
    }

    /* SLEEPING & OFFLINE STATES */
    .ag-mascot-wrap[data-state="sleeping"] .ag-mascot-eyes-awake,
    .ag-mascot-wrap[data-state="offline"] .ag-mascot-eyes-awake {
      opacity: 0;
    }
    .ag-mascot-wrap[data-state="sleeping"] .ag-mascot-eyes-sleep,
    .ag-mascot-wrap[data-state="offline"] .ag-mascot-eyes-sleep {
      opacity: 1;
    }
    .ag-mascot-wrap[data-state="sleeping"] .ag-mascot-zzz,
    .ag-mascot-wrap[data-state="offline"] .ag-mascot-zzz {
      opacity: 1;
      animation: agMascotZzzFloat 2.4s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="sleeping"] .ag-mascot-rig {
      transform: translateY(6px);
      animation: agMascotSleepBreathe 4s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="offline"] {
      filter: saturate(0.55) brightness(0.82);
    }

    /* SURPRISED / CLICKED / DRAGGED STATE */
    .ag-mascot-wrap[data-state="surprised"] .ag-mascot-rig {
      animation: agMascotJump 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .ag-mascot-wrap[data-state="surprised"] .ag-mascot-eyes-awake {
      transform: scaleY(1.25) scaleX(1.1);
    }
    .ag-mascot-wrap[data-state="surprised"] .ag-eye-glint {
      opacity: 1;
    }
    .ag-mascot-wrap[data-state="surprised"] .ag-mascot-arm-left {
      transform: rotate(42deg);
    }
    .ag-mascot-wrap[data-state="surprised"] .ag-mascot-arm-right {
      transform: rotate(-42deg);
    }

    @keyframes agMascotBreathe {
      0%, 100% { transform: translateY(0px) scaleY(1); }
      50% { transform: translateY(-3.5px) scaleY(1.015); }
    }
    @keyframes agMascotSitBreathe {
      0%, 100% { transform: translateY(7px); }
      50% { transform: translateY(5px); }
    }
    @keyframes agMascotSleepBreathe {
      0%, 100% { transform: translateY(6px) scale(1); }
      50% { transform: translateY(8px) scale(1.02, 0.98); }
    }
    @keyframes agMascotBlink {
      0%, 45%, 49%, 95%, 100% { transform: scaleY(1); }
      47%, 97% { transform: scaleY(0.1); }
    }
    @keyframes agMascotThinkTilt {
      0%, 100% { transform: rotate(-2.5deg) translateY(0px); }
      50% { transform: rotate(2.5deg) translateY(-4px); }
    }
    @keyframes agMascotLookAround {
      0%, 100% { transform: translateX(0px); }
      25% { transform: translateX(-4px) translateY(-1px); }
      75% { transform: translateX(4px) translateY(-1px); }
    }
    @keyframes agMascotWorkBounce {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-6px) scale(1.03, 0.97); }
    }
    @keyframes agMascotWaveLeft {
      0%, 100% { transform: rotate(6deg); }
      50% { transform: rotate(34deg); }
    }
    @keyframes agMascotWaveRight {
      0%, 100% { transform: rotate(-6deg); }
      50% { transform: rotate(-34deg); }
    }
    @keyframes agMascotWalkBob {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-4px); }
    }
    @keyframes agMascotStrideLeft {
      0%, 100% { transform: rotate(-22deg); }
      50% { transform: rotate(22deg); }
    }
    @keyframes agMascotStrideRight {
      0%, 100% { transform: rotate(22deg); }
      50% { transform: rotate(-22deg); }
    }
    @keyframes agMascotDangleLeft {
      0%, 100% { transform: rotate(26deg) translateY(-5px); }
      50% { transform: rotate(16deg) translateY(-5px); }
    }
    @keyframes agMascotDangleRight {
      0%, 100% { transform: rotate(-16deg) translateY(-5px); }
      50% { transform: rotate(-26deg) translateY(-5px); }
    }
    @keyframes agMascotSparkPulse {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-3px) scale(1.18); }
    }
    @keyframes agMascotZzzFloat {
      0% { transform: translate(0px, 2px); opacity: 0.35; }
      50% { transform: translate(3px, -4px); opacity: 1; }
      100% { transform: translate(6px, -9px); opacity: 0.2; }
    }
    @keyframes agMascotJump {
      0% { transform: translateY(0px); }
      45% { transform: translateY(-10px) scale(1.05); }
      100% { transform: translateY(0px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .ag-mascot-rig,
      .ag-mascot-eyes-awake,
      .ag-mascot-arm-left,
      .ag-mascot-arm-right,
      .ag-mascot-leg-left,
      .ag-mascot-leg-right {
        animation: none !important;
      }
    }
  `;
}

export function getMascotSfxJs(): string {
  return `
    window.agMascotAudio = (function() {
      let ctx = null;
      let muted = false;

      function getCtx() {
        if (muted) return null;
        if (!ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) ctx = new AudioCtx();
        }
        if (ctx && ctx.state === 'suspended') {
          try { ctx.resume(); } catch (e) {}
        }
        return ctx;
      }

      function playTone(freqStart, freqEnd, durationSec, type, delaySec, gainLevel) {
        const c = getCtx();
        if (!c) return;
        try {
          const now = c.currentTime + (delaySec || 0);
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = type || 'square';
          osc.frequency.setValueAtTime(freqStart, now);
          if (freqEnd && freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, now + durationSec);
          }
          const maxG = gainLevel || 0.045;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(maxG, now + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0008, now + durationSec);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start(now);
          osc.stop(now + durationSec + 0.01);
        } catch (e) {}
      }

      return {
        setMuted: function(m) { muted = !!m; },
        isMuted: function() { return muted; },
        playClick: function() {
          playTone(540, 860, 0.055, 'square', 0, 0.04);
        },
        playWake: function() {
          playTone(523.25, 659.25, 0.06, 'triangle', 0, 0.05);
          playTone(659.25, 987.77, 0.09, 'triangle', 0.065, 0.05);
        },
        playComplete: function() {
          playTone(523.25, 523.25, 0.06, 'square', 0, 0.035);
          playTone(659.25, 659.25, 0.06, 'square', 0.065, 0.035);
          playTone(783.99, 1046.5, 0.12, 'square', 0.13, 0.04);
        },
        playSleep: function() {
          playTone(659.25, 493.88, 0.11, 'triangle', 0, 0.04);
          playTone(440.0, 329.63, 0.16, 'triangle', 0.12, 0.035);
        },
        playMorph: function() {
          playTone(320, 960, 0.11, 'sine', 0, 0.05);
        },
        playDrag: function() {
          playTone(380, 620, 0.045, 'triangle', 0, 0.045);
        }
      };
    })();
  `;
}
