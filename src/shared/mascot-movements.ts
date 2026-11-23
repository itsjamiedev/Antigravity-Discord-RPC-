/**
 * Antigravity Mascot 32-Movement Kinematics & Apple UI Sound Suite
 *
 * Defines the complete choreography, facial expression states,
 * and procedural Web Audio synthesizers for the Antigravity desktop companion.
 */

export type MascotFacialState =
  | 'smile'
  | 'laugh'
  | 'curious'
  | 'surprised'
  | 'sleepy'
  | 'wink';

export type MascotMovementId =
  // Category A: Prompt & User Input Interactions (6)
  | 'prompt_typing_approach'
  | 'prompt_typing_chirp'
  | 'prompt_submit_launch'
  | 'prompt_pause_curious'
  | 'cursor_poke_surprise'
  | 'cursor_pet_purr'
  // Category B: Agent Lifecycle & Execution (8)
  | 'agent_thinking_levitate'
  | 'agent_tool_executing'
  | 'agent_file_write_laser'
  | 'agent_error_shudder'
  | 'agent_done_celebration'
  | 'agent_done_callout'
  | 'agent_subagent_spawn'
  | 'agent_streaming_sync'
  // Category C: Desktop Life & Ambient Idle (8)
  | 'idle_breathe'
  | 'corner_perch_lookaround'
  | 'stretch_and_yawn'
  | 'bubble_float'
  | 'screen_edge_peek'
  | 'sleep_snore'
  | 'wake_up_shake'
  | 'inspect_cursor'
  // Category D: Dynamic Notch Interactions (4)
  | 'notch_dive_in'
  | 'notch_peek_down'
  | 'notch_swing'
  | 'notch_eject'
  // Category E: Telemetry, Alerts & Special Shortcuts (6)
  | 'alert_ping_hop'
  | 'milestone_parade'
  | 'coffee_break_toast'
  | 'goodbye_wave'
  | 'speedrun_dash'
  | 'shield_defend';

export type AppleSoundId =
  | 'island_expand_pop'     // S01
  | 'island_collapse_tuck'   // S02
  | 'marimba_typing_tap'     // S03
  | 'air_drop_chime'         // S04
  | 'apple_pay_triumph'      // S05
  | 'haptic_switch_click'    // S06
  | 'organic_purr_rumble'    // S07
  | 'warm_alert_ping'        // S08
  | 'magnetic_dock_snap'     // S09
  | 'bubble_undock_pop';     // S10

export interface MascotMovementMetadata {
  id: MascotMovementId;
  name: string;
  category: 'prompt' | 'agent' | 'idle' | 'notch' | 'alert';
  facialState: MascotFacialState;
  pairedSound?: AppleSoundId;
  cssClass: string;
  durationMs: number;
  loop: boolean;
}

