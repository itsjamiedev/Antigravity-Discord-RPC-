# Mascot Expressions Engine, Liquid Glass Notch & 32-Movement Kinematics Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently eliminate the Windows 11 overlay white line, fix the mascot popover menu viewport-boundary clipping, implement a dynamic natural smile and facial expression layer, engineer true walking kinematics and an exhaustive 32-movement choreography engine with procedural 8-bit audio, overhaul the Apple Liquid Glass Dynamic Island Notch with specular highlights, and wire task-completion callouts that guide users back to Antigravity IDE.

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

## Section 1: Detailed Specifications of All 32 Movements

Each movement is specified with its trigger condition, keyframe trajectory, CSS transforms, facial expression, procedural audio signature, and recovery transition:

### Category A: Prompt & User Input Interactions (M01 – M06)

#### M01: `prompt_typing_approach`
- **Trigger**: User starts typing in Antigravity prompt textarea (`UserPromptTyping` hook or focus event).
- **Choreography & Transforms**:
  - `0%`: Current position, `transform: scale(1) translateY(0)`.
  - `40%`: Mascot rotates `8deg` toward active window, floats `18px` closer to prompt line (`transform: translate(-12px, -18px) rotate(8deg)`).
  - `80%`: Slight hover bob (`translate(-12px, -24px) rotate(6deg)`).
  - `100%`: Perched hover pose (`translate(-12px, -20px) rotate(7deg)`).
- **Facial Expression**: `smile` (gentle upward curve) with eyes leaning toward cursor.
- **Procedural Audio**: Soft ambient floating hum (`220Hz` sine wave, gain `0.015`, duration `240ms`).
- **Particle / FX**: Subtle cyan glow aura (`drop-shadow(0 0 12px rgba(56, 228, 255, 0.45))`).
- **Recovery**: Transitions smoothly to `M04: prompt_pause_curious` or `idle_breathe` if typing stops for >1.5s.

#### M02: `prompt_typing_chirp`
- **Trigger**: Keystroke burst while typing prompt (debounced to 120ms cadence).
- **Choreography & Transforms**:
  - `0%`: `transform: scale(1, 1) rotate(0deg)`.
  - `50%`: Quick perky head-bob (`transform: scale(1.06, 0.94) rotate(-3deg)`).
  - `100%`: Bounces back (`transform: scale(1, 1) rotate(0deg)`).
- **Facial Expression**: `smile` with quick cheerful blinks.
- **Procedural Audio**: Inquisitive 8-bit chirp: triangle wave, frequency ramping `440Hz → 620Hz` in `45ms`, gain `0.028`.
- **Particle / FX**: Micro-sparkle emit at top tip (`#34F5A4`).
- **Recovery**: Instant (50ms) return to typing hover stance.

#### M03: `prompt_submit_launch`
- **Trigger**: User presses Enter / clicks Send in Antigravity (`UserPromptSubmitted` hook).
- **Choreography & Transforms**:
  - `0%`: Squash preparation (`transform: scale(1.18, 0.78) translateY(8px)`).
  - `35%`: Explosive vertical leap upward (`transform: scale(0.88, 1.22) translateY(-42px)`).
  - `65%`: Mid-air triumphant float with 360° spin (`transform: scale(1) translateY(-36px) rotate(360deg)`).
  - `85%`: Descending glide with soft cushion landing (`transform: scale(1.08, 0.92) translateY(2px)`).
  - `100%`: Settles into active thinking pose (`transform: scale(1) translateY(0)`).
- **Facial Expression**: `laugh` (joyful wide open crescent smile `:D`).
- **Procedural Audio**: Ascending power arpeggio: square wave with low-pass filter, notes `C4 (261Hz) → G4 (392Hz) → C5 (523Hz) → E5 (659Hz)`, `60ms` per note, total `240ms`, gain `0.045`.
- **Particle / FX**: Golden launch dust particles burst downward (`#FFB84D`).
- **Recovery**: Seamlessly hands off to `M07: agent_thinking_levitate`.

#### M04: `prompt_pause_curious`
- **Trigger**: User stops typing for >1.2s while prompt input remains focused.
- **Choreography & Transforms**:
  - `0%`: Perched hover pose.
  - `50%`: Mascot tilts head inquisitively `12deg` to the right, leaning ear forward (`transform: rotate(12deg) translateY(-4px)`).
  - `100%`: Gentle inquisitive sway (`transform: rotate(10deg) translateY(-2px)`).
