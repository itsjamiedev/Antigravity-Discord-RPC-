/**
 * Antigravity Presence — Central Daemon Entrypoint
 *
 * Bootstraps:
 *   1. ConfigManager (loads privacy settings with safe defaults)
 *   2. CentralTracker (SQLite WAL single source of truth)
 *   3. DiscordIpcClient (pipes 0..9 auto-reconnect)
 *   4. PresenceManager (dual-mode formatter + 15s debouncer)
 *   5. DashboardServer (127.0.0.1:41177 Web UI, SSE live stream, and REST ingest)
 *   6. Staleness & timeout watchdog loop (evaluates every 5 seconds)
 */

import { ConfigManager } from '../config/privacy-config.js';
import { DashboardServer } from '../dashboard/server.js';
import { DiscordIpcClient } from '../discord/ipc-client.js';
import { PresenceManager } from '../discord/presence-manager.js';
import { CentralTracker } from '../tracker/tracker.js';

async function bootstrap(): Promise<void> {
  const configManager = new ConfigManager();
  const settings = configManager.getSettings();

  const tracker = new CentralTracker();
  if (settings.pauseTracking) {
    tracker.setPaused(true);
  }

  const discordClient = new DiscordIpcClient({
    clientId: settings.discordClientId,
  });

  const presenceManager = new PresenceManager(discordClient, configManager);

  // Initialize initial presence
  presenceManager.updateFromSnapshot(tracker.getSnapshot());

  const server = new DashboardServer({
    tracker,
    presenceManager,
    discordClient,
    configManager,
  });

  const boundPort = await server.start();
  console.log(`[Antigravity Presence] Local Dashboard active at: http://127.0.0.1:${boundPort}`);

  // Connect to Discord IPC if rich presence is not disabled
  if (!settings.disableRichPresence) {
    discordClient.connect();
    console.log('[Antigravity Presence] Scanning Discord IPC pipes (0..9)...');
  }

  // Periodic watchdog timer for staleness & approval estimates (runs every 5s)
  const watchdogInterval = setInterval(() => {
    tracker.evaluateTimeouts();
  }, 5000);
  watchdogInterval.unref();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Antigravity Presence] Shutting down (${signal})...`);
    clearInterval(watchdogInterval);
    presenceManager.destroy();
    discordClient.destroy();
    await server.stop();
    tracker.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap().catch((err) => {
  console.error('[Antigravity Presence] Fatal daemon error:', err);
  process.exit(1);
});

