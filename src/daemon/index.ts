/**
 * Antigravity Presence — Standalone Background Daemon
 *
 * Provides hookless Discord Rich Presence and local dashboard monitoring
 * for Antigravity 2.0 desktop app and Antigravity IDE without requiring
 * an IDE extension host window.
 *
 * Automatically monitors Antigravity process lifecycle:
 * - When Antigravity 2.0 or IDE is active -> Broadcasts live rich presence.
 * - When Antigravity is closed -> Clears Discord activity immediately.
 * - Zero C++ dependencies and zero CLI hooks.
 */

import cp from 'node:child_process';
import { ConfigManager } from '../config/privacy-config.js';
import { DashboardServer } from '../dashboard/server.js';
import { DiscordIpcClient } from '../discord/ipc-client.js';
import { PresenceManager } from '../discord/presence-manager.js';
import { PureTracker } from '../tracker/pure-tracker.js';
import { AgentWatcher, type AgentWatcherState } from '../extension/agent-watcher.js';
import type { CentralTracker } from '../tracker/tracker.js';

export function isAntigravityRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      cp.execFile('tasklist', ['/FI', 'IMAGENAME eq Antigravity*', '/FO', 'CSV', '/NH'], (err, stdout) => {
        if (err || !stdout) return resolve(false);
        resolve(/Antigravity/i.test(stdout));
      });
    } else {
      cp.execFile('pgrep', ['-i', 'antigravity'], (err, stdout) => {
        resolve(!err && !!stdout && stdout.trim().length > 0);
      });
    }
  });
}

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
    discordClient.onStateChange((state) => {
      console.log(`[Antigravity Presence] Discord IPC state: ${state}`);
    });
    discordClient.connect();
    console.log('[Antigravity Presence] Scanning Discord IPC pipes (0..9)...');
  }

  // Initial process check
  let wasRunning = await isAntigravityRunning();
  server.setAntigravityRunning(wasRunning);
  if (wasRunning) {
    presenceManager.updateFromSnapshot(tracker.getSnapshot());
  } else {
    discordClient.clearActivity();
    console.log('[Antigravity Presence] Antigravity is not currently running. Waiting for launch...');
  }

  // Hookless agent watcher polling ~/.gemini/antigravity/ (shared by Antigravity 2.0 & IDE)
  const agentWatcher = new AgentWatcher();
  agentWatcher.on('change', async (state: AgentWatcherState) => {
    tracker.updateFromAgentWatcher(state);
    const isRunning = await isAntigravityRunning();
    server.setAntigravityRunning(isRunning);
    if (isRunning) {
      presenceManager.updateFromSnapshot(tracker.getSnapshot());
    } else {
      discordClient.clearActivity();
    }
  });
  agentWatcher.start();

  // Watchdog loop: checks if Antigravity application was closed or opened every 1.5s
  const processWatcherInterval = setInterval(async () => {
    const isRunning = await isAntigravityRunning();
    server.setAntigravityRunning(isRunning);
    if (!isRunning && wasRunning) {
      console.log('[Antigravity Presence] Antigravity closed. Cleared Discord RPC.');
      discordClient.clearActivity();
      wasRunning = false;
    } else if (isRunning && !wasRunning) {
      console.log('[Antigravity Presence] Antigravity launched. Resetting session clock & restoring Discord RPC.');
      wasRunning = true;
      tracker.startFreshSession();
      tracker.updateFromAgentWatcher(agentWatcher.getState());
      presenceManager.updateFromSnapshot(tracker.getSnapshot());
    }
  }, 1500);
  processWatcherInterval.unref();

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[Antigravity Presence] Shutting down (${signal})...`);
    clearInterval(processWatcherInterval);
    agentWatcher.stop();
    discordClient.clearActivity();
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