- **Facial Expression**: `curious` (quizzical asymmetric smile with one eyebrow raised).
- **Procedural Audio**: Question mark squeak: sine wave sliding `320Hz → 480Hz` with gentle vibrato, `110ms`, gain `0.02`.
- **Particle / FX**: None (clean, focused contemplation).
- **Recovery**: Instantly resumes `M01` when typing resumes, or drops to `idle_breathe` on blur.

#### M05: `cursor_poke_surprise`
- **Trigger**: User clicks directly on the mascot actor or hovers rapidly across it at high velocity.
- **Choreography & Transforms**:
  - `0%`: Stance.
  - `20%`: Quick startled compression (`transform: scale(0.85, 1.18) translateY(-14px)`).
  - `60%`: Rapid 180° flinch spin and rebound (`transform: scale(1.12, 0.9) rotate(-15deg)`).
  - `100%`: Shakes off surprise into smiling stance (`transform: scale(1) rotate(0)`).
- **Facial Expression**: `surprised` (small circular 'o' mouth with wide alert eyes).
- **Procedural Audio**: Cute startled chirp: square wave `740Hz → 880Hz → 660Hz`, duration `85ms`, gain `0.035`.
- **Particle / FX**: 2 yellow surprise star sprites pop above mascot head.
- **Recovery**: Returns to `idle_breathe` after 600ms.

#### M06: `cursor_pet_purr`
- **Trigger**: User hovers cursor gently over mascot for >800ms without clicking.
- **Choreography & Transforms**:
  - Repeating rhythmic squash-and-stretch cycle:
  - `0%, 100%`: `transform: scale(1.05, 0.95) translateY(2px)`.
  - `50%`: `transform: scale(0.96, 1.04) translateY(-3px)`.
  - Total cycle duration: `1.4s` infinite ease-in-out.
- **Facial Expression**: `smile` with closed joyful curved eye crescents (`^ _ ^`).
- **Procedural Audio**: Calming low-frequency rhythmic purr: dual triangle oscillators modulated at `8Hz`, base pitch `110Hz`, gain `0.018`.
- **Particle / FX**: Soft pink floating heart bubble floating up `28px` before fading.
- **Recovery**: Fades purr and returns to `idle_breathe` when cursor leaves.

---

### Category B: Agent Lifecycle & Execution (M07 – M14)

#### M07: `agent_thinking_levitate`
- **Trigger**: Antigravity agent starts generating / thinking (`PreInvocation` hook).
- **Choreography & Transforms**:
  - Smooth sinusoidal vertical floating:
  - `0%, 100%`: `transform: translateY(0) scale(1)`.
  - `50%`: `transform: translateY(-16px) scale(0.98, 1.02)`.
  - Duration: `2.4s` infinite cubic-bezier(0.45, 0, 0.55, 1).
- **Facial Expression**: `curious` transitioning to focused contemplative smile.
- **Procedural Audio**: Ethereal resonant drone: dual sine waves at `216Hz` and `432Hz` with slow `0.5Hz` beating chorus, gain `0.012`.
- **Particle / FX**: Cyan orbital ring rotating horizontally around mascot waist (`transform: rotateX(65deg) rotateZ(...)`).
- **Recovery**: Hands off to `M08` on tool execution or `M11` on completion.

#### M08: `agent_tool_executing`
- **Trigger**: Antigravity agent executes a tool (`call_tool` event: terminal, file, browser, MCP).
- **Choreography & Transforms**:
  - `0%`: Levitation pause.
  - `25%`: Tight wind-up (`transform: scale(0.9, 1.1) rotate(-25deg)`).
  - `65%`: Dynamic 360° corkscrew roll (`transform: scale(1.05) rotate(335deg)`).
  - `100%`: Locks back into centered working stance (`transform: scale(1) rotate(360deg)`).
  - Duration: `680ms` cubic-bezier(0.34, 1.56, 0.64, 1).
- **Facial Expression**: `laugh` (excited energetic grin).
- **Procedural Audio**: Cybernetic servo whir: pitched sweep `300Hz → 750Hz → 480Hz`, gain `0.026`.
- **Particle / FX**: 3 amber spark particles burst outward (`#FFB84D`).
- **Recovery**: Reverts to `M07: agent_thinking_levitate` while turn continues.

#### M09: `agent_file_write_laser`
- **Trigger**: File write or edit operation (`write_file`, `edit_file` tool call).
- **Choreography & Transforms**:
  - Mascot hovers focused downward with body tilted `-12deg`.
  - Micro-vibrates with precise rhythmic laser cadence (`transform: translate(-0.5px, 0.5px)` at `30Hz`).