export const MASCOT_MOVEMENTS: Record<MascotMovementId, MascotMovementMetadata> = {
  // Category A: Prompt & User Input Interactions
  prompt_typing_approach: {
    id: 'prompt_typing_approach',
    name: 'Prompt Typing Approach',
    category: 'prompt',
    facialState: 'smile',
    cssClass: 'ag-m-prompt-approach',
    durationMs: 400,
    loop: false,
  },
  prompt_typing_chirp: {
    id: 'prompt_typing_chirp',
    name: 'Prompt Typing Chirp',
    category: 'prompt',
    facialState: 'smile',
    pairedSound: 'marimba_typing_tap',
    cssClass: 'ag-m-prompt-chirp',
    durationMs: 140,
    loop: false,
  },
  prompt_submit_launch: {
    id: 'prompt_submit_launch',
    name: 'Prompt Submit Launch',
    category: 'prompt',
    facialState: 'laugh',
    pairedSound: 'air_drop_chime',
    cssClass: 'ag-m-prompt-launch',
    durationMs: 850,
    loop: false,
  },
  prompt_pause_curious: {
    id: 'prompt_pause_curious',
    name: 'Prompt Pause Curious',
    category: 'prompt',
    facialState: 'curious',
    cssClass: 'ag-m-prompt-pause',
    durationMs: 1200,
    loop: true,
  },
  cursor_poke_surprise: {
    id: 'cursor_poke_surprise',
    name: 'Cursor Poke Surprise',
    category: 'prompt',
    facialState: 'surprised',
    pairedSound: 'bubble_undock_pop',
    cssClass: 'ag-m-poke-surprise',
    durationMs: 650,
    loop: false,
  },
  cursor_pet_purr: {
    id: 'cursor_pet_purr',
    name: 'Cursor Pet Purr',
    category: 'prompt',
    facialState: 'smile',
    pairedSound: 'organic_purr_rumble',
    cssClass: 'ag-m-pet-purr',
    durationMs: 1400,
    loop: true,
  },

  // Category B: Agent Lifecycle & Execution
  agent_thinking_levitate: {
    id: 'agent_thinking_levitate',
    name: 'Agent Thinking Levitate',
    category: 'agent',
    facialState: 'curious',
    cssClass: 'ag-m-thinking-levitate',
    durationMs: 2400,
    loop: true,
  },
  agent_tool_executing: {
    id: 'agent_tool_executing',
    name: 'Agent Tool Executing',
    category: 'agent',
    facialState: 'laugh',
    pairedSound: 'island_expand_pop',
    cssClass: 'ag-m-tool-executing',
    durationMs: 680,
    loop: false,
  },
  agent_file_write_laser: {
    id: 'agent_file_write_laser',
    name: 'Agent File Write Laser',
    category: 'agent',
    facialState: 'smile',
    cssClass: 'ag-m-file-laser',
    durationMs: 800,
    loop: true,
  },
  agent_error_shudder: {
    id: 'agent_error_shudder',
    name: 'Agent Error Shudder',
    category: 'agent',
    facialState: 'surprised',
    pairedSound: 'island_collapse_tuck',
    cssClass: 'ag-m-error-shudder',
    durationMs: 480,
    loop: false,
  },
  agent_done_celebration: {
    id: 'agent_done_celebration',
    name: 'Agent Done Celebration',
    category: 'agent',
    facialState: 'laugh',
    pairedSound: 'apple_pay_triumph',
    cssClass: 'ag-m-done-celebrate',
    durationMs: 850,
    loop: false,
  },
  agent_done_callout: {
    id: 'agent_done_callout',
    name: 'Agent Done Callout',
    category: 'agent',
    facialState: 'smile',
    cssClass: 'ag-m-done-callout',
    durationMs: 2200,
    loop: true,
  },
  agent_subagent_spawn: {
    id: 'agent_subagent_spawn',
    name: 'Agent Subagent Spawn',
    category: 'agent',
    facialState: 'wink',
    pairedSound: 'air_drop_chime',
    cssClass: 'ag-m-subagent-spawn',
    durationMs: 720,
    loop: false,
  },
  agent_streaming_sync: {
    id: 'agent_streaming_sync',
    name: 'Agent Streaming Sync',
    category: 'agent',
    facialState: 'curious',
    cssClass: 'ag-m-stream-sync',
    durationMs: 120,
    loop: false,
  },

  // Category C: Desktop Life & Ambient Idle
  idle_breathe: {
    id: 'idle_breathe',
    name: 'Idle Breathe',
    category: 'idle',
    facialState: 'smile',
    cssClass: 'ag-m-idle-breathe',
    durationMs: 3400,
    loop: true,
  },
  corner_perch_lookaround: {
    id: 'corner_perch_lookaround',
    name: 'Corner Perch Lookaround',
    category: 'idle',
    facialState: 'smile',
    cssClass: 'ag-m-perch-look',
    durationMs: 3200,
    loop: false,
  },
  stretch_and_yawn: {
    id: 'stretch_and_yawn',
    name: 'Stretch and Yawn',
    category: 'idle',
    facialState: 'sleepy',
    cssClass: 'ag-m-stretch-yawn',
    durationMs: 1800,
    loop: false,
  },
  bubble_float: {
    id: 'bubble_float',
    name: 'Bubble Float',
    category: 'idle',
    facialState: 'laugh',
    pairedSound: 'bubble_undock_pop',
    cssClass: 'ag-m-bubble-float',
    durationMs: 3600,
    loop: false,
  },
  screen_edge_peek: {
    id: 'screen_edge_peek',
    name: 'Screen Edge Peek',
    category: 'idle',
    facialState: 'smile',
    cssClass: 'ag-m-edge-peek',
    durationMs: 2000,
    loop: true,
  },
  sleep_snore: {
    id: 'sleep_snore',
    name: 'Sleep Snore',
    category: 'idle',
    facialState: 'sleepy',
    cssClass: 'ag-m-sleep-snore',
    durationMs: 4800,
    loop: true,
  },
  wake_up_shake: {
    id: 'wake_up_shake',
    name: 'Wake Up Shake',
    category: 'idle',
    facialState: 'laugh',
    pairedSound: 'island_expand_pop',
    cssClass: 'ag-m-wake-shake',
    durationMs: 720,
    loop: false,
  },
  inspect_cursor: {
    id: 'inspect_cursor',
    name: 'Inspect Cursor',
    category: 'idle',
    facialState: 'smile',
    cssClass: 'ag-m-inspect-cursor',
    durationMs: 800,
    loop: true,
  },

  // Category D: Dynamic Notch Interactions
  notch_dive_in: {
    id: 'notch_dive_in',
    name: 'Notch Dive In',
    category: 'notch',
    facialState: 'laugh',
    pairedSound: 'magnetic_dock_snap',
    cssClass: 'ag-m-notch-dive',
    durationMs: 550,
    loop: false,
  },
  notch_peek_down: {
    id: 'notch_peek_down',
    name: 'Notch Peek Down',
    category: 'notch',
    facialState: 'curious',
    cssClass: 'ag-m-notch-peek',
    durationMs: 1800,
    loop: false,
  },
  notch_swing: {
    id: 'notch_swing',
    name: 'Notch Swing',
    category: 'notch',
    facialState: 'laugh',
    cssClass: 'ag-m-notch-swing',
    durationMs: 1400,
    loop: false,
  },
  notch_eject: {
    id: 'notch_eject',
    name: 'Notch Eject',
    category: 'notch',
    facialState: 'smile',
    pairedSound: 'bubble_undock_pop',
    cssClass: 'ag-m-notch-eject',
    durationMs: 600,
    loop: false,
  },

  // Category E: Telemetry, Alerts & Special Shortcuts
  alert_ping_hop: {
    id: 'alert_ping_hop',
    name: 'Alert Ping Hop',
    category: 'alert',
    facialState: 'surprised',
    pairedSound: 'warm_alert_ping',
    cssClass: 'ag-m-alert-hop',
    durationMs: 620,
    loop: false,
  },
  milestone_parade: {
    id: 'milestone_parade',
    name: 'Milestone Parade',
    category: 'alert',
    facialState: 'laugh',
    pairedSound: 'apple_pay_triumph',
    cssClass: 'ag-m-milestone-parade',
    durationMs: 2400,
    loop: false,
  },
  coffee_break_toast: {
    id: 'coffee_break_toast',
    name: 'Coffee Break Toast',
    category: 'alert',
    facialState: 'smile',
    cssClass: 'ag-m-coffee-toast',
    durationMs: 4000,
    loop: false,
  },
  goodbye_wave: {
    id: 'goodbye_wave',
    name: 'Goodbye Wave',
    category: 'alert',
    facialState: 'smile',
    pairedSound: 'island_collapse_tuck',
    cssClass: 'ag-m-goodbye-wave',
    durationMs: 1200,
    loop: false,
  },
  speedrun_dash: {
    id: 'speedrun_dash',
    name: 'Speedrun Dash',
    category: 'alert',
    facialState: 'laugh',
    cssClass: 'ag-m-speedrun-dash',
    durationMs: 800,
    loop: false,
  },
  shield_defend: {
    id: 'shield_defend',
    name: 'Shield Defend',
    category: 'alert',
    facialState: 'smile',
    pairedSound: 'magnetic_dock_snap',
    cssClass: 'ag-m-shield-defend',
    durationMs: 1100,
    loop: false,
  },
};

