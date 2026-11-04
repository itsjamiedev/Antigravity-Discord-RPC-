/**
 * Antigravity Presence — Edge Privacy Whitelist Filter
 *
 * Strips all sensitive fields (lastUserInput, workspacePaths, transcriptPath,
 * artifactDirectoryPath, toolCall.args, raw error messages, and unknown keys)
 * BEFORE the payload leaves the forwarder process.
 */

import {
  HOOK_EVENTS,
  WHITELISTED_KEYS,
  type HookEventType,
  type WhitelistedHookPayload,
} from '../shared/types.js';

const VALID_EVENTS_SET = new Set<string>(HOOK_EVENTS);
const ALLOWED_KEYS_SET = new Set<string>(WHITELISTED_KEYS);

export function isValidHookEvent(event: unknown): event is HookEventType {
  return typeof event === 'string' && VALID_EVENTS_SET.has(event);
}

/**
 * Returns the exact JSON stdout response required by Antigravity so agent
 * execution is never altered or blocked.
 */
export function getSafeHookOutput(event: string): string {
  switch (event) {
    case 'PreToolUse':
      return '{"decision":"allow"}';
    case 'Stop':
      return '{"decision":"stop"}';
    case 'SessionStart':
    case 'PostToolUse':
    case 'PreInvocation':
    case 'PostInvocation':
    default:
      return '{}';
  }
}

function sanitizeIdentifier(value: unknown, maxLen = 128): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLen) {
    return null;
  }
  // Reject values that look like filesystem paths
  if (trimmed.includes('\\') || trimmed.includes('/') || /^[a-zA-Z]:/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function sanitizeFiniteInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  return null;
}

/**
 * Parses and strictly whitelists a raw hook stdin payload.
 * Returns null if the event type is unrecognized or conversationId is missing/invalid.
 */
export function sanitizeHookPayload(
  eventArg: unknown,
  rawInput: unknown,
  timestampOverride?: string
): WhitelistedHookPayload | null {
  if (!isValidHookEvent(eventArg)) {
    return null;
  }

  let parsed: Record<string, unknown> | null = null;
  if (typeof rawInput === 'string') {
    if (rawInput.trim().length === 0) {
      return null;
    }
    try {
      const candidate: unknown = JSON.parse(rawInput);
      if (candidate !== null && typeof candidate === 'object' && !Array.isArray(candidate)) {
        parsed = candidate as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  } else if (rawInput !== null && typeof rawInput === 'object' && !Array.isArray(rawInput)) {
    parsed = rawInput as Record<string, unknown>;
  }

  if (!parsed) {
    return null;
  }

  const conversationId = sanitizeIdentifier(parsed['conversationId'], 128);
  if (!conversationId) {
    return null;
  }

  const modelName = sanitizeIdentifier(parsed['modelName'], 128) ?? 'unknown';

  // Extract ONLY toolCall.name; NEVER read or copy toolCall.args
  let toolName: string | null = null;
  const rawToolCall = parsed['toolCall'];
  if (rawToolCall !== null && typeof rawToolCall === 'object' && !Array.isArray(rawToolCall)) {
    const rawName = (rawToolCall as Record<string, unknown>)['name'];
    toolName = sanitizeIdentifier(rawName, 128);
  }

  const stepIdx = sanitizeFiniteInt(parsed['stepIdx']);
  const invocationNum = sanitizeFiniteInt(parsed['invocationNum']);
  const terminationReason = sanitizeIdentifier(parsed['terminationReason'], 128);
  const fullyIdle = typeof parsed['fullyIdle'] === 'boolean' ? parsed['fullyIdle'] : null;

  // Convert error to strictly boolean (hasError) so raw error strings containing paths/output never leak
  const rawError = parsed['error'];
  const hasError =
    typeof rawError === 'string'
      ? rawError.trim().length > 0
      : Boolean(rawError);

  const timestamp =
    typeof timestampOverride === 'string' && timestampOverride.length > 0
      ? timestampOverride
      : new Date().toISOString();

  const sanitized: WhitelistedHookPayload = {
    event: eventArg,
    conversationId,
    modelName,
    toolName,
    stepIdx,
    invocationNum,
    terminationReason,
    fullyIdle,
    hasError,
    timestamp,
  };

  return Object.freeze(sanitized);
}

/**
 * Runtime guard verifying an object contains ONLY the 10 whitelisted keys
 * and zero forbidden or unknown properties.
 */
export function assertStrictlyWhitelisted(obj: unknown): obj is WhitelistedHookPayload {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  const keys = Object.keys(obj);
  if (keys.length !== WHITELISTED_KEYS.length) {
    return false;
  }
  for (const key of keys) {
    if (!ALLOWED_KEYS_SET.has(key)) {
      return false;
    }
  }
  return true;
}