- **Facial Expression**: Focused determined smile with downward gaze.
- **Procedural Audio**: Data-writer chiptune chatter: rapid square-wave clicks at `14Hz`, `820Hz` tone, gain `0.02`.
- **Particle / FX**: Pulsing vertical emerald laser beam line beneath mascot (`rgba(52, 245, 164, 0.6)`).
- **Recovery**: Drops laser beam and hops back up upon file write completion.

#### M10: `agent_error_shudder`
- **Trigger**: Tool call errors or returns non-zero exit code.
- **Choreography & Transforms**:
  - `0%`: Stance.
  - `15%, 45%, 75%`: Rapid horizontal shudder (`transform: translateX(-6px) scale(0.95)`).
  - `30%, 60%, 90%`: Rapid shudder opposite (`transform: translateX(6px) scale(0.95)`).
  - `100%`: Drops down slightly (`transform: translateX(0) translateY(4px) scale(1)`).
  - Duration: `450ms`.
- **Facial Expression**: `surprised` with soft frowning mouth curve and widened eyes.
- **Procedural Audio**: Dissonant error buzz: dual detuned square waves at `115Hz` and `122Hz`, `180ms`, gain `0.038`.
- **Particle / FX**: Soft coral flash aura (`drop-shadow(0 0 16px rgba(255, 94, 126, 0.65))`).
- **Recovery**: Mascot shakes head and returns to `curious` after 800ms.

#### M11: `agent_done_celebration`
- **Trigger**: Agent turn completes (`PostInvocation` hook with `fullyIdle: true`).
- **Choreography & Transforms**:
  - `0%`: Deep celebratory crouch (`transform: scale(1.22, 0.74) translateY(10px)`).
  - `30%`: Massive launch leap into a full backflip (`transform: scale(0.9, 1.15) translateY(-55px) rotate(-180deg)`).
  - `65%`: Completes full 360° rotation in air (`transform: scale(1.05) translateY(-40px) rotate(-360deg)`).
  - `85%`: Soft bounce landing (`transform: scale(1.12, 0.9) translateY(4px)`).
  - `100%`: Stands tall with raised hands/arms pose (`transform: scale(1) translateY(0)`).
  - Duration: `850ms` cubic-bezier(0.22, 1, 0.36, 1).
- **Facial Expression**: `laugh` (broad ecstatic open smile `:D`).
- **Procedural Audio**: Triumph fanfare chord arpeggio: square wave + warm triangle, notes `C5 (523Hz) → E5 (659Hz) → G5 (784Hz) → C6 (1046Hz)`, total `360ms`, gain `0.05`.
- **Particle / FX**: 8 multi-color confetti sprites shower outward (emerald, gold, cyan, coral).
- **Recovery**: Instantly triggers `M12: agent_done_callout`.

#### M12: `agent_done_callout`
- **Trigger**: Immediately follows `M11` when agent task completes.
- **Choreography & Transforms**:
  - Mascot lands and gestures towards an anchored Liquid Glass speech bubble.
  - Mascot gentle float bobbing (`translateY(-3px)` to `translateY(1px)`).
- **Facial Expression**: `smile` with warm eye contact toward the user.
- **Visual Bubble & Typography**:
  - Frosted glass bubble (`backdrop-filter: blur(24px) saturate(180%)`, border `rgba(52, 245, 164, 0.35)`).
  - Header in Minecraft Seven: `"TASK COMPLETE!"` in emerald `#34F5A4`.
  - Body: `"Return to Antigravity to review changes"`.
  - CTA Button: `[Back to IDE]` with emerald glow.
- **Click Behavior**: Clicking the speech bubble or button calls `window.electronAPI.focusIde()` to instantly raise the Antigravity window.
- **Recovery**: Speech bubble remains open until clicked or auto-dismisses after 14s into `idle_breathe`.

#### M13: `agent_subagent_spawn`
- **Trigger**: Agent delegates work to a subagent (`invoke_subagent` tool call).
- **Choreography & Transforms**:
  - Mascot splits into a semi-transparent spectral ghost clone that pulses out to the side (`translateX(32px) opacity(0.6)`), salutes, and dissolves into pixel sparkles.
  - Main mascot watches with an admiring nod (`rotate(6deg)`).
  - Duration: `720ms`.
- **Facial Expression**: `wink` (cheeky approving grin).
- **Procedural Audio**: Spectral teleporter whoosh: noise generator swept through bandpass filter `600Hz → 1400Hz`, duration `260ms`, gain `0.03`.
- **Particle / FX**: Blue ghost echo outline and dissipating sparkles.
- **Recovery**: Ghost merges back and mascot resumes `agent_thinking_levitate`.

