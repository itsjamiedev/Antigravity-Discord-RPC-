/**
 * Antigravity Presence — SQLite Persistence Layer (WAL Mode)
 *
 * Persists processed events (idempotency keys), transcript step watermarks,
 * conversations/agents, model statistics, and daily usage so daemon restarts
 * never lose history and never double-count events or tokens.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function getDefaultDatabasePath(): string {
  const envDb = process.env['AGY_PRESENCE_DB_PATH'];
  if (envDb && envDb.trim().length > 0) {
    return envDb.trim();
  }
  return path.join(os.homedir(), '.gemini', 'antigravity-presence', 'presence.sqlite');
}

export function openTrackerDatabase(dbPath: string = getDefaultDatabasePath()): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath, { timeout: 5000 });
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS processed_events (
      idempotency_key TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      event TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transcript_watermarks (
      conversation_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      cache_read_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      created_at TEXT,
      PRIMARY KEY (conversation_id, step_index)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      conversation_id TEXT PRIMARY KEY,
      title TEXT,
      current_model TEXT NOT NULL,
      models_used_json TEXT NOT NULL,
      status TEXT NOT NULL,
      status_estimated INTEGER NOT NULL DEFAULT 0,
      active_tool TEXT,
      started_at TEXT NOT NULL,
      last_event_at TEXT NOT NULL,
      last_event_type TEXT NOT NULL,
      turn_count INTEGER NOT NULL DEFAULT 0,
      tool_call_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      has_error INTEGER NOT NULL DEFAULT 0,
      parent_conversation_id TEXT,
      is_subagent INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      token_source TEXT NOT NULL DEFAULT 'unavailable'
    );

    CREATE TABLE IF NOT EXISTS model_stats (
      model TEXT PRIMARY KEY,
      conversations_json TEXT NOT NULL,
      invocation_count INTEGER NOT NULL DEFAULT 0,
      tool_call_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      last_used_at TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      token_source TEXT NOT NULL DEFAULT 'unavailable'
    );

    CREATE TABLE IF NOT EXISTS daily_usage (
      date TEXT PRIMARY KEY,
      conversations_json TEXT NOT NULL,
      models_json TEXT NOT NULL,
      invocation_count INTEGER NOT NULL DEFAULT 0,
      tool_call_count INTEGER NOT NULL DEFAULT 0,
      error_count INTEGER NOT NULL DEFAULT 0,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      cache_read_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      token_source TEXT NOT NULL DEFAULT 'unavailable'
    );
  `);

  return db;
}

