/**
 * Antigravity Presence — Forwarder Local Socket Transport & Offline Spooler
 *
 * Delivers sanitized, strictly-whitelisted hook events to the local daemon
 * over 127.0.0.1 with a tight timeout (<40ms). If the daemon is offline,
 * appends the sanitized payload to a local spool file for later ingestion
 * and never throws or blocks the agent.
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_DAEMON_HOST,
  DEFAULT_DAEMON_PORT,
  type WhitelistedHookPayload,
} from '../shared/types.js';
import { assertStrictlyWhitelisted } from './whitelist.js';

export interface ForwarderTransportOptions {
  host?: string;
  port?: number;
  timeoutMs?: number;
  spoolPath?: string;
}

export function getDefaultSpoolPath(): string {
  const envSpool = process.env['AGY_PRESENCE_SPOOL_PATH'];
  if (envSpool && envSpool.trim().length > 0) {
    return envSpool.trim();
  }
  return path.join(os.homedir(), '.gemini', 'antigravity-presence', 'spool.jsonl');
}

export function getConfiguredDaemonPort(): number {
  const envPort = process.env['AGY_PRESENCE_PORT'];
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 65535) {
      return parsed;
    }
  }
  return DEFAULT_DAEMON_PORT;
}

export function appendToSpool(payload: WhitelistedHookPayload, spoolPath?: string): void {
  try {
    if (!assertStrictlyWhitelisted(payload)) {
      return;
    }
    const targetPath = spoolPath ?? getDefaultSpoolPath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(targetPath, JSON.stringify(payload) + '\n', 'utf8');
  } catch {
    // Fail-open: never throw if disk write fails
  }
}

/**
 * Sends a whitelisted payload to the daemon over 127.0.0.1.
 * Resolves to true if delivered to the live daemon, or false if spooled/dropped.
 */
export function forwardPayloadToDaemon(
  payload: WhitelistedHookPayload,
  options: ForwarderTransportOptions = {}
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      // Defense-in-depth: never transmit anything that fails strict whitelist verification
      if (!assertStrictlyWhitelisted(payload)) {
        resolve(false);
        return;
      }

      const host = options.host ?? DEFAULT_DAEMON_HOST;
      const port = options.port ?? getConfiguredDaemonPort();
      const timeoutMs = options.timeoutMs ?? 40;
      const body = JSON.stringify(payload);

      let settled = false;
      const finish = (delivered: boolean): void => {
        if (settled) return;
        settled = true;
        if (!delivered) {
          appendToSpool(payload, options.spoolPath);
        }
        resolve(delivered);
      };

      const req = http.request(
        {
          hostname: host,
          port,
          path: '/api/ingest',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body, 'utf8'),
          },
          timeout: timeoutMs,
        },
        (res) => {
          res.resume();
          const ok = typeof res.statusCode === 'number' && res.statusCode >= 200 && res.statusCode < 300;
          finish(ok);
        }
      );

      req.on('timeout', () => {
        req.destroy();
        finish(false);
      });

      req.on('error', () => {
        finish(false);
      });

      req.write(body);
      req.end();
    } catch {
      appendToSpool(payload, options.spoolPath);
      resolve(false);
    }
  });
}
