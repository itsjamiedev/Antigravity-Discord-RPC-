# Mascot Expressions Engine, Liquid Glass Notch & Canvas-Clamped Menu Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently eliminate the Windows 11 overlay white line, fix the mascot popover menu viewport-boundary clipping, implement a dynamic natural smile and facial expression layer, engineer true walking kinematics and 32 choreographed movements with procedural audio, overhaul the Apple Liquid Glass Dynamic Island Notch with specular highlights, and wire task-completion callouts that guide users back to Antigravity IDE.

**Architecture:** Electron overlay window (`desktop-app/overlay.html`, `desktop-app/main.cjs`) updated to clean frameless mode without DWM caption injection; dynamic SVG facial expression overlay (smile, laugh, curious, surprised, sleepy, wink) mapped directly onto the authentic master PNG mascot; true walking waddle physics with leg strides and directional flips; JavaScript boundary-aware clamping algorithm for `.ag-mascot-menu` preventing screen overflow; procedural 8-bit Web Audio synthesizer for typing chirps, launch jumps, and task completion chimes; real-time SSE hook listener streaming prompt and agent lifecycle events from the Antigravity daemon to trigger mascot reactions dynamically.

**Tech Stack:** Electron 35, HTML5/CSS3 (Glassmorphism, hardware-accelerated transforms, KaTeX/Minecraft typography), Web Audio API (procedural synthesis), Node.js, TypeScript/Vitest.

**Spec:** Current session requirements, `f:\Antigravity Extension\.agents\AGENTS.md` (Design taste, Minecraft Seven font, no placeholders, full output).

---

## Global Constraints

- **Zero White Line**: The desktop transparent overlay must never render any native border, DWM caption line, or accent strip. `titleBarStyle: 'hidden'` must be completely removed in favor of pure `frame: false, transparent: true`.
- **Zero Menu Clipping**: The mascot popover menu must never overflow off-screen (`Math.max(12, Math.min(window.innerWidth - menuWidth - 12, ...))`).
- **Authentic Master PNG + Natural Expressions**: Keep the user's authentic high-DPI master PNG (`resources/mascot.png`) as the base body, with a responsive SVG facial expression layer (natural smile, open laugh, curious tilt, surprised 'o', sleepy curve) overlaid directly onto the face.
- **Pure Procedural Audio**: Zero external `.wav` or `.mp3` dependencies; all typing chirps, launch leaps, and task chimes synthesized in real-time via Web Audio API oscillators.
- **Dual Independent Toggles**: Both `notchEnabled` and `mascotEnabled` must remain independently toggleable in real-time across the Notch, Mascot menu, Dashboard, Sidebar, Installer, and Tray.
- **Git Push on Every Change**: Every commit automatically pushed to GitHub (`origin main`).
- **Never Touch `F:\MCBE`**.

---

## Review Focus (Failure Modes & Edge Cases)

1. **Menu Clipping at Screen Corners**: When the mascot is parked at `x = 8px` or `x = window.innerWidth - 108px`, the 192px menu with `translateX(-50%)` overflows by ~46px on either side. *Test: Verify menu boundary clamping keeps the entire card at least 12px away from all screen edges.*
2. **Expression Alignment During Scaling & Flipping**: When the mascot flips horizontally (`scaleX(-1)`) or squashes during animations, the smile layer must remain locked in pixel-perfect alignment with the eyes. *Test: Anchor SVG expression layer to mascot body coordinate frame.*
3. **Walking Kinematics Without Jitter**: In `walk_follow` mode, rapid small cursor movements could cause rapid animation thrashing. *Test: Add 16px deadzone and low-pass filter on walk vector before initiating stride cycle.*
4. **Windows 11 DWM Caption Line**: If `titleBarStyle` is set to anything on a transparent window in Windows 11, DWM injects a 1px white border. *Test: Verify `overlayWindow` options omit `titleBarStyle` and set `frame: false, transparent: true, thickFrame: false, hasShadow: false, roundedCorners: false`.*
5. **Rapid Prompt Typing Sound Overlap**: If typing chirps fire on every keystroke without throttling, Web Audio nodes will stack and distort. *Test: Debounce typing audio to a max cadence of 120ms with smooth pitch variation.*

