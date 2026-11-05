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
    str = str.replace(/\s*\((?:High|Medium|Low|Thinking|Default|Trial|Preview|Exp|Tiered)\)/gi, '').trim();
    if (/claude\s+sonnet\s+3\.5/i.test(str)) {
      str = str.replace(/claude\s+sonnet\s+3\.5/gi, 'Claude Sonnet 5.5');
    }
    return str;
  }

  // Strip trailing tier / variant / trial / preview suffixes from slugs
  str = str.replace(/-(?:high|medium|low|trial|preview|exp|thinking|tiered|custom|default|n|a|b)$/i, '');

  // Convert version hyphens between numbers like '5-5' or '4-6' or '3-8' to '5.5' or '4.6' or '3.8'
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

export function formatTokenVolumeShort(tokens: number): string {
  if (tokens <= 0 || !Number.isFinite(tokens)) return '0 tokens';
  if (tokens >= 1_000_000_000) {
    return (tokens / 1_000_000_000).toFixed(2).replace(/\.00$/, '') + 'B tokens';
  }
  if (tokens >= 1_000_000) {
    return (tokens / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M tokens';
  }
  if (tokens >= 1_000) {
    return (tokens / 1_000).toFixed(1).replace(/\.0$/, '') + 'K tokens';
  }
  return `${tokens} tokens`;
}

export function buildDiscordActivity(
  snapshot: TrackerSnapshot,
  manualState: ManualEditorState | null,
  settings: PrivacySettings,
  nowMs: number = Date.now(),
  workspaceInfo?: { count: number; names?: string[] }
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

  const wsCount = workspaceInfo?.count && workspaceInfo.count > 0 ? workspaceInfo.count : 1;
  const wsSuffix = wsCount > 1 ? ` • ${wsCount} Workspaces` : '';
  const wsText = wsCount === 1 ? '1 Workspace' : `${wsCount} Workspaces`;

  const totalTokens = snapshot.session.tokens.totalTokens;
  const tokenStr = formatTokenVolumeShort(totalTokens);
  const isTokenmaxxing = totalTokens > 0;
  const tokenmaxxingHover = isTokenmaxxing
    ? `Tokenmaxxing & AI Maxxing • ${tokenStr} spent in Antigravity (${wsText})`
    : `Antigravity • ${wsText}`;

  // MODE 1: AI Agent Mode (Active whenever agents are running)
  if (snapshot.activeAgents.length > 0) {
    const activeCount = snapshot.activeAgents.length;
    const agentLabel = activeCount === 1 ? '1 AI agent active' : `${activeCount} AI agents active`;
    const details = `${agentLabel}${wsSuffix}`;

    const parts: string[] = [];
    if (!settings.hideModels) {
      const activeModels = [
        ...new Set(snapshot.activeAgents.map((a) => formatModelDisplayName(a.model))),
      ];
      if (activeModels.length > 0) {
        parts.push(activeModels.join(', '));
      }
    }

    if (!settings.hideTokens && isTokenmaxxing) {
      parts.push(`⚡ ${tokenStr}`);
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
        large_text: tokenmaxxingHover,
        small_image: 'robot',
        small_text: `AI Agent Working • ${wsText}`,
      },
      instance: false,
    };
  }

  // MODE 2: Manual Coding Mode (When AI agents are idle or stopped)
  if (settings.enableManualEditsPresence && manualState) {
    const updatedMs = Date.parse(manualState.updatedAt);
    const isRecent = !Number.isNaN(updatedMs) && nowMs - updatedMs < 120_000;

    if (isRecent) {
      const baseDetails = settings.hideFileNamesInManualEdits
        ? `Coding in ${manualState.language}`
        : `Editing ${manualState.fileName}`;
      const details = `${baseDetails}${wsSuffix}`;

      const stateParts = [`${manualState.language} — Line ${manualState.currentLine} of ${manualState.totalLines}`];
      if (!settings.hideTokens && isTokenmaxxing) {
        stateParts.push(`⚡ ${tokenStr}`);
      }

      return {
        name: 'Antigravity',
        details,
        state: stateParts.join(' • '),
        timestamps: {
          start: sessionStartSec,
        },
        assets: {
          large_image: 'antigravity_logo',
          large_text: tokenmaxxingHover,
          small_image: 'pencil',
          small_text: `Manual Editing • ${wsText}`,
        },
        instance: false,
      };
    }
  }

  // MODE 3: Idle in Antigravity (Preserves elapsed session timer!)
  const idleState = isTokenmaxxing && !settings.hideTokens
    ? `⚡ Tokenmaxxing (${tokenStr})`
    : 'In Antigravity';

  return {
    name: 'Antigravity',
    details: wsCount > 1 ? `Idle • ${wsCount} Workspaces` : 'Idle',
    state: idleState,
    timestamps: {
      start: sessionStartSec,
    },
    assets: {
      large_image: 'antigravity_logo',
      large_text: tokenmaxxingHover,
      small_image: 'antigravity_logo',
      small_text: `Antigravity • ${wsText}`,
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
  private workspaceCount: number = 1;
  private workspaceNames: string[] = [];

  constructor(client: DiscordIpcClient, configManager: ConfigManager) {
    this.client = client;
    this.configManager = configManager;
  }

  public setWorkspaceInfo(count: number, names: string[] = []): void {
    this.workspaceCount = Math.max(1, count);
    this.workspaceNames = names;
  }

  public getWorkspaceInfo(): { count: number; names: string[] } {
    return { count: this.workspaceCount, names: this.workspaceNames };
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
    const activity = buildDiscordActivity(
      snapshot,
      this.manualState,
      settings,
      nowMs,
      this.getWorkspaceInfo()
    );

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

