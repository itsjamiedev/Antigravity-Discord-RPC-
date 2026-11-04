/**
 * Antigravity Presence — Shared Types & Strict Field Contracts
 *
 * Defines the exact 10-field whitelist allowed to leave the hook-forwarder.
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
