/**
 * Antigravity Presence — Local Transcript & Summary Metadata Reader
 *
 * Resolves exact token usage (input_tokens, cache_read_tokens, output_tokens)
 * from local `transcript.jsonl` files and conversation hierarchy/titles from
 * `conversation_summaries.db` using ONLY the whitelisted `conversationId`.
 *
 * Never reads or stores prompt content, thinking text, tool arguments, or workspace paths.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface TranscriptStepTokens {
  stepIndex: number;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  createdAt: string | null;
}

export interface TranscriptReadResult {
  foundTranscript: boolean;
  steps: TranscriptStepTokens[];
}

export interface ConversationSummaryMeta {
  title: string | null;
  parentConversationId: string | null;
  isSubagent: boolean;
}

const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export function getDefaultAppDataDirs(): string[] {
  const home = os.homedir();
  const geminiRoot = path.join(home, '.gemini');
  return [
    path.join(geminiRoot, 'antigravity'),
    path.join(geminiRoot, 'antigravity-cli'),
    path.join(geminiRoot, 'antigravity-ide'),
  ];
}

function isSafeConversationId(conversationId: string): boolean {
  return SAFE_ID_REGEX.test(conversationId);
}

/**
 * Reads exact token metrics from `<appDataDir>/brain/<conversationId>/.system_generated/logs/transcript.jsonl`
 * for any PLANNER_RESPONSE steps not yet recorded in `countedSteps`.
 */
export function readNewTranscriptSteps(
  conversationId: string,
  countedSteps: ReadonlySet<number>,
  appDataDirs: readonly string[] = getDefaultAppDataDirs()
): TranscriptReadResult {
  if (!isSafeConversationId(conversationId)) {
    return { foundTranscript: false, steps: [] };
  }

  for (const appDir of appDataDirs) {
    const logsDir = path.join(appDir, 'brain', conversationId, '.system_generated', 'logs');
    const compactPath = path.join(logsDir, 'transcript.jsonl');
    const fullPath = path.join(logsDir, 'transcript_full.jsonl');

    const targetPath = fs.existsSync(compactPath)
      ? compactPath
      : fs.existsSync(fullPath)
        ? fullPath
        : null;

    if (!targetPath) {
      continue;
    }

    try {
      const content = fs.readFileSync(targetPath, 'utf8');
      const lines = content.split('\n');
      const steps: TranscriptStepTokens[] = [];
      const seenInFile = new Set<number>();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const obj = JSON.parse(trimmed) as Record<string, unknown>;
          if (obj['type'] !== 'PLANNER_RESPONSE') {
            continue;
          }

          const stepIdx = obj['step_index'];
          if (typeof stepIdx !== 'number' || !Number.isFinite(stepIdx) || stepIdx < 0) {
            continue;
          }
          const normalizedIdx = Math.trunc(stepIdx);
          if (countedSteps.has(normalizedIdx) || seenInFile.has(normalizedIdx)) {
            continue;
          }

          const rawInput = obj['input_tokens'];
          const rawCache = obj['cache_read_tokens'];
          const rawOutput = obj['output_tokens'];

          const hasTokenFields =
            typeof rawInput === 'number' ||
            typeof rawCache === 'number' ||
            typeof rawOutput === 'number';

          if (!hasTokenFields) {
            continue;
          }

          const inputTokens =
            typeof rawInput === 'number' && Number.isFinite(rawInput) && rawInput >= 0
              ? Math.trunc(rawInput)
              : 0;
          const cacheReadTokens =
            typeof rawCache === 'number' && Number.isFinite(rawCache) && rawCache >= 0
              ? Math.trunc(rawCache)
              : 0;
          const outputTokens =
            typeof rawOutput === 'number' && Number.isFinite(rawOutput) && rawOutput >= 0
              ? Math.trunc(rawOutput)
              : 0;

          const createdAt = typeof obj['created_at'] === 'string' ? obj['created_at'] : null;

          seenInFile.add(normalizedIdx);
          steps.push({
            stepIndex: normalizedIdx,
            inputTokens,
            cacheReadTokens,
            outputTokens,
            createdAt,
          });
        } catch {
          // Ignore malformed line
        }
      }

      return {
        foundTranscript: true,
        steps,
      };
    } catch {
      // Continue checking other dirs if unreadable
    }
  }

  return { foundTranscript: false, steps: [] };
}

/**
 * Reads non-sensitive summary metadata (title, parent_conversation_id, nesting_depth)
 * from `<appDataDir>/conversation_summaries.db` if available.
 */
export function readConversationSummaryMetadata(
  conversationId: string,
  appDataDirs: readonly string[] = getDefaultAppDataDirs()
): ConversationSummaryMeta | null {
  if (!isSafeConversationId(conversationId)) {
    return null;
  }

  for (const appDir of appDataDirs) {
    const dbPath = path.join(appDir, 'conversation_summaries.db');
    if (!fs.existsSync(dbPath)) {
      continue;
    }

    let db: Database.Database | null = null;
    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true, timeout: 1000 });
      const row = db
        .prepare(
          `SELECT title, parent_conversation_id, nesting_depth
           FROM conversation_summaries
           WHERE conversation_id = ?`
        )
        .get(conversationId) as
        | {
            title?: string;
            parent_conversation_id?: string;
            nesting_depth?: number;
          }
        | undefined;

      if (row) {
        const title =
          typeof row.title === 'string' && row.title.trim().length > 0 ? row.title.trim() : null;
        const parentId =
          typeof row.parent_conversation_id === 'string' &&
          row.parent_conversation_id.trim().length > 0
            ? row.parent_conversation_id.trim()
            : null;
        const depth = typeof row.nesting_depth === 'number' ? row.nesting_depth : 0;

        return {
          title,
          parentConversationId: parentId,
          isSubagent: Boolean(parentId) || depth > 0,
        };
      }
    } catch {
      // Ignore SQLite read errors if locked or missing table
    } finally {
      try {
        db?.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  return null;
}

