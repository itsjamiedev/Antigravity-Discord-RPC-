/**
 * Antigravity Presence — Hook Installer Script
 *
 * Configures ~/.gemini/config/hooks.json to execute run-hook.cmd for all 6 events.
 * Preserves any existing user-configured hooks.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const geminiConfigDir = path.join(os.homedir(), '.gemini', 'config');
const hooksJsonPath = path.join(geminiConfigDir, 'hooks.json');
const runnerCmdPath = path.join(geminiConfigDir, 'run-hook.cmd');

const presenceDir = path.join(os.homedir(), '.gemini', 'antigravity-presence');
const targetBundlePath = path.join(presenceDir, 'hook-forwarder.cjs');
const localBundlePath = path.resolve(import.meta.dirname, '..', 'dist', 'hook-forwarder.cjs');

export function installHooks() {
  // 1. Ensure isolated runtime directory exists
  if (!fs.existsSync(presenceDir)) {
    fs.mkdirSync(presenceDir, { recursive: true });
  }

  // Write isolated package.json so it's strictly CommonJS
  fs.writeFileSync(
    path.join(presenceDir, 'package.json'),
    JSON.stringify({ name: 'antigravity-presence-runtime', private: true, type: 'commonjs' }, null, 2),
    'utf8'
  );

  // Copy dist/hook-forwarder.cjs if exists
  if (fs.existsSync(localBundlePath)) {
    fs.copyFileSync(localBundlePath, targetBundlePath);
  }

  // 2. Ensure run-hook.cmd exists in ~/.gemini/config
  const cmdScript = `@echo off
node "${targetBundlePath}" %* 2>nul
if errorlevel 1 (
  if "%~1"=="PreToolUse" (
    echo {"decision":"allow"}
  ) else if "%~1"=="Stop" (
    echo {"decision":"stop"}
  ) else (
    echo {}
  )
)
exit /b 0
`;
  fs.writeFileSync(runnerCmdPath, cmdScript, 'utf8');

  // Also copy to ~/.gemini/antigravity/bin if it exists (which is in PATH)
  const antigravityBinDir = path.join(os.homedir(), '.gemini', 'antigravity', 'bin');
  if (fs.existsSync(antigravityBinDir)) {
    fs.copyFileSync(runnerCmdPath, path.join(antigravityBinDir, 'run-hook.cmd'));
  }

  // 3. Register in hooks.json
  if (!fs.existsSync(geminiConfigDir)) {
    fs.mkdirSync(geminiConfigDir, { recursive: true });
  }

  let hooksConfig = {};
  if (fs.existsSync(hooksJsonPath)) {
    try {
      const raw = fs.readFileSync(hooksJsonPath, 'utf8').trim();
      if (raw) {
        hooksConfig = JSON.parse(raw);
      }
    } catch {
      hooksConfig = {};
    }
  }

  const hookCommand = runnerCmdPath.replace(/\\/g, '/');

  hooksConfig['presence-logger'] = {
    SessionStart: [
      {
        type: 'command',
        command: `"${hookCommand}" SessionStart`,
        timeout: 10,
      },
    ],
    PreToolUse: [
      {
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `"${hookCommand}" PreToolUse`,
            timeout: 10,
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: '*',
        hooks: [
          {
            type: 'command',
            command: `"${hookCommand}" PostToolUse`,
            timeout: 10,
          },
        ],
      },
    ],
    PreInvocation: [
      {
        type: 'command',
        command: `"${hookCommand}" PreInvocation`,
        timeout: 10,
      },
    ],
    PostInvocation: [
      {
        type: 'command',
        command: `"${hookCommand}" PostInvocation`,
        timeout: 10,
      },
    ],
    Stop: [
      {
        type: 'command',
        command: `"${hookCommand}" Stop`,
        timeout: 10,
      },
    ],
  };

  fs.writeFileSync(hooksJsonPath, JSON.stringify(hooksConfig, null, 2) + '\n', 'utf8');
  console.log('[Antigravity Presence] Hooks successfully registered in ' + hooksJsonPath);
}

if (process.argv[1] && process.argv[1].endsWith('install-hooks.js')) {
  installHooks();
}

