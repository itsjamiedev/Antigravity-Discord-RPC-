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
  if (!model || typeof model !== 'string') return 'Gemini 3.8 Flash';
  let str = model.trim();

  // If already contains spaces, it's a human-readable display name (e.g. 'Claude Sonnet 5.5 (Medium)' or 'Gemini 3.8 Flash (High)')
  if (str.includes(' ')) {
    str = str.replace(/\s*\((?:High|Medium|Low|Thinking|Default|Trial|Preview|Exp)\)/gi, '').trim();
    if (/claude\s+sonnet\s+3\.5/i.test(str)) {
      str = str.replace(/claude\s+sonnet\s+3\.5/gi, 'Claude Sonnet 5.5');
    }
    return str;
  }

  // Strip trailing tier / variant suffixes from slugs
  str = str.replace(/-(?:high|medium|low|trial|preview|exp|thinking|n)$/i, '');

  // Convert version hyphens between numbers like '5-5' or '3-8' to '5.5' or '3.8'
  str = str.replace(/(\d+)-(\d+)/g, (_m, a, b) => a + '.' + b);

  if (/claude-sonnet-3\.5/i.test(str)) {
    str = str.replace(/claude-sonnet-3\.5/gi, 'claude-sonnet-5.5');
  }

  // Split on hyphens and title case each segment dynamically
  const parts = str.split('-').map((part) => {
    if (!part) return '';
    if (/^\d+(\.\d+)?$/.test(part)) return part;
    const lower = part.toLowerCase();
    if (lower === 'gpt') return 'GPT';
    if (lower === 'ai') return 'AI';
    if (lower === 'llm') return 'LLM';
    if (lower === 'lite') return 'Lite';
    if (lower === 'flash') return 'Flash';
    if (lower === 'pro') return 'Pro';
    if (lower === 'ultra') return 'Ultra';
    if (lower === 'argon') return 'Argon';
    if (lower === 'sonnet') return 'Sonnet';
    if (lower === 'opus') return 'Opus';
    if (lower === 'haiku') return 'Haiku';
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).filter(Boolean);

  return parts.join(' ');
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

  // Persistent Antigravity IDE session start timestamp:
  // Must be in Unix SECONDS (10 digits) for Discord RPC protocol.
  // Never resets to 0:00 across AI Mode, Manual Coding Mode, or Idle Mode
  // until Google Antigravity is completely shut down.
  let sessionStartMs = Date.parse(snapshot.session.startedAt);
  if (Number.isNaN(sessionStartMs) || sessionStartMs <= 0) {
    sessionStartMs = nowMs;
  }
  const sessionStartSec = Math.floor(sessionStartMs / 1000);

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

    return {
      name: 'Antigravity',
      details,
      state,
      timestamps: {
        start: sessionStartSec,
      },
      assets: {
        large_image: 'antigravity_logo',
        large_text: 'Antigravity',
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
        name: 'Antigravity',
        details,
        state,
        timestamps: {
          start: sessionStartSec,
        },
        assets: {
          large_image: 'antigravity_logo',
          large_text: 'Antigravity',
          small_image: 'pencil',
          small_text: 'Manual Editing',
        },
        instance: false,
      };
    }
  }

  // MODE 3: Idle in Antigravity (Preserves elapsed session timer!)
  return {
    name: 'Antigravity',
    details: 'Idle',
    state: 'In Antigravity',
    timestamps: {
      start: sessionStartSec,
    },
    assets: {
      large_image: 'antigravity_logo',
      large_text: 'Antigravity',
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
    const isStateTransition =
      activity?.details !== this.lastSentActivity?.details ||
      activity?.state !== this.lastSentActivity?.state;
    const effectiveDebounce = isStateTransition ? Math.min(1000, debounceMs) : debounceMs;

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

