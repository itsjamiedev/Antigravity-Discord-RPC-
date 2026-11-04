/**
 * Antigravity Presence — Daemon Ingest Server & Spool Drainer
 *
 * Accepts whitelisted hook payloads over 127.0.0.1 (`POST /api/ingest`) and
 * drains any offline-spooled events from `spool.jsonl`.
 * Enforces a strict Zod schema that rejects any non-whitelisted fields.
 */

import fs from 'node:fs';
import http from 'node:http';
import { z } from 'zod';
import { getDefaultSpoolPath } from '../forwarder/transport.js';
import { assertStrictlyWhitelisted } from '../forwarder/whitelist.js';
import {
  DEFAULT_DAEMON_HOST,
  DEFAULT_DAEMON_PORT,
  HOOK_EVENTS,
  type WhitelistedHookPayload,
} from '../shared/types.js';

const noPathRegex = /^[^\\/]+$/;

export const WhitelistedPayloadSchema = z
  .object({
    event: z.enum(HOOK_EVENTS),
    conversationId: z.string().min(1).max(128).regex(noPathRegex),
    modelName: z.string().min(1).max(128).regex(noPathRegex),
    toolName: z.string().min(1).max(128).regex(noPathRegex).nullable(),
    stepIdx: z.number().int().nonnegative().nullable(),
    invocationNum: z.number().int().nonnegative().nullable(),
    terminationReason: z.string().min(1).max(128).regex(noPathRegex).nullable(),
    fullyIdle: z.boolean().nullable(),
    hasError: z.boolean(),
    timestamp: z.string().min(1).max(64),
  })
  .strict();

export type IngestHandler = (payload: WhitelistedHookPayload) => void | Promise<void>;

export interface IngestServerOptions {
  host?: string;
  port?: number;
  spoolPath?: string;
  onEvent: IngestHandler;
}

/**
 * Drains offline-spooled events from `spool.jsonl` into the ingest handler
 * and truncates/removes the spool file atomically.
 */
export async function drainSpoolFile(
  onEvent: IngestHandler,
  spoolPath: string = getDefaultSpoolPath()
): Promise<number> {
  if (!fs.existsSync(spoolPath)) {
    return 0;
  }

  const processingPath = `${spoolPath}.draining.${process.pid}.${Date.now()}`;
  try {
    fs.renameSync(spoolPath, processingPath);
  } catch {
    return 0;
  }

  let count = 0;
  try {
    const content = fs.readFileSync(processingPath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const raw: unknown = JSON.parse(trimmed);
        if (!assertStrictlyWhitelisted(raw)) continue;
        const parsed = WhitelistedPayloadSchema.safeParse(raw);
        if (parsed.success) {
          await onEvent(parsed.data);
          count++;
        }
      } catch {
        // Skip malformed spool lines
      }
    }
  } finally {
    try {
      fs.unlinkSync(processingPath);
    } catch {
      // Ignore cleanup error
    }
  }

  return count;
}

export class IngestServer {
  private server: http.Server | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly spoolPath: string;
  private readonly onEvent: IngestHandler;

  constructor(options: IngestServerOptions) {
    this.host = options.host ?? DEFAULT_DAEMON_HOST;
    this.port = options.port ?? DEFAULT_DAEMON_PORT;
    this.spoolPath = options.spoolPath ?? getDefaultSpoolPath();
    this.onEvent = options.onEvent;
  }

  public async start(): Promise<number> {
    await drainSpoolFile(this.onEvent, this.spoolPath);

    return new Promise<number>((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        if (req.method === 'GET' && req.url === '/api/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        if (req.method === 'POST' && req.url === '/api/ingest') {
          let body = '';
          let aborted = false;

          req.setEncoding('utf8');
          req.on('data', (chunk: string) => {
            body += chunk;
            if (body.length > 16384) {
              aborted = true;
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Payload too large' }));
              req.destroy();
            }
          });

          req.on('end', () => {
            if (aborted) return;
            void (async () => {
              try {
                const raw: unknown = JSON.parse(body);
                if (!assertStrictlyWhitelisted(raw)) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Non-whitelisted fields rejected' }));
                  return;
                }
                const parsed = WhitelistedPayloadSchema.safeParse(raw);
                if (!parsed.success) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Schema validation failed' }));
                  return;
                }

                await this.onEvent(parsed.data);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ accepted: true }));
              } catch {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
              }
            })();
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      srv.on('error', (err) => {
        reject(err);
      });

      srv.listen(this.port, this.host, () => {
        this.server = srv;
        const address = srv.address();
        const boundPort = typeof address === 'object' && address !== null ? address.port : this.port;
        resolve(boundPort);
      });
    });
  }

  public async stop(): Promise<void> {
    if (!this.server) return;
    const srv = this.server;
    this.server = null;
    await new Promise<void>((resolve) => {
      srv.close(() => resolve());
    });
  }
}