#### M14: `agent_streaming_sync`
- **Trigger**: Token streaming updates received from active LLM generation.
- **Choreography & Transforms**:
  - Heartbeat rhythmic micro-pulse synchronized to token arrival chunks:
  - Scales `1.03` on token batch arrival, returning to `1.0` in `80ms`.
- **Facial Expression**: `curious` with softly pulsing eyes.
- **Procedural Audio**: None (silent during high-speed token generation to prevent audio fatigue).
- **Particle / FX**: Soft breathing cyan edge glow on body contour.
- **Recovery**: Smooth ease back to `agent_thinking_levitate` when token stream pauses.

---

### Category C: Desktop Life & Ambient Idle (M15 – M22)

#### M15: `idle_breathe`
- **Trigger**: Default state when no agent task is active and no cursor interaction is occurring.
- **Choreography & Transforms**:
  - Calming 3.4s infinite cycle:
  - `0%, 100%`: `transform: translateY(0) scale(1, 1)`.
  - `50%`: `transform: translateY(-8px) scale(0.97, 1.03)`.
  - Paired with ambient ground shadow expansion/contraction.
- **Facial Expression**: `smile` (natural, relaxed upward mouth curve).
- **Procedural Audio**: Completely silent.
- **Particle / FX**: None.
- **Recovery**: Seamlessly branches into any active movement state on demand.

#### M16: `corner_perch_lookaround`
- **Trigger**: Mascot stays in idle for >25s in `sit_corner` behavior.
- **Choreography & Transforms**:
  - `0%`: Stance.
  - `25%`: Looks left, body rotates `-10deg` (`transform: rotate(-10deg) translateY(-2px)`).
  - `50%`: Centers and tilts up toward top of screen (`transform: rotate(0deg) translateY(-5px)`).
  - `75%`: Looks right, body rotates `+10deg` (`transform: rotate(10deg) translateY(-2px)`).
  - `100%`: Returns to center with a contented nod.
  - Duration: `3.2s`.
- **Facial Expression**: Eyes track left, up, right; smile remains warm and gentle.
- **Procedural Audio**: Soft curiosity blip on upward glance (`520Hz`, `30ms`, gain `0.015`).
- **Particle / FX**: None.
- **Recovery**: Returns to `idle_breathe`.

#### M17: `stretch_and_yawn`
- **Trigger**: Mascot idle for >60s.
- **Choreography & Transforms**:
  - `0%`: Stance.
  - `35%`: Deep upward body stretch (`transform: scale(0.88, 1.28) translateY(-14px)`).
  - `70%`: Relaxed wobble back down (`transform: scale(1.08, 0.94) translateY(2px)`).
  - `100%`: Refresh bounce to normal (`transform: scale(1) translateY(0)`).
  - Duration: `1.8s`.
- **Facial Expression**: `surprised` transitioning to sleepy relaxed smile with eyes closed.
- **Procedural Audio**: Soft cute yawn sound: dual sine waves descending gently `380Hz → 240Hz`, duration `380ms`, gain `0.02`.
- **Particle / FX**: Tiny transparent air bubble puff.
- **Recovery**: Returns to `idle_breathe`.

#### M18: `bubble_float`
- **Trigger**: Periodic rare ambient behavior (every 4–6 minutes while idle).
- **Choreography & Transforms**:
  - A translucent liquid glass bubble forms around the mascot.
  - Mascot floats up `24px` inside the bubble with gentle wobbling (`rotate(-4deg)` ↔ `rotate(4deg)`).
  - At peak, bubble pops and mascot drops with a cute parachute bounce.
  - Duration: `3.6s`.
- **Facial Expression**: `laugh` (delighted open smile).
- **Procedural Audio**: Pop sound: filtered noise pulse + `980Hz` blip, `40ms`, gain `0.035`.
- **Particle / FX**: 4 iridescent bubble droplet particles dissipate outwards.
- **Recovery**: Lands safely and resumes `idle_breathe`.

#### M19: `screen_edge_peek`
- **Trigger**: Mascot parked on screen border; user moves mouse away.
- **Choreography & Transforms**:
  - Mascot lowers body behind screen bezel, leaving only upper eyes and top antenna tip visible.
  - Peeks up `16px` periodically to check on the desktop.
- **Facial Expression**: Curious peeking eyes with a peek smile.
- **Procedural Audio**: None.
- **Particle / FX**: None.
- **Recovery**: Pops fully back into view if cursor approaches within 120px.

