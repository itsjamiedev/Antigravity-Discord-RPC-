/**
 * Antigravity Presence — Shared Types & Strict Field Contracts
 *
 * Defines the exact 10-field whitelist allowed to leave the hook-forwarder,
 * plus the Central Tracker domain models (Agent, Conversation, ModelStats,
 * Session, DailyUsage).
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
  startedAt: string;
  lastEventAt: string;
  turnCount: number;
  toolCallCount: number;
  errorCount: number;
  parentConversationId: string | null;
  isSubagent: boolean;
  tokens: TokenUsageRecord;
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
