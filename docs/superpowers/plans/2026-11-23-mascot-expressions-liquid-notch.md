# Mascot Expressions Engine, Liquid Glass Notch & White Line Elimination Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently eliminate the Windows 11 overlay white line, implement a 32-movement expressive mascot animation and procedural audio engine (prompt typing approach, submit leap, agent task completion celebration, idle ambient life), overhaul the Apple Liquid Glass Dynamic Island Notch with true specular glass refraction, and wire live task-completion callouts that guide users back to Antigravity IDE.

**Architecture:** Electron overlay window (`desktop-app/overlay.html`, `desktop-app/main.cjs`) updated to clean frameless mode without DWM caption injection; high-performance CSS keyframe + SVG transform animation rig for 32 distinct mascot movements; procedural 8-bit Web Audio synthesizer for typing chirps, launch jumps, and task completion chimes; real-time SSE hook listener streaming prompt and agent lifecycle events from the Antigravity daemon to trigger mascot reactions dynamically.

**Tech Stack:** Electron 35, HTML5/CSS3 (Glassmorphism, hardware-accelerated transforms, KaTeX/Minecraft typography), Web Audio API (procedural synthesis), Node.js, TypeScript/Vitest.

**Spec:** Current session requirements, `f:\Antigravity Extension\.agents\AGENTS.md` (Design taste, Minecraft Seven font, no placeholders, full output).

---

## Global Constraints

- **Zero White Line**: The desktop transparent overlay must never render any native border, DWM caption line, or accent strip. `titleBarStyle: 'hidden'` must be completely removed in favor of pure `frame: false, transparent: true`.
- **Authentic Master PNG**: All mascot states strictly use the user's authentic high-DPI master PNG (`resources/mascot.png`). No fake SVG gradients, no rainbow paths, no emoji overlays.
- **Pure Procedural Audio**: Zero external `.wav` or `.mp3` dependencies; all typing chirps, launch leaps, and task chimes synthesized in real-time via Web Audio API oscillators.
- **Dual Independent Toggles**: Both `notchEnabled` and `mascotEnabled` must remain independently toggleable in real-time across the Notch, Mascot menu, Dashboard, Sidebar, Installer, and Tray.
- **Git Push on Every Change**: Every commit automatically pushed to GitHub (`origin main`).
- **Never Touch `F:\MCBE`**.

---

## Review Focus (Failure Modes & Edge Cases)

1. **Windows 11 DWM Caption Line**: If `titleBarStyle` is set to anything on a transparent window in Windows 11, DWM injects a 1px white border. *Test: Verify `overlayWindow` options omit `titleBarStyle` and set `frame: false, transparent: true, thickFrame: false, hasShadow: false, roundedCorners: false`.*
2. **Rapid Prompt Typing Sound Overlap**: If typing chirps fire on every keystroke without throttling, Web Audio nodes will stack and distort. *Test: Debounce typing audio to a max cadence of 120ms with smooth pitch variation.*
3. **Mascot Speech Bubble Clipping at Screen Edge**: When mascot sits in the bottom-right corner, speech bubbles could overflow off-screen. *Test: Auto-adjust bubble anchor to pop inwards depending on the active corner quadrant.*
4. **Agent Done Callout Stale State**: If an agent finishes but user is already in Antigravity IDE, callout should be subtle; if user is in another app, mascot should bounce with callout bubble. *Test: Check window focus before triggering full alert hop.*
5. **Animation Performance (60 FPS CPU Load)**: 32 CSS animations must use GPU-accelerated properties (`transform`, `opacity`, `filter: drop-shadow`) only. No layout thrashing (`width`, `height`, `top`, `left` inside keyframes).

---

## 1. Root Cause Analysis: The "White Line"

### Why the White Line Appears on Screen
In the screenshot provided by the user (`media_1795413132673_b9879f18.png`):
1. **Windows 11 DWM 1px Caption Accent Line**: In Electron on Windows 11, passing `titleBarStyle: 'hidden'` creates a Window Controls Overlay (WCO) window type where Windows DWM automatically draws a 1px top accent divider across the entire window width.
2. **Stale Running Instance**: The process running at `C:\Program Files\Antigravity Presence\Antigravity Presence.exe` was from the older compilation which still possessed `titleBarStyle: 'hidden'` and the window title.

