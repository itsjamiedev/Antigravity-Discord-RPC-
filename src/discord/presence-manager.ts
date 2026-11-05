/**
 * Antigravity Presence — Dual-Mode Presence Formatter & 15s Debouncer
 *
 * Implements:
 *   1. Dual-Mode formatting:
 *      - AI Mode: active agent count, model names, exact tokens.
 *      - Manual Mode: file basename, language, line count, active line number.
 *   2. Leading + Trailing 15s debouncer so presence transitions (idle -> active)
 *      are instant, while rapid tool/turn changes are coalesced without Discord rate-limiting.
 */

import type { ConfigManager } from '../config/privacy-config.js';
import type {
  DiscordActivity,
  ManualEditorState,
  PrivacySettings,
  TrackerSnapshot,
} from '../shared/types.js';
import type { DiscordIpcClient } from './ipc-client.js';

export function formatModelDisplayName(model: string): string {
  const map: Record<string, string> = {
    'gemini-4-argon-medium': 'Gemini 4 Argon',
    'gemini-4-argon-high': 'Gemini 4 Argon',
    'gemini-4-argon-low': 'Gemini 4 Argon',
    'gemini-3.8-flash-high': 'Gemini 3.8 Flash',
    'gemini-3.8-flash-medium': 'Gemini 3.8 Flash',
    'gemini-3.8-flash-low': 'Gemini 3.8 Flash',
    'gemini-3.5-flash-lite': 'Gemini 3.5 Flash Lite',
    'claude-sonnet-5-5-high': 'Claude Sonnet 3.5',
    'claude-opus-5-5-high': 'Claude Opus 3.5',
  };
  if (map[model]) return map[model];

  const lower = model.toLowerCase();
  if (lower.includes('flash-lite')) return 'Gemini 3.5 Flash Lite';
  if (lower.includes('flash')) return 'Gemini 3.8 Flash';
  if (lower.includes('argon')) return 'Gemini 4 Argon';
  if (lower.includes('sonnet')) return 'Claude Sonnet 3.5';
  if (lower.includes('opus')) return 'Claude Opus 3.5';

  return model.replace(/\s*\(.*?\)/g, '').trim();
}

export function buildDiscordActivity(
  snapshot: TrackerSnapshot,
  manualState: ManualEditorState | null,
  settings: PrivacySettings,
  nowMs: number = Date.now()
): DiscordActivity | null {
  if (settings.disableRichPresence || settings.pauseTracking) {
    return null;
  }

  // MODE 1: AI Agent Mode (Active whenever agents are running)
  if (snapshot.activeAgents.length > 0) {
    const activeCount = snapshot.activeAgents.length;
    const details = activeCount === 1 ? '1 AI agent active' : `${activeCount} AI agents active`;

    const parts: string[] = [];
    if (!settings.hideModels) {
      const activeModels = [
        ...new Set(snapshot.activeAgents.map((a) => formatModelDisplayName(a.model))),
      ];
      if (activeModels.length > 0) {
        parts.push(activeModels.join(', '));
      }
    }

    if (!settings.hideTokens && snapshot.session.tokens.source === 'transcript_exact') {
      const tokensK = (snapshot.session.tokens.totalTokens / 1000).toFixed(1);
      parts.push(`${tokensK}k tokens`);
    }

    const state = parts.length > 0 ? parts.join(' • ') : undefined;

    let sessionStartMs = Date.parse(snapshot.session.startedAt);
    if (Number.isNaN(sessionStartMs)) {
      sessionStartMs = nowMs;
    }

    return {
      details,
      state,
      timestamps: {
        start: sessionStartMs,
      },
      assets: {
        large_image: 'antigravity_logo',
        large_text: 'Google Antigravity',
        small_image: 'robot',
        small_text: 'AI Agent Working',
      },
      instance: false,
    };
  }

  // MODE 2: Manual Coding Mode (When AI agents are idle or stopped)
  if (settings.enableManualEditsPresence && manualState) {
    const updatedMs = Date.parse(manualState.updatedAt);
    const isRecent = !Number.isNaN(updatedMs) && nowMs - updatedMs < 120_000;

    if (isRecent) {
      const details = settings.hideFileNamesInManualEdits
        ? `Coding in ${manualState.language}`
        : `Editing ${manualState.fileName}`;

      const state = `${manualState.language} — Line ${manualState.currentLine} of ${manualState.totalLines}`;

      return {
        details,
        state,
        timestamps: {
          start: !Number.isNaN(updatedMs) ? updatedMs : nowMs,
        },
        assets: {
          large_image: 'antigravity_logo',
          large_text: 'Google Antigravity',
          small_image: 'pencil',
          small_text: 'Manual Editing',
        },
        instance: false,
      };
    }
  }

  // MODE 3: Idle in Antigravity
  return {
    details: 'Idle',
    state: 'In Antigravity',
    assets: {
      large_image: 'antigravity_logo',
      large_text: 'Google Antigravity',
    },
    instance: false,
  };
}

export class PresenceManager {
  private readonly client: DiscordIpcClient;
  private readonly configManager: ConfigManager;
  private lastSentActivity: DiscordActivity | null = null;
  private pendingActivity: DiscordActivity | null = null;
  private lastSentTimeMs = 0;
  private debounceTimer: NodeJS.Timeout | null = null;
  private manualState: ManualEditorState | null = null;

  constructor(client: DiscordIpcClient, configManager: ConfigManager) {
    this.client = client;
    this.configManager = configManager;
  }

  public setManualEditorState(state: ManualEditorState | null): void {
    this.manualState = state;
  }

  public getManualEditorState(): ManualEditorState | null {
    return this.manualState;
  }

  /**
   * Dispatches or schedules a presence update using a leading + trailing edge debouncer.
   */
  public updateFromSnapshot(snapshot: TrackerSnapshot, nowMs: number = Date.now()): void {
    const settings = this.configManager.getSettings();
    const activity = buildDiscordActivity(snapshot, this.manualState, settings, nowMs);

    this.dispatchActivityDebounced(activity, settings.debounceMs, nowMs);
  }

  private dispatchActivityDebounced(
    activity: DiscordActivity | null,
    debounceMs: number,
    nowMs: number
  ): void {
    const elapsedMs = nowMs - this.lastSentTimeMs;
    const isStateTransition = activity?.details !== this.lastSentActivity?.details;
    const effectiveDebounce = isStateTransition ? Math.min(2500, debounceMs) : debounceMs;

    // Leading edge: If more than effectiveDebounce has passed, dispatch immediately
    if (elapsedMs >= effectiveDebounce) {
      this.clearDebounceTimer();
      this.sendDirect(activity, nowMs);
      return;
    }

    // Coalesce within window: Save pending activity and arm trailing timer
    this.pendingActivity = activity;
    if (!this.debounceTimer) {
      const remainingMs = Math.max(50, effectiveDebounce - elapsedMs);
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        if (this.pendingActivity !== null || this.lastSentActivity !== null) {
          const toSend = this.pendingActivity;
          this.pendingActivity = null;
          this.sendDirect(toSend, Date.now());
        }
      }, remainingMs);
      this.debounceTimer.unref();
    }
  }

  private sendDirect(activity: DiscordActivity | null, nowMs: number): void {
    this.lastSentTimeMs = nowMs;
    this.lastSentActivity = activity;
    this.client.setActivity(activity);
  }

  private clearDebounceTimer(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  public destroy(): void {
    this.clearDebounceTimer();
    this.pendingActivity = null;
    this.client.clearActivity();
  }
}

