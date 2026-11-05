/**
 * Antigravity Presence — Unified Local Dashboard & Ingest HTTP Server
 *
 * Bound strictly to 127.0.0.1:41177.
 * Provides:
 *   - Web UI root (`GET /`)
 *   - Real-time Server-Sent Events stream (`GET /api/stream`)
 *   - REST endpoints (`/api/overview`, `/api/agents`, `/api/models`, `/api/conversations`, `/api/analytics`, `/api/settings`)
 *   - Hook ingestion (`POST /api/ingest`)
 *   - Editor state ingestion (`POST /api/editor`)
 */

import http from 'node:http';
import path from 'node:path';
import type { ConfigManager } from '../config/privacy-config.js';
import {
  drainSpoolFile,
  ManualEditorPayloadSchema,
  WhitelistedPayloadSchema,
} from '../daemon/ingest-server.js';
import type { DiscordIpcClient } from '../discord/ipc-client.js';
import type { PresenceManager } from '../discord/presence-manager.js';
import { getDefaultSpoolPath } from '../forwarder/transport.js';
import { assertStrictlyWhitelisted } from '../forwarder/whitelist.js';
import {
  DEFAULT_DAEMON_HOST,
  DEFAULT_DAEMON_PORT,
  type ManualEditorState,
  type PrivacySettings,
  type TrackerSnapshot,
  type WhitelistedHookPayload,
} from '../shared/types.js';
import type { CentralTracker } from '../tracker/tracker.js';
import { getDashboardHtml } from './html-content.js';

export interface DashboardServerOptions {
  host?: string;
  port?: number;
  spoolPath?: string;
  tracker: CentralTracker;
  presenceManager?: PresenceManager;
  discordClient?: DiscordIpcClient;
  configManager: ConfigManager;
}

export interface DashboardFullState extends TrackerSnapshot {
  editor: ManualEditorState | null;
  discord: {
    connected: boolean;
    state: string;
  };
  settings: PrivacySettings;
}

export class DashboardServer {
  private server: http.Server | null = null;
  private readonly host: string;
  private readonly port: number;
  private readonly spoolPath: string;
  private readonly tracker: CentralTracker;
  private readonly presenceManager?: PresenceManager;
  private readonly discordClient?: DiscordIpcClient;
  private readonly configManager: ConfigManager;
  private readonly sseClients = new Set<http.ServerResponse>();
  private unsubscribeTracker?: () => void;

  constructor(options: DashboardServerOptions) {
    this.host = options.host ?? DEFAULT_DAEMON_HOST;
    this.port = options.port ?? DEFAULT_DAEMON_PORT;
    this.spoolPath = options.spoolPath ?? getDefaultSpoolPath();
    this.tracker = options.tracker;
    this.presenceManager = options.presenceManager;
    this.discordClient = options.discordClient;
    this.configManager = options.configManager;
  }

  public getFullState(): DashboardFullState {
    const snapshot = this.tracker.getSnapshot();
    const editor = this.presenceManager?.getManualEditorState() ?? null;
    const discordState = this.discordClient?.getState() ?? 'disconnected';
    const settings = this.configManager.getSettings();

    return {
      ...snapshot,
      editor,
      discord: {
        connected: discordState === 'connected',
        state: discordState,
      },
      settings,
    };
  }