### The Fix
1. In `desktop-app/main.cjs`:
   - Remove `titleBarStyle: 'hidden'` completely.
   - Retain `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `thickFrame: false`, `hasShadow: false`, `roundedCorners: false`.
   - Set `title: ''` and ensure `overlay.html` has empty `<title></title>`.
2. In `desktop-app/overlay.html`:
   - Enforce `html, body { border: 0 !important; outline: 0 !important; margin: 0; padding: 0; background: transparent !important; }`.
   - Add zero-border sanity rule across all top-level wrappers.

---

## 2. The 32 Expressive Mascot Movements Catalog

Every movement is a distinct CSS keyframe animation state with a paired procedural audio synth signature:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       32 MASCOT MOVEMENTS CATALOG                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PROMPT & TYPING INTERACTIONS (6)                                         │
│   • M01: prompt_typing_approach  → Floats smoothly toward prompt area       │
│   • M02: prompt_typing_chirp     → Subtle curious head-tilt with sound       │
│   • M03: prompt_submit_launch    → High celebratory leap + launch sparkle   │
│   • M04: prompt_pause_curious    → Inquisitive 12° tilt looking at cursor    │
│   • M05: cursor_poke_surprise    → 180° flinch-spin + startled squeak        │
│   • M06: cursor_pet_purr         → Rythmic squash-and-stretch purr           │
│                                                                             │
│ 2. AGENT LIFECYCLE & EXECUTION (8)                                          │
│   • M07: agent_thinking_levitate → Smooth sinus float + cyan orbital ring    │
│   • M08: agent_tool_executing    → 360° corkscrew roll + amber spark         │
│   • M09: agent_file_write_laser  → Focused hover + pulsing emerald beam      │
│   • M10: agent_error_shudder     → Rapid horizontal shiver + coral flash     │
│   • M11: agent_done_celebration  → Full backflip + gold confetti burst       │
│   • M12: agent_done_callout      → "Task Complete! Return to Antigravity"    │
│   • M13: agent_subagent_spawn    → Spectral ghost duplicate echo pulse       │
│   • M14: agent_streaming_sync    → Heartbeat scale pulse on token tick       │
│                                                                             │
│ 3. DESKTOP LIFE & AMBIENT IDLE (8)                                          │
│   • M15: idle_breathe            → Calm 3.2s breathing cycle float           │
│   • M16: corner_perch_lookaround → Sits on edge, looks left/right/up         │
│   • M17: stretch_and_yawn        → Vertical body stretch (scaleY: 1.25)      │
│   • M18: bubble_float            → Floats in liquid glass bubble that pops   │
│   • M19: screen_edge_peek        → Peeks head over screen bezel              │
│   • M20: sleep_snore             → Curls up with floating "Zzz" runes        │
│   • M21: wake_up_shake           → Energetic puppy-shake into active pose    │
│   • M22: inspect_cursor          → Eyes and angle smoothly track mouse       │
│                                                                             │
│ 4. DYNAMIC NOTCH INTERACTIONS (4)                                           │
│   • M23: notch_dive_in           → Mascot flies up and docks into Island     │
│   • M24: notch_peek_down         → Mascot peeks out of bottom notch curve    │
│   • M25: notch_swing             → Dangles playfully from notch pill         │
│   • M26: notch_eject             → Drops down from notch to corner on task   │
│                                                                             │
│ 5. TELEMETRY, ALERTS & SHORTCUTS (6)                                        │
│   • M27: alert_ping_hop          → Bouncy double-hop on user input needed    │
│   • M28: milestone_parade        → Joyful side-to-side stroll                │
│   • M29: coffee_break_toast      → Lifts tiny pixel coffee mug               │
│   • M30: goodbye_wave            → Warm two-hand wave before sleeping        │
│   • M31: speedrun_dash           → Speedy running trail with wind lines      │
│   • M32: shield_defend           → Translucent hexagon barrier for security  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Apple Liquid Glass Dynamic Island Overhaul

### Aesthetic Enhancements
- **Multi-Layer Specular Refraction**:
  - Base layer: `background: linear-gradient(180deg, rgba(16, 20, 32, 0.88) 0%, rgba(8, 10, 18, 0.94) 100%)`
  - Backdrop filter: `backdrop-filter: blur(28px) saturate(200%)`
  - Specular glass highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.08)`
  - Refraction rim: `border: 1px solid rgba(255, 255, 255, 0.18)`
  - Sub-pixel bottom shadow: `0 14px 34px -4px rgba(0, 0, 0, 0.82), 0 0 20px rgba(52, 245, 164, 0.1)`
