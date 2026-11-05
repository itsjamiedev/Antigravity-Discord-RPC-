/**
 * Antigravity Presence — Production Hook Forwarder CLI Entrypoint
 *
 * Registered for all 6 Antigravity lifecycle events:
 *   SessionStart, PreToolUse, PostToolUse, PreInvocation, PostInvocation, Stop
 *
 * Guarantees:
 *   1. Executes in <100ms (enforced by 85ms hard fail-safe timer).
 *   2. Strips all paths, prompts, tool args, and raw errors via whitelist.ts.
 *   3. Always prints the valid JSON allow output to stdout and exits 0, even
 *      when the daemon is offline or stdin is malformed.
 */

import { forwardPayloadToDaemon } from './transport.js';
import { getSafeHookOutput, sanitizeHookPayload } from './whitelist.js';

const eventName = process.argv[2] ?? 'Unknown';
let hasExited = false;

function safeExit(): never {
  if (!hasExited) {
    hasExited = true;
    try {
      process.stdout.write(getSafeHookOutput(eventName) + '\n');
    } catch {
      // Ignore stdout write errors
    }
  }
  process.exit(0);
}

// 1. Hard 85ms watchdog timer so the hook can NEVER exceed the 100ms budget
const watchdog = setTimeout(() => {
  safeExit();
}, 85);
watchdog.unref();

// 2. Global fail-open error handlers
process.on('uncaughtException', () => {
  safeExit();
});
process.on('unhandledRejection', () => {
  safeExit();
});

async function run(): Promise<void> {
  let rawInput = '';

  try {
    process.stdin.setEncoding('utf8');

    await new Promise<void>((resolve) => {
      process.stdin.on('data', (chunk: string) => {
        rawInput += chunk;
      });
      process.stdin.on('end', () => {
        resolve();
      });
      process.stdin.on('error', () => {
        resolve();
      });
    });

    const sanitized = sanitizeHookPayload(eventName, rawInput);
    if (sanitized !== null) {
      await forwardPayloadToDaemon(sanitized);
    }
  } catch {
    // Fail-open on any error
  } finally {
    clearTimeout(watchdog);
    safeExit();
  }
}

void run();