---

## 1. Mascot Facial Expression & Natural Smile System

### The Expression Overlay Layer
The authentic PNG mascot has two pixel-style dark rounded rectangular eyes on a triangular gradient body. We overlay a responsive SVG face layer right between and below the eyes with 6 expressive states:

1. **`smile` (Default & Warm)**: A gentle, natural curved smile line in matching dark navy (`#0B1020`) with smooth rounded stroke ends (`stroke-linecap: round; stroke-width: 2.2px`).
2. **`laugh` / `excited`**: Open joyful crescent smile with a soft rosy tongue curve, triggered on prompt submit or task completion.
3. **`curious`**: Small quizzical smile tilted 8° sideways with one eyebrow slightly raised, triggered when the user pauses typing.
4. **`surprised`**: Cute small circular 'o' mouth with widened eyes, triggered when hovered quickly or on tool errors.
5. **`sleepy`**: Soft horizontal line with gentle floating "Zzz" rune bubbles.
6. **`wink`**: Left eye squints into a cheeky crescent arc while the mouth gives a playful sideways grin.

```
       [   ]     [   ]        <- Natural Eyes
            \___/             <- Natural SVG Smile (#0B1020, smooth curve)
```

---

## 2. Walking Kinematics & 32 Mascot Movements Catalog

### True Walking Kinematics (`walk_follow` mode)
When the mascot follows the cursor or patrols:
- **Stride Cadence**: 420ms cycle.
- **Alternating Stride Wobble**: Body rocks gently from `-4.5deg` to `+4.5deg`.
- **Vertical Step Bobbing**: Bounces `translateY(-5px)` at stride peak, dropping with a soft squash (`scale(1.04, 0.96)`) on step contact.
- **Directional Flip**: Smoothly flips `scaleX(1)` when moving right and `scaleX(-1)` when moving left with a 120ms turn-ease.

### The 32 Choreographed Movements
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       32 MASCOT MOVEMENTS CATALOG                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. PROMPT & TYPING INTERACTIONS (6)                                         │
│   • M01: prompt_typing_approach  → Floats smoothly toward prompt area       │
│   • M02: prompt_typing_chirp     → Curious head-tilt with sound + smile      │
│   • M03: prompt_submit_launch    → High celebratory leap + launch sparkle   │
│   • M04: prompt_pause_curious    → Inquisitive 12° tilt looking at cursor    │
│   • M05: cursor_poke_surprise    → 180° flinch-spin + startled squeak        │
│   • M06: cursor_pet_purr         → Rhythmic squash-and-stretch purr          │
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

## 3. Screen-Boundary Clamped Popover Menu

### Root Cause of Clipping in `media_1795413278776_0e12d7e0.png`
The mascot menu uses `position: absolute; bottom: 124px; left: 50%; transform: translateX(-50%); width: 192px;`.
When the mascot is within 46px of either the left or right screen border, the menu extends outside the Electron window and is clipped by the OS screen boundary.

### The Fix
Implement dynamic JavaScript clamping inside `updateMenuPosition()`:
```javascript
function updateMenuPosition() {
  const actorRect = mascotActor.getBoundingClientRect();
  const menuWidth = 196;
  const menuHeight = mascotMenu.offsetHeight || 280;
  
  // Calculate ideal screen X centered on mascot
  let idealScreenX = actorRect.left + (actorRect.width / 2) - (menuWidth / 2);
  // Clamp within viewport with 12px safe boundary
  idealScreenX = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, idealScreenX));
  
  // Convert to relative left for mascotActor container
  const relativeLeft = idealScreenX - actorRect.left;
  mascotMenu.style.left = relativeLeft + 'px';
  mascotMenu.style.transform = 'none'; // Discard unsafe translateX(-50%)
  
  // Vertical boundary check: if near top of screen, drop down instead of popping up
  if (actorRect.top < menuHeight + 20) {
    mascotMenu.classList.add('drop-down');
  } else {
    mascotMenu.classList.remove('drop-down');
  }
}
```

