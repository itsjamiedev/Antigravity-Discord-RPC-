/**
 * Antigravity Presence - Research Logger Hook
 * 
 * Captures the FULL raw stdin payload of agent lifecycle events to research/raw-events.jsonl.
 * Strictly fail-open (<100ms), outputs valid safe responses, and never blocks the agent.
 */

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.resolve(__dirname, 'raw-events.jsonl');
const eventName = process.argv[2] || 'Unknown';

function getSafeResponse(event) {
  switch (event) {
    case 'PreToolUse':
      return JSON.stringify({ decision: 'allow' });
    case 'Stop':
      return JSON.stringify({ decision: 'stop' });
    case 'SessionStart':
    case 'PostToolUse':
    case 'PreInvocation':
    case 'PostInvocation':
    default:
      return JSON.stringify({});
  }
}

function main() {
  let rawInput = '';

  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    rawInput += chunk;
  });

  process.stdin.on('end', () => {
    try {
      let parsed = null;
      try {
        parsed = JSON.parse(rawInput);
      } catch (err) {
        parsed = null;
      }

      const logEntry = {
        _hookEvent: eventName,
        _capturedAt: new Date().toISOString(),
        ...(parsed !== null && typeof parsed === 'object' ? parsed : { _rawInput: rawInput })
      };

      fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
    } catch (err) {
      // Fail-open: Never disrupt the agent even if file write fails
    } finally {
      process.stdout.write(getSafeResponse(eventName) + '\n');
      process.exit(0);
    }
  });

  process.stdin.on('error', () => {
    process.stdout.write(getSafeResponse(eventName) + '\n');
    process.exit(0);
  });
}

main();