  public broadcastUpdate(): void {
    if (this.sseClients.size === 0) return;
    const fullState = this.getFullState();
    const data = `data: ${JSON.stringify(fullState)}\n\n`;

    for (const client of this.sseClients) {
      try {
        client.write(data);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  public async start(): Promise<number> {
    // 1. Drain any offline-spooled events into the tracker first
    await drainSpoolFile((payload) => {
      this.tracker.processEvent(payload);
    }, this.spoolPath);

    // 2. Subscribe to tracker updates
    this.unsubscribeTracker = this.tracker.subscribe((snapshot) => {
      this.presenceManager?.updateFromSnapshot(snapshot);
      this.broadcastUpdate();
    });

    // 3. Listen for Discord state changes to broadcast to dashboard
    this.discordClient?.onStateChange(() => {
      this.broadcastUpdate();
    });

    return new Promise<number>((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        // Enforce strict local binding check
        const clientIp = req.socket.remoteAddress;
        if (clientIp && clientIp !== '127.0.0.1' && clientIp !== '::1' && clientIp !== '::ffff:127.0.0.1') {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Access denied: Localhost only');
          return;
        }

        const method = req.method ?? 'GET';
        const url = req.url ?? '/';

        // Static Web UI
        if (method === 'GET' && (url === '/' || url === '/index.html')) {
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache',
          });
          res.end(getDashboardHtml());
          return;
        }

        // SSE Real-Time Stream
        if (method === 'GET' && url === '/api/stream') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          });
          res.flushHeaders?.();

          this.sseClients.add(res);

          // Initial push
          const initialData = `data: ${JSON.stringify(this.getFullState())}\n\n`;
          res.write(initialData);

          req.on('close', () => {
            this.sseClients.delete(res);
          });
          return;
        }

        // REST API: Overview
        if (method === 'GET' && url === '/api/overview') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getFullState()));
          return;
        }

        // REST API: Agents
        if (method === 'GET' && url === '/api/agents') {
          const snap = this.tracker.getSnapshot();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ agents: snap.agents, activeAgents: snap.activeAgents }));
          return;
        }

        // REST API: Models
        if (method === 'GET' && url === '/api/models') {
          const snap = this.tracker.getSnapshot();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ models: snap.modelStats }));
          return;
        }

        // REST API: Conversations
        if (method === 'GET' && url === '/api/conversations') {
          const snap = this.tracker.getSnapshot();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ conversations: snap.conversations }));
          return;
        }

        // REST API: Analytics
        if (method === 'GET' && url === '/api/analytics') {
          const snap = this.tracker.getSnapshot();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ dailyUsage: snap.dailyUsage }));
          return;
        }

        // REST API: Settings (GET)
        if (method === 'GET' && url === '/api/settings') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.configManager.getSettings()));
          return;
        }

        // REST API: Settings (POST update)
        if (method === 'POST' && url === '/api/settings') {
          this.readBody(req, res, 8192, (body) => {
            try {
              const parsed: unknown = JSON.parse(body);
              if (typeof parsed !== 'object' || parsed === null) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Expected JSON object' }));
                return;
              }
              const updated = this.configManager.updateSettings(
                parsed as Partial<PrivacySettings>
              );

              // Update tracker paused status if modified
              if ('pauseTracking' in parsed) {
                this.tracker.setPaused(updated.pauseTracking);
              }

              // Update presence manager
              this.presenceManager?.updateFromSnapshot(this.tracker.getSnapshot());
              this.broadcastUpdate();

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(updated));
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: String(err) }));
            }
          });
          return;
        }

        // Ingest: Hook Forwarder
        if (method === 'POST' && url === '/api/ingest') {
          this.readBody(req, res, 16384, (body) => {
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

              this.tracker.processEvent(parsed.data);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ accepted: true }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // Ingest: Manual Editor State
        if (method === 'POST' && url === '/api/editor') {
          this.readBody(req, res, 8192, (body) => {
            try {
              const raw: unknown = JSON.parse(body);
              const parsed = ManualEditorPayloadSchema.safeParse(raw);
              if (!parsed.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid editor payload' }));
                return;
              }

              const cleanFileName = path.basename(parsed.data.fileName);
              const state: ManualEditorState = {
                fileName: cleanFileName,
                language: parsed.data.language,
                currentLine: parsed.data.currentLine,
                totalLines: parsed.data.totalLines,
                workspaceName: parsed.data.workspaceName ?? null,
                updatedAt: parsed.data.updatedAt ?? new Date().toISOString(),
              };

              this.presenceManager?.setManualEditorState(state);
              this.presenceManager?.updateFromSnapshot(this.tracker.getSnapshot());
              this.broadcastUpdate();

              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ accepted: true }));
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        // Health Check
        if (method === 'GET' && url === '/api/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
          return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      srv.on('error', (err) => {
        reject(err);
      });

      srv.listen(this.port, this.host, () => {
        this.server = srv;
        const address = srv.address();
        const boundPort =
          typeof address === 'object' && address !== null ? address.port : this.port;
        resolve(boundPort);
      });
    });
  }

  private readBody(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    maxBytes: number,
    onSuccess: (body: string) => void
  ): void {
    let body = '';
    let aborted = false;

    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > maxBytes) {
        aborted = true;
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!aborted) {
        onSuccess(body);
      }
    });
  }

  public async stop(): Promise<void> {
    if (this.unsubscribeTracker) {
      this.unsubscribeTracker();
      this.unsubscribeTracker = undefined;
    }

    for (const client of this.sseClients) {
      try {
        client.end();
      } catch {
        // Ignore end errors
      }
    }
    this.sseClients.clear();

    if (!this.server) return;
    const srv = this.server;
    this.server = null;
    await new Promise<void>((resolve) => {
      srv.close(() => resolve());
    });
  }
}
