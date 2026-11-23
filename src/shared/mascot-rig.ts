/**
 * Antigravity Authentic PNG Mascot Rig & Procedural 16-Bit Chiptune SFX Engine
 *
 * Renders the user's exact transparent master PNG (`resources/mascot.png`)
 * with 100% original colors and proportions, animated with hardware-accelerated
 * keyframe motion (`idle`, `thinking`, `working`, `walking`, `sitting`, `sleeping`, `surprised`, `offline`)
 * and zero fake SVG shapes or Unicode emojis.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type MascotExpressionState =
  | 'idle'
  | 'thinking'
  | 'working'
  | 'sleeping'
  | 'walking'
  | 'sitting'
  | 'surprised'
  | 'offline';

let cachedMascotDataUri: string | null = null;

export function getMascotDataUri(): string {
  if (cachedMascotDataUri) {
    return cachedMascotDataUri;
  }

  const candidates = [
    path.resolve(process.cwd(), 'resources', 'mascot.png'),
    path.resolve(__dirname, '..', 'resources', 'mascot.png'),
    path.resolve(__dirname, '..', '..', 'resources', 'mascot.png'),
    path.join(
      os.homedir(),
      '.antigravity-ide',
      'extensions',
      'itsjamiefied.antigravity-presence-1.0.0',
      'resources',
      'mascot.png'
    ),
    path.resolve(process.cwd(), 'resources', 'icon.png'),
    path.resolve(__dirname, '..', 'resources', 'icon.png'),
  ];

  const procWithRes = process as NodeJS.Process & { resourcesPath?: string };
  if (procWithRes.resourcesPath) {
    candidates.unshift(path.join(procWithRes.resourcesPath, 'resources', 'mascot.png'));
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const b64 = fs.readFileSync(candidate).toString('base64');
        cachedMascotDataUri = `data:image/png;base64,${b64}`;
        return cachedMascotDataUri;
      }
    } catch {}
  }

  return '';
}

export function getMascotSvgHtml(
  instanceId: string = 'main',
  size: number = 96,
  initialState: MascotExpressionState = 'idle'
): string {
  const srcUri = getMascotDataUri();
  return `<div class="ag-mascot-wrap" id="mascot-rig-${instanceId}" data-instance="${instanceId}" data-state="${initialState}" style="width:${size}px; height:${size}px;">
  <div class="ag-mascot-aura"></div>
  <img class="ag-mascot-img" src="${srcUri}" width="${size}" height="${size}" alt="Antigravity Mascot" draggable="false" />
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
      transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), filter 0.24s ease;
    }
    .ag-mascot-wrap:hover {
      transform: scale(1.06);
    }
    .ag-mascot-wrap:active {
      transform: scale(0.95);
    }
    .ag-mascot-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.55));
      transform-origin: 50% 82%;
      will-change: transform;
    }
    .ag-mascot-aura {
      position: absolute;
      inset: 10%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(52, 245, 164, 0.22) 0%, transparent 70%);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    /* IDLE & SITTING */
    .ag-mascot-wrap[data-state="idle"] .ag-mascot-img,
    .ag-mascot-wrap[data-state="sitting"] .ag-mascot-img {
      animation: agMascotBreathe 3s ease-in-out infinite;
    }

    /* THINKING */
    .ag-mascot-wrap[data-state="thinking"] .ag-mascot-aura {
      opacity: 1;
      background: radial-gradient(circle, rgba(255, 184, 77, 0.28) 0%, transparent 72%);
    }
    .ag-mascot-wrap[data-state="thinking"] .ag-mascot-img {
      animation: agMascotThinkTilt 1.6s ease-in-out infinite;
    }

    /* WORKING / RUNNING TOOL */
    .ag-mascot-wrap[data-state="working"] .ag-mascot-aura {
      opacity: 1;
      background: radial-gradient(circle, rgba(52, 245, 164, 0.32) 0%, transparent 72%);
    }
    .ag-mascot-wrap[data-state="working"] .ag-mascot-img {
      animation: agMascotWorkBounce 0.48s ease-in-out infinite;
    }

    /* WALKING */
    .ag-mascot-wrap[data-state="walking"] .ag-mascot-img {
      animation: agMascotWalkWaddle 0.38s ease-in-out infinite;
    }

    /* SLEEPING & OFFLINE */
    .ag-mascot-wrap[data-state="sleeping"] .ag-mascot-img {
      opacity: 0.82;
      animation: agMascotSleepBreathe 4.2s ease-in-out infinite;
    }
    .ag-mascot-wrap[data-state="offline"] {
      filter: grayscale(0.78) brightness(0.75);
      opacity: 0.72;
    }

    /* SURPRISED / CLICKED */
    .ag-mascot-wrap[data-state="surprised"] .ag-mascot-img {
      animation: agMascotJump 0.42s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes agMascotBreathe {
      0%, 100% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-4px) scale(1.018, 0.99); }
    }
    @keyframes agMascotThinkTilt {
      0%, 100% { transform: translateY(-2px) rotate(-3.5deg); }
      50% { transform: translateY(-5px) rotate(3.5deg); }
    }
    @keyframes agMascotWorkBounce {
      0%, 100% { transform: translateY(0px) scale(1.03, 0.97); }
      50% { transform: translateY(-6px) scale(0.98, 1.04); }
    }
    @keyframes agMascotWalkWaddle {
      0%, 100% { transform: translateY(0px) rotate(-6deg); }
      50% { transform: translateY(-5px) rotate(6deg); }
    }
    @keyframes agMascotSleepBreathe {
      0%, 100% { transform: translateY(3px) scale(1, 0.97); }
      50% { transform: translateY(1px) scale(1.02, 0.95); }
    }
    @keyframes agMascotJump {
      0% { transform: translateY(0) scale(1); }
      45% { transform: translateY(-14px) scale(1.08); }
      100% { transform: translateY(0) scale(1); }
    }
  `;
}

export function getMascotSfxJs(): string {
  return `
    (function() {
      let audioCtx = null;
      let isMuted = false;

      function ensureCtx() {
        if (isMuted) return null;
        try {
          if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) audioCtx = new Ctx();
          }
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(function() {});
          }
          return audioCtx;
        } catch {
          return null;
        }
      }

      function playTone(freq, type, startOffset, duration, peakGain, endFreq) {
        const ctx = ensureCtx();
        if (!ctx) return;
        try {
          const now = ctx.currentTime + (startOffset || 0);
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = type || 'square';
          osc.frequency.setValueAtTime(freq, now);
          if (endFreq) {
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
          }
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.linearRampToValueAtTime(peakGain || 0.04, now + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + duration + 0.01);
        } catch {}
      }

      window.agMascotAudio = {
        setMuted: function(m) { isMuted = Boolean(m); },
        isMuted: function() { return isMuted; },
        playClick: function() {
          playTone(660, 'square', 0, 0.045, 0.032, 880);
        },
        playWake: function() {
          playTone(523.25, 'square', 0, 0.055, 0.036);
          playTone(659.25, 'square', 0.055, 0.055, 0.036);
          playTone(783.99, 'square', 0.11, 0.075, 0.04);
          playTone(1046.5, 'triangle', 0.185, 0.11, 0.045);
        },
        playComplete: function() {
          playTone(587.33, 'triangle', 0, 0.065, 0.04);
          playTone(880, 'triangle', 0.065, 0.08, 0.042);
          playTone(1174.66, 'square', 0.145, 0.13, 0.035);
        },
        playSleep: function() {
          playTone(659.25, 'sine', 0, 0.09, 0.032);
          playTone(523.25, 'sine', 0.09, 0.1, 0.028);
          playTone(392.00, 'sine', 0.19, 0.15, 0.024);
        },
        playMorph: function() {
          playTone(440, 'triangle', 0, 0.05, 0.032, 660);
          playTone(660, 'square', 0.05, 0.075, 0.035, 990);
        }
      };
    })();
  `;
}
