/**
 * Antigravity Presence — Shared Types & Strict Field Contracts
 *
 * Defines the exact 10-field whitelist allowed to leave the hook-forwarder,
 * the Central Tracker domain models, and the Dual-Mode Presence structures.
 */

export const HOOK_EVENTS = [
  'SessionStart',
  'PreToolUse',
  'PostToolUse',
  'PreInvocation',
  'PostInvocation',
  'Stop',
] as const;

export type HookEventType = (typeof HOOK_EVENTS)[number];

export const WHITELISTED_KEYS = [
  'event',
  'conversationId',
  'modelName',
  'toolName',
  'stepIdx',
  'invocationNum',
  'terminationReason',
  'fullyIdle',
  'hasError',
  'timestamp',
] as const;

export type WhitelistedKey = (typeof WHITELISTED_KEYS)[number];

/**
 * The ONLY payload shape permitted to exit the hook-forwarder.
 * All paths (workspacePaths, transcriptPath, artifactDirectoryPath),
 * prompts (lastUserInput), tool arguments (toolCall.args), and raw error strings
 * are unconditionally stripped before constructing this object.
 */
export interface WhitelistedHookPayload {
  event: HookEventType;
  conversationId: string;
  modelName: string;
  toolName: string | null;
  stepIdx: number | null;
  invocationNum: number | null;
  terminationReason: string | null;
  fullyIdle: boolean | null;
  hasError: boolean;
  timestamp: string;
}

export const DEFAULT_DAEMON_HOST = '127.0.0.1';
export const DEFAULT_DAEMON_PORT = 41177;
export const DEFAULT_DISCORD_CLIENT_ID = '1440730997460172810';

/**
 * Agent activity states.
 * - 'thinking', 'running_tool', 'waiting_background', 'idle', 'error' are exact from hook events.
 * - 'waiting_approval' is estimated via duration threshold in PreToolUse (statusEstimated = true).
 * - 'stale' is derived when no event arrives within staleTimeoutMs while active.
 */
export type AgentStatus =
  | 'thinking'
  | 'running_tool'
  | 'waiting_approval'
  | 'waiting_background'
  | 'idle'
  | 'error'
  | 'stale';

export type TokenDataSource = 'transcript_exact' | 'unavailable';

export interface TokenUsageRecord {
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimated: boolean;
  source: TokenDataSource;
}

export interface Agent {
  conversationId: string;
  model: string;
  status: AgentStatus;
  statusEstimated: boolean;
  activeTool: string | null;
  startedAt: string;
  lastEventAt: string;
  lastEventType: HookEventType;
  parentConversationId: string | null;
  isSubagent: boolean;
  hasError: boolean;
}

export interface Conversation {
  conversationId: string;
  title: string | null;
  currentModel: string;
  modelsUsed: string[];
  status: AgentStatus;
  statusEstimated: boolean;
  activeTool?: string | null;
  startedAt: string;
  lastEventAt: string;
  turnCount: number;
  toolCallCount: number;
  errorCount: number;
  parentConversationId: string | null;
  isSubagent: boolean;
  tokens: TokenUsageRecord;
}

export interface ConversationDetail {
  conversationId: string;
  title: string | null;
  currentModel: string;
  modelsUsed: string[];
  status: AgentStatus;
  statusEstimated: boolean;
  activeTool: string | null;
  startedAt: string;
  lastEventAt: string;
  turnCount: number;
  toolCallCount: number;
  errorCount: number;
  isSubagent: boolean;
  parentConversationId: string | null;
  tokens: TokenUsageRecord;
  cacheHitRatio: number;
  recentEvents: Array<{
    type: string;
    toolName?: string | null;
    timestamp: string;
  }>;
}

export interface PersistentTokenStoreData {
  version: number;
  lastSavedAt: string;
  cumulativeTokensByModel: Record<string, TokenUsageRecord>;
  cumulativeDailyUsage: Record<string, DailyUsage>;
  conversationWatermarks: Record<
    string,
    {
      maxStepIndex: number;
      model: string;
      tokens: TokenUsageRecord;
      lastUpdated: string;
    }
  >;
}

export interface ModelStats {
  model: string;
  conversationCount: number;
  invocationCount: number;
  toolCallCount: number;
  errorCount: number;
  lastUsedAt: string;
  tokens: TokenUsageRecord;
}

export interface Session {
  sessionId: string;
  startedAt: string;
  lastActivityAt: string;
  activeAgentCount: number;
  totalConversations: number;
  totalEventsProcessed: number;
  tokens: TokenUsageRecord;
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  conversationCount: number;
  invocationCount: number;
  toolCallCount: number;
  errorCount: number;
  modelsUsed: string[];
  tokens: TokenUsageRecord;
}

export interface TrackerSnapshot {
  session: Session;
  agents: Agent[];
  activeAgents: Agent[];
  conversations: Conversation[];
  modelStats: ModelStats[];
  dailyUsage: DailyUsage[];
}

/**
 * Manual Editor State sent by the IDE when the user is editing files manually.
 * Only file basename is sent (no directory paths).
 */
export interface ManualEditorState {
  fileName: string;
  language: string;
  currentLine: number;
  totalLines: number;
  workspaceName: string | null;
  updatedAt: string;
}

export interface PrivacySettings {
  disableRichPresence: boolean;
  pauseTracking: boolean;
  hideTokens: boolean;
  hideConversations: boolean;
  hideModels: boolean;
  enableManualEditsPresence: boolean;
  hideFileNamesInManualEdits: boolean;
  discordClientId: string;
  debounceMs: number;
}

export interface DiscordActivityTimestamps {
  start?: number;
  end?: number;
}

export interface DiscordActivityAssets {
  large_image?: string;
  large_text?: string;
  small_image?: string;
  small_text?: string;
}

export interface DiscordActivity {
  name?: string;
  details: string;
  state?: string;
  timestamps?: DiscordActivityTimestamps;
  assets?: DiscordActivityAssets;
  instance?: boolean;
}