- **Dynamic States**:
  - **Collapsed Pill (Top-Center Docked)**: `196×34px`. Displays authentic mini PNG mascot, breathing LED, `ANTIGRAVITY` wordmark in Minecraft font, current status (`Idle` / `Thinking` / `Editing`), and active timer.
  - **Expanded Island (Hover / Agent Active)**: `384×138px`. Smooth spring expansion with active model badge, tool execution readout, 4 live telemetry pills, audio toggle, and IDE return button.

---

## 4. Implementation Tasks

### Task 1: Eliminate the Windows 11 Overlay White Line
- [ ] In `desktop-app/main.cjs`:
  - Remove `titleBarStyle: 'hidden'` from `createOverlayWindow()`.
  - Retain `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `thickFrame: false`, `hasShadow: false`, `roundedCorners: false`.
  - Ensure window bounds and display sync logic explicitly keep client area at 0,0 with no native chrome.
- [ ] In `desktop-app/overlay.html`:
  - Verify `html, body` have zero borders, margins, or outlines.
  - Verify `.ag-notch-wrapper` has no `border-top` or stray line artifacts.
- [ ] Add unit/integration test in `tests/overlay-window.test.ts` verifying window creation options.

### Task 2: Implement the 32 Mascot Movements Engine
- [ ] Create `src/shared/mascot-movements.ts`:
  - Enumerate the 32 movement keys and their CSS animation classes.
  - Define state mapping table from Antigravity daemon events (`PreInvocation`, `PostInvocation`, `FileWritten`, `ToolExecution`, `UserPromptStarted`, `UserPromptSubmitted`).
- [ ] Update `desktop-app/overlay.html`:
  - Add 32 `@keyframes` animation blocks for the authentic mascot PNG:
    - Floating approaches, vertical submit hops, backflips, purrs, shivers, peeks, snoozes, and dashes.
  - Update `#mascot-rig-overlay` to support dynamic `data-movement` attributes with smooth transitions.
  - Update `src/shared/mascot-rig.ts` so the shared rig supports all 32 movements.

### Task 3: Procedural 8-Bit Web Audio Synthesizer Suite
- [ ] In `desktop-app/overlay.html` (and shared audio helper):
  - Expand procedural synthesizer with distinct audio signatures for key movements:
    - `typingChirp`: Soft, rapid, multi-frequency blips (380Hz - 520Hz) throttled to 120ms.
    - `submitLeap`: Punchy ascending arpeggio (C4 → G4 → C5 → E5) with resonant sweep.
    - `taskCompleteChime`: Cheerful triumph chord (C5 → E5 → G5 → C6) with warm decay.
    - `errorShudder`: Low buzz dissonance (120Hz square wave).
    - `pokeSurprise`: High pitch squeak (880Hz).
  - Provide master mute toggle honoring `sfxMuted` preference.

### Task 4: Apple Liquid Glass Dynamic Island Visual Polish
- [ ] In `desktop-app/overlay.html`:
  - Overhaul `.ag-notch-pill` CSS with multi-layer specular glass gradients, 28px blur, 200% saturation, and inner refraction glow.
  - Add smooth spring expansion curve: `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Add active glowing perimeter halo that dynamically changes color based on agent state:
    - Emerald (`#34F5A4`): Running tools / Working.
    - Amber (`#FFB84D`): Idle / Waiting for prompt.
    - Cyan (`#38E4FF`): Prompt streaming / Thinking.
    - Coral (`#FF5E7E`): Error / Blocked.

### Task 5: Agent Task Completion "Return to Antigravity" Callout
- [ ] In `desktop-app/overlay.html`:
  - Build a sleek Liquid Glass speech bubble anchored to the mascot:
    - Text in Minecraft Seven font: `"Task Complete! Return to Antigravity"`.
    - Includes a glowing 1-click button: `"Back to IDE"`.
    - Clicking the button or the mascot focuses the Antigravity IDE window via `electronAPI.focusIde()`.
  - Wire to `PostInvocation` events with `fullyIdle: true`.
  - Mascot automatically plays `M11: agent_done_celebration` followed by `M12: agent_done_callout`.

### Task 6: Testing, Packaging & Release v2.3.0
- [ ] Run full test suite (`npm test`) ensuring 86+ tests pass with 100% green status.
- [ ] Rebuild standalone Windows Setup Installer (`Antigravity Presence Setup 2.3.0.exe`) and Portable EXE (`Antigravity Presence 2.3.0.exe`).
- [ ] Verify locally that the white line is 100% gone, movements trigger flawlessly, and notch looks like genuine Apple liquid glass.
- [ ] Commit all code changes, push to GitHub (`origin main`), and publish assets to GitHub Release `v2.3.0`.
