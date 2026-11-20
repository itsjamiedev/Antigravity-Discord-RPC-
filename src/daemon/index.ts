/**
 * Antigravity Presence — Standalone Background Daemon
 *
 * Provides hookless Discord Rich Presence and local dashboard monitoring
 * for Antigravity 2.0 desktop app and Antigravity IDE without requiring
 * an IDE extension host window.
 *
 * Uses PureTracker and AgentWatcher for 100% native TypeScript execution
 * with zero C++ dependencies and zero CLI hooks.
 */

import { ConfigManager } from '../config/privacy-config.js';
import { DashboardServer } from '../dashboard/server.js';
import { DiscordIpcClient } from '../discord/ipc-client.js';
import { PresenceManager } from '../discord/presence-manager.js';
import { PureTracker } from '../tracker/pure-tracker.js';
import { AgentWatcher, type AgentWatcherState } from '../extension/agent-watcher.js';
import type { CentralTracker } from '../tracker/tracker.js';

async function bootstrap(): Promise<void> {
  const configManager = new ConfigManager();
  const settings = configManager.getSettings();

  const tracker = new PureTracker();
  if (settings.pauseTracking) {
    tracker.pauseSession();
  }

  const discordClient = new DiscordIpcClient({
    clientId: settings.discordClientId,
  });

  const presenceManager = new PresenceManager(discordClient, configManager);

  // Initialize initial presence from disk/session state
  presenceManager.updateFromSnapshot(tracker.getSnapshot());

  const server = new DashboardServer({
    port: 41177,
    tracker: tracker as unknown as CentralTracker,
    presenceManager,
    discordClient,
    configManager,
  });

  try {
    const boundPort = await server.start();
    console.log(`[Antigravity Presence] Local Dashboard active at: http://127.0.0.1:${boundPort}`);
  } catch (err) {
    console.warn('[Antigravity Presence] Port 41177 already occupied (likely an active IDE window). Daemon running in companion mode.');
  }

  // Connect to Discord IPC if rich presence is not disabled
  if (!settings.disableRichPresence) {
    discordClient.connect();
    console.log('[Antigravity Presence] Scanning Discord IPC pipes (0..9)...');
  }

  // Hookless agent watcher polling ~/.gemini/antigravity/ (shared by Antigravity 2.0 & IDE)
  const agentWatcher = new AgentWatcher();
  agentWatcher.on('change', (state: AgentWatcherState) => {
    tracker.updateFromAgentWatcher(state);
    presenceManager.updateFromSnapshot(tracker.getSnapshot());
  });
  agentWatcher.start();
  tracker.updateFromAgentWatcher(agentWatcher.getState());
  presenceManager.updateFromSnapshot(tracker.getSnapshot());

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Antigravity Presence] Shutting down (${signal})...`);
    agentWatcher.stop();
    presenceManager.destroy();
    discordClient.destroy();
    await server.stop();
    tracker.getSessionManager().saveOnShutdown();
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
