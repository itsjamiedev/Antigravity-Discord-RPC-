/**
 * Antigravity Presence — Hook Uninstaller Script
 *
 * Removes presence-logger from ~/.gemini/config/hooks.json without touching
 * any other user hooks.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const hooksJsonPath = path.join(os.homedir(), '.gemini', 'config', 'hooks.json');

export function uninstallHooks() {
  if (!fs.existsSync(hooksJsonPath)) {
    console.log('[Antigravity Presence] hooks.json does not exist. Nothing to uninstall.');
    return;
  }

  try {
    const raw = fs.readFileSync(hooksJsonPath, 'utf8').trim();
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if ('presence-logger' in parsed) {
      delete parsed['presence-logger'];
      fs.writeFileSync(hooksJsonPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
      console.log('[Antigravity Presence] Successfully removed presence-logger from ' + hooksJsonPath);

      // Remove runner from bin if exists
      const binRunner = path.join(os.homedir(), '.gemini', 'antigravity', 'bin', 'run-hook.cmd');
      if (fs.existsSync(binRunner)) {
        fs.unlinkSync(binRunner);
      }
    } else {
      console.log('[Antigravity Presence] presence-logger was not registered.');
    }
  } catch (err) {
    console.error('[Antigravity Presence] Failed to uninstall hooks:', err);
  }
}

if (process.argv[1] && process.argv[1].endsWith('uninstall-hooks.js')) {
  uninstallHooks();
}