#### M20: `sleep_snore`
- **Trigger**: Inactivity for >3 minutes, or user toggles `Sleep Mode` from mascot menu.
- **Choreography & Transforms**:
  - Mascot curls down into a compact sitting ball (`transform: scale(1.06, 0.88) translateY(6px)`).
  - Breathing rhythm slows to `4.8s` deep cycle (`transform: scale(1.08, 0.86)` ↔ `scale(1.02, 0.92)`).
- **Facial Expression**: `sleepy` (peaceful closed curved eyes, gentle sleeping mouth line).
- **Procedural Audio**: Soft periodic snooze breath: filtered white noise gently breathing in and out every `4.8s`, gain `0.008`.
- **Particle / FX**: Floating animated "Zzz" rune glyphs rising every 3 seconds.
- **Recovery**: Any mouse click or agent task triggers `M21: wake_up_shake`.

#### M21: `wake_up_shake`
- **Trigger**: Waking from sleep mode or task arrival during sleep.
- **Choreography & Transforms**:
  - `0%`: Sleeping ball pose.
  - `20%`: Pops eyes open with surprise jump (`transform: scale(0.92, 1.15) translateY(-12px)`).
  - `40%, 60%, 80%`: Vigorous puppy-shake left and right (`transform: rotate(-18deg)` ↔ `rotate(18deg)` at `25Hz`).
  - `100%`: Proud, alert standing stance (`transform: scale(1) rotate(0)`).
  - Duration: `720ms`.
- **Facial Expression**: `surprised` to `laugh` with bright alert sparkle in eyes.
- **Procedural Audio**: Wake-up jingle: ascending 3-note chime `D5 (587Hz) → G5 (784Hz) → B5 (988Hz)`, gain `0.038`.
- **Particle / FX**: 3 wake-up star sparkles bursting around head.
- **Recovery**: Ready for immediate prompt or task response.

#### M22: `inspect_cursor`
- **Trigger**: Cursor moves across screen in `walk_follow` or active tracking mode.
- **Choreography & Transforms**:
  - Mascot body pivots smoothly to face cursor coordinates (`rotate(angle)` clamped between `-18deg` and `+18deg`).
  - Eye positions in SVG expression layer offset dynamically by up to `3px` in direction of cursor vector.
- **Facial Expression**: `smile` with active tracking gaze.
- **Procedural Audio**: None.
- **Particle / FX**: None.
- **Recovery**: Centers eyes when cursor stops moving for >2s.

---

### Category D: Dynamic Notch Interactions (M23 – M26)

#### M23: `notch_dive_in`
- **Trigger**: User drags mascot up to the Dynamic Island Notch or clicks "Dock in Notch".
- **Choreography & Transforms**:
  - Mascot accelerates upward in a graceful parabolic arc toward top-center (`translate(dx, dy) scale(0.45)`).
  - Dynamic Island Notch expands its pill to receive mascot.
  - Mascot smoothly docks into the left icon slot of the notch.
  - Duration: `550ms` cubic-bezier(0.22, 1, 0.36, 1).
- **Facial Expression**: `laugh` (excited flight smile).
- **Procedural Audio**: Suction / docking snap: frequency sweep `320Hz → 840Hz` with low-pass pop, `90ms`, gain `0.035`.
- **Particle / FX**: Notch border pulses with emerald ripple wave.
- **Recovery**: Mascot icon inside notch becomes the active telemetry avatar.

#### M24: `notch_peek_down`
- **Trigger**: Agent is idle and mascot is docked inside Dynamic Notch.
- **Choreography & Transforms**:
  - Mascot's head and eyes peek out from the bottom curved rim of the Island pill looking down at windows.
  - Wiggles ears playfully before popping back into pill.
  - Duration: `1.8s`.
- **Facial Expression**: Curious upside-down peek smile.
- **Procedural Audio**: Cute peek tone: `620Hz` triangle wave blip, `40ms`, gain `0.018`.
- **Particle / FX**: None.
- **Recovery**: Smoothly retreats into notch pill.

#### M25: `notch_swing`
- **Trigger**: User hovers cursor over Dynamic Notch when docked.
- **Choreography & Transforms**:
  - Mascot dangles from the bottom edge of the notch by its little arms, swinging gently like a pendulum (`rotate(-14deg)` ↔ `rotate(14deg)`).
  - Pulls itself back up into the notch with a cute flip.
  - Duration: `1.4s`.
- **Facial Expression**: `laugh` with swinging motion.
- **Procedural Audio**: Playful pendulum click: soft woodblock-style clicks at swing extremes, gain `0.02`.
- **Particle / FX**: None.
- **Recovery**: Returns to docked position.