/**
 * Returns SVG markup for the facial expression layer.
 */
export function getMascotFaceSvg(expression: MascotFacialState = 'smile'): string {
  const mouthPaths: Record<MascotFacialState, string> = {
    smile: `<path class="ag-face-mouth" d="M 44,61 Q 50,67 56,61" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />`,
    laugh: `<path class="ag-face-mouth" d="M 43,60 Q 50,70 57,60 Z" fill="#0B1020" stroke="#0B1020" stroke-width="1.5" /><path d="M 46,65 Q 50,68 54,65" fill="#FF5E7E" />`,
    curious: `<path class="ag-face-mouth" d="M 45,63 Q 51,66 57,60" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />`,
    surprised: `<ellipse class="ag-face-mouth" cx="50" cy="63" rx="3.5" ry="4.5" fill="#0B1020" stroke="none" />`,
    sleepy: `<path class="ag-face-mouth" d="M 45,62 L 55,62" fill="none" stroke="#0B1020" stroke-width="2" stroke-linecap="round" />`,
    wink: `<path class="ag-face-mouth" d="M 44,62 Q 50,67 56,60" fill="none" stroke="#0B1020" stroke-width="2.2" stroke-linecap="round" />
           <path class="ag-face-eye-wink" d="M 40,49 Q 43,45 46,49" stroke="#0B1020" stroke-width="2.5" fill="none" stroke-linecap="round" />`,
  };

  return `<svg class="ag-mascot-face" viewBox="0 0 100 100" data-expression="${expression}">
    <g class="ag-face-group">
      ${mouthPaths[expression] || mouthPaths.smile}
    </g>
  </svg>`;
}