---

## 4. Implementation Tasks

### Task 1: Fix Menu Viewport-Boundary Clipping & Polish Styling
- [ ] In `desktop-app/overlay.html`:
  - Implement `updateMenuPosition()` clamping the menu within `[12px, window.innerWidth - menuWidth - 12px]`.
  - Wire `updateMenuPosition()` into menu opening, window resizing, and mascot movement.
  - Refine `.ag-mascot-menu` with dark obsidian glass (`backdrop-filter: blur(28px) saturate(190%)`), rounded 14px corners, and clean typography in Minecraft Seven.
  - Eliminate all button icon / label clipping.

### Task 2: Eliminate the Windows 11 Overlay White Line
- [ ] In `desktop-app/main.cjs`:
  - Remove `titleBarStyle: 'hidden'` from `createOverlayWindow()`.
  - Retain `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `thickFrame: false`, `hasShadow: false`, `roundedCorners: false`.
  - Ensure window bounds and display sync logic explicitly keep client area at 0,0 with no native chrome.
- [ ] In `desktop-app/overlay.html`:
  - Verify `html, body` have zero borders, margins, or outlines.
  - Verify `.ag-notch-wrapper` has no `border-top` or stray line artifacts.

### Task 3: Natural Smile & Dynamic Facial Expression Layer
- [ ] In `desktop-app/overlay.html`:
  - Overlay an SVG facial expression component directly onto the authentic master PNG:
    - `smile`: Natural, gentle upward curve in `#0B1020` matching eyes.
    - `laugh`: Joyful open crescent with subtle pink blush.
    - `curious`: Inquisitive tilt with quizzical mouth.
    - `surprised`: Small expressive 'o' mouth.
    - `sleepy`: Peaceful closed smile line with Zzz runes.
    - `wink`: Cheeky grin with one winking eye.
  - Add smooth transition logic switching expressions based on active agent state.

### Task 4: True Walking Kinematics & 32 Movement States
- [ ] In `desktop-app/overlay.html`:
  - Implement realistic walking cadence (`stride`, `waddle`, `bob`, `directional_flip`).
  - Add CSS `@keyframes` and state classes for the complete 32-movement catalog.
  - Wire movement triggers into CentralTracker and daemon event stream.

### Task 5: Procedural 8-Bit Web Audio Synthesizer Suite
- [ ] In `desktop-app/overlay.html`:
  - Synthesize responsive typing blips (throttled to 120ms), submit launch arpeggios, and task-complete victory chords.
  - Provide master mute toggle honoring user preference.

### Task 6: Apple Liquid Glass Dynamic Island Visual Polish
- [ ] In `desktop-app/overlay.html`:
  - Overhaul `.ag-notch-pill` CSS with multi-layer specular glass gradients, 28px blur, 200% saturation, and inner refraction glow.
  - Add smooth spring expansion curve: `cubic-bezier(0.22, 1, 0.36, 1)`.
  - Add active glowing perimeter halo that dynamically changes color based on agent state.

### Task 7: Agent Task Completion "Return to Antigravity" Callout
- [ ] In `desktop-app/overlay.html`:
  - Build a sleek Liquid Glass speech bubble anchored to the mascot: `"Task Complete! Return to Antigravity"`.
  - Include 1-click button to focus the Antigravity IDE window.
  - Play victory celebration flip and chime.

### Task 8: Verification, Packaging & Release
- [ ] Verify test suite (`npm test`) passes with 100% green status.
- [ ] Rebuild standalone Windows Setup Installer (`Antigravity Presence Setup 2.3.0.exe`) and Portable EXE (`Antigravity Presence 2.3.0.exe`).
- [ ] Commit all code changes, push to GitHub (`origin main`), and publish assets to GitHub Release `v2.3.0`.