#### M26: `notch_eject`
- **Trigger**: User selects "Undock to Desktop" or new major prompt task begins.
- **Choreography & Transforms**:
  - Notch expands; mascot leaps out downward with a graceful superhero landing in the corner.
  - Scales `0.45 → 1.0` during flight.
  - Soft bounce squash on ground contact (`scale(1.15, 0.85)`).
  - Duration: `600ms` cubic-bezier(0.22, 1, 0.36, 1).
- **Facial Expression**: `smile` with superhero determination.
- **Procedural Audio**: Descending whoosh into punchy landing beat: `600Hz → 180Hz` swept wave + soft bass thump, gain `0.04`.
- **Particle / FX**: Impact dust ring on ground contact.
- **Recovery**: Establishes ground position in active corner.

---

### Category E: Telemetry, Alerts & Special Shortcuts (M27 – M32)

#### M27: `alert_ping_hop`
- **Trigger**: Daemon requires user input, confirmation, or permission check.
- **Choreography & Transforms**:
  - Energetic double vertical hop:
  - Hop 1: `translateY(-22px)` with quick squash.
  - Hop 2: `translateY(-30px)` with spin.
  - Duration: `620ms`.
- **Facial Expression**: `surprised` with alert wide eyes.
- **Procedural Audio**: Two-tone notification chime: `A5 (880Hz)` followed by `E6 (1318Hz)`, duration `180ms`, gain `0.045`.
- **Particle / FX**: Flashing amber exclamation mark bubble above head (`!`).
- **Recovery**: Holds attention until user responds or interacts.

#### M28: `milestone_parade`
- **Trigger**: Session time crosses round hour milestone (e.g. 1h, 2h, 5h, 10h) or 100 tools executed.
- **Choreography & Transforms**:
  - Joyful side-to-side parade stroll across 60px distance with high-stepping cadence.
  - Mascot raises a mini pixel flag with celebration numbers.
  - Duration: `2.4s`.
- **Facial Expression**: `laugh` (proud broad smile).
- **Procedural Audio**: Triumph 4-note celebration riff, gain `0.04`.
- **Particle / FX**: Confetti burst and hour milestone badge.
- **Recovery**: Smooth stroll back to base anchor.

#### M29: `coffee_break_toast`
- **Trigger**: User has been coding continuously for >90 minutes without break.
- **Choreography & Transforms**:
  - Mascot pulls out a steaming tiny pixel coffee mug and raises it in a gentle toast toward the screen.
  - Steam spirals upward.
- **Facial Expression**: Warm, supportive, caring smile.
- **Procedural Audio**: Soft mug clink tone (`1240Hz` bell chime, decay `300ms`, gain `0.025`).
- **Particle / FX**: Pixel steam particles rising and fading.
- **Recovery**: Drinks from mug and stores it away after 6 seconds.

#### M30: `goodbye_wave`
- **Trigger**: App is closing or user puts Antigravity to sleep.
- **Choreography & Transforms**:
  - Mascot faces user and waves both little arms warmly from side to side (`rotate(-8deg)` ↔ `rotate(8deg)`).
  - Body softly floats up and fades gently.
  - Duration: `1.2s`.
- **Facial Expression**: `smile` with gentle fond eyes.
- **Procedural Audio**: Warm descending farewell chord: `G4 → E4 → C4`, gain `0.03`.
- **Particle / FX**: Soft starlight sparkles fading out.
- **Recovery**: Window closes cleanly.

#### M31: `speedrun_dash`
- **Trigger**: Agent executes 3 or more tool calls in rapid succession (<2 seconds).
- **Choreography & Transforms**:
  - Mascot leans forward `25deg` into a full sonic dash across the bottom screen border.
  - Leaves trailing speed ghost lines behind it.
  - Duration: `800ms`.
- **Facial Expression**: `excited` / focused speed grin.
- **Procedural Audio**: Jet engine whoosh / sci-fi acceleration sweep, gain `0.035`.
- **Particle / FX**: Cyan and gold speed line streaks.
- **Recovery**: Skids to a halt with cute dust puff and resumes tracking.

#### M32: `shield_defend`
- **Trigger**: Security intelligence check active or suspicious pattern blocked.
- **Choreography & Transforms**:
  - Mascot plants feet and raises hands forward.
  - A glowing translucent hexagonal energy shield materializes in front of mascot.
  - Duration: `1.1s`.
- **Facial Expression**: Determined heroic smile.
- **Procedural Audio**: Resonant forcefield activation hum (`180Hz` sine + `360Hz` harmonic, gain `0.032`).
- **Particle / FX**: Emerald hexagonal grid shield with pulsing specular rim.
- **Recovery**: Shield disarms and mascot nods approvingly.

---

## Section 2: True Walking Kinematics Engine

### Stride Mechanics & Physics Implementation
When the mascot is in `walk_follow` mode following the cursor:
1. **Deadzone & Vector Filtering**:
   - Cursor movement < 16px is ignored to prevent micro-jitter.
   - Target distance > 16px calculates normalized direction vector `(dx, dy)`.
2. **Alternating Stride Cycle (`420ms`)**:
   - `0% - 25% (Left Step)`: Left foot plants, body leans right `rotate(4.5deg)`, vertical rise `translateY(-5px)`.
   - `25% - 50% (Left Contact)`: Body drops with soft squash `scale(1.04, 0.96) translateY(0)`.
   - `50% - 75% (Right Step)`: Right foot plants, body leans left `rotate(-4.5deg)`, vertical rise `translateY(-5px)`.
   - `75% - 100% (Right Contact)`: Body drops with soft squash `scale(1.04, 0.96) translateY(0)`.
3. **Directional Facing**:
   - Moving right (`dx > 0`): `scaleX(1)`.
   - Moving left (`dx < 0`): `scaleX(-1)`.
   - Turn transition: `120ms` ease-out rotation avoiding jarring snap.

---

## Section 3: Natural Smile & Dynamic Facial Expression Overlay

### Responsive SVG Facial Architecture
The facial layer is an SVG positioned over the authentic master PNG:
- **Location**: `top: 48%; left: 50%; transform: translate(-50%, -50%); width: 44px; height: 36px;`
- **Eyes**: Two pixel-style dark navy rounded rectangles (`#0B1020`, `rx: 1.5px`) spaced `14px` apart.
- **Mouth Paths**:
  - **`smile`**: `<path d="M 16 23 Q 22 28 28 23" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />`
  - **`laugh`**: `<path d="M 15 22 Q 22 30 29 22 Z" fill="#0B1020" stroke="#0B1020" stroke-width="1.5" /><path d="M 18 25 Q 22 28 26 25" fill="#FF5E7E" />` (cute pink tongue)
  - **`curious`**: `<path d="M 17 25 Q 23 27 28 22" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />`
  - **`surprised`**: `<circle cx="22" cy="24" r="3.2" fill="none" stroke="#0B1020" stroke-width="2.2" />`
  - **`sleepy`**: `<path d="M 17 24 L 27 24" fill="none" stroke="#0B1020" stroke-width="2" stroke-linecap="round" />`
  - **`wink`**: Left eye rendered as arc `<path d="M 12 16 Q 15 13 18 16" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />` with cheeky grin.

Transitions between expressions use CSS opacity cross-fades and path interpolations for lifelike responsiveness.

---

## Section 4: Screen-Boundary Clamped Popover Menu

### Mathematical Viewport Clamping Algorithm
To permanently fix the menu slicing bug seen in `media_1795413278776_0e12d7e0.png`:
```javascript
function updateMenuPosition() {
  const actorRect = mascotActor.getBoundingClientRect();
  const menuWidth = 200;
  const menuHeight = mascotMenu.offsetHeight || 290;
  const margin = 14; // Safe screen bezel padding

  // 1. Calculate ideal centered screen X coordinate
  let idealScreenX = actorRect.left + (actorRect.width / 2) - (menuWidth / 2);

  // 2. Clamp strictly inside viewport boundaries [margin, screenWidth - menuWidth - margin]
  const clampedScreenX = Math.max(margin, Math.min(window.innerWidth - menuWidth - margin, idealScreenX));

  // 3. Convert absolute screen X to relative offset for mascotActor container
  const relativeLeft = clampedScreenX - actorRect.left;
  mascotMenu.style.left = relativeLeft + 'px';
  mascotMenu.style.transform = 'none'; // Eliminate unsafe translateX(-50%)

  // 4. Vertical clamping: flip to drop-down if near top of screen
  if (actorRect.top < menuHeight + 24) {
    mascotMenu.classList.add('drop-down');
    mascotMenu.style.bottom = 'auto';
    mascotMenu.style.top = '106px';
  } else {
    mascotMenu.classList.remove('drop-down');
    mascotMenu.style.bottom = '118px';
    mascotMenu.style.top = 'auto';
  }
}
```

---

## Section 5: White Line Permanent Fix Specification

### Root Cause
`titleBarStyle: 'hidden'` instructs Windows 11 DWM to inject an inactive window caption border line along the top of transparent Electron windows.

### Solution
1. In `desktop-app/main.cjs`:
   - Delete `titleBarStyle: 'hidden'` from `overlayWindow`.
   - Maintain:
     - `frame: false`
     - `transparent: true`
     - `backgroundColor: '#00000000'`
     - `thickFrame: false`
     - `hasShadow: false`
     - `roundedCorners: false`
     - `title: ''`
     - `focusable: false`
     - `show: false` with `showInactive()` on `ready-to-show`.
2. In `desktop-app/overlay.html`:
   - Enforce `html, body { border: 0 !important; outline: 0 !important; margin: 0; padding: 0; background: transparent !important; }`.
   - Ensure `.ag-notch-wrapper` has `top: 10px; border-top: none !important;`.

---

## Section 6: Apple Liquid Glass Dynamic Island Polish

### Refraction & Glass Styling
- Refraction background: `linear-gradient(180deg, rgba(16, 20, 32, 0.88) 0%, rgba(8, 10, 18, 0.94) 100%)`.
- Specular highlights: `inset 0 1px 0 rgba(255, 255, 255, 0.35), inset 0 2px 8px rgba(255, 255, 255, 0.08)`.
- Refraction border: `1px solid rgba(255, 255, 255, 0.18)`.
- Caustic shadow: `0 14px 34px -4px rgba(0, 0, 0, 0.82), 0 0 20px rgba(52, 245, 164, 0.1)`.
- Smooth spring transitions: `cubic-bezier(0.22, 1, 0.36, 1)`.

---

## Section 7: Task-by-Task Implementation Roadmap

### Task 1: Fix Viewport Menu Boundary Clamping & Eliminate White Line
- [ ] In `desktop-app/main.cjs`:
  - Remove `titleBarStyle: 'hidden'` from `createOverlayWindow()`.
  - Verify `frame: false`, `transparent: true`, `backgroundColor: '#00000000'`, `thickFrame: false`, `hasShadow: false`, `roundedCorners: false`.
- [ ] In `desktop-app/overlay.html`:
  - Implement `updateMenuPosition()` boundary clamping algorithm.
  - Wire clamping into menu opening, window resize, and movement updates.
  - Ensure zero borders/outlines on `html, body`.
- [ ] Verify menu no longer clips on any screen corner.

### Task 2: Build Natural Smile & Dynamic Facial Expression Layer
- [ ] In `desktop-app/overlay.html`:
  - Build responsive SVG face overlay component anchored over authentic master PNG mascot.
  - Implement 6 expressive SVG facial states (`smile`, `laugh`, `curious`, `surprised`, `sleepy`, `wink`).
  - Wire facial state controller to switch mouth and eye states dynamically.

### Task 3: Implement True Walking Kinematics & 32 Movement States
- [ ] In `src/shared/mascot-movements.ts`:
  - Code movement definitions, state mapping, and transition table.
- [ ] In `desktop-app/overlay.html`:
  - Implement walking waddle kinematics (leg strides, alternating sway, vertical bobbing, directional flip).
  - Implement CSS `@keyframes` and transform states for all 32 movements (M01 – M32).
  - Connect movement transitions to daemon event stream.

### Task 4: Procedural 8-Bit Web Audio Synthesizer Suite
- [ ] In `desktop-app/overlay.html`:
  - Implement procedural Web Audio synth functions:
    - Typing chirps (throttled to 120ms).
    - Launch arpeggios (C4 → E5).
    - Victory celebration fanfare (C5 → C6).
    - Error buzzers, surprise squeaks, and purr frequencies.
  - Wire master mute control.

### Task 5: Apple Liquid Glass Dynamic Island Overhaul
- [ ] In `desktop-app/overlay.html`:
  - Apply multi-layer specular glass gradients and 28px blur.
  - Integrate dynamic halo color matching agent state.
  - Polish collapsed (196×34px) and expanded (384×138px) island layouts.

### Task 6: Task-Completion "Return to Antigravity" Callout
- [ ] In `desktop-app/overlay.html`:
  - Build liquid glass speech bubble anchored to mascot.
  - Trigger `agent_done_celebration` (M11) + `agent_done_callout` (M12) on `PostInvocation`.
  - Connect 1-click focus button calling `window.electronAPI.focusIde()`.

### Task 7: Full Verification, Packaging & GitHub Release
- [ ] Run test suite (`npm test`) ensuring 86+ tests pass with 100% green status.
- [ ] Rebuild standalone Windows installer (`Antigravity Presence Setup 2.3.0.exe`) and portable exe (`Antigravity Presence 2.3.0.exe`).
- [ ] Test locally to confirm zero white line, zero menu clipping, natural smile, and working movements.
- [ ] Commit all code changes, push to `main`, and publish release assets to GitHub Release `v2.3.0`.
