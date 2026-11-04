import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { IngestServer } from '../src/daemon/ingest-server.js';
import {
  assertStrictlyWhitelisted,
  getSafeHookOutput,
  sanitizeHookPayload,
} from '../src/forwarder/whitelist.js';
import { HOOK_EVENTS, WHITELISTED_KEYS, type WhitelistedHookPayload } from '../src/shared/types.js';

const FORWARDER_BUNDLE = path.resolve(process.cwd(), 'dist', 'hook-forwarder.cjs');

interface SubprocessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

function runForwarderSubprocess(
  eventName: string,
  stdinPayload: string,
  envOverrides: Record<string, string> = {}
): Promise<SubprocessResult> {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const child = spawn(process.execPath, [FORWARDER_BUNDLE, eventName], {
      env: {
        ...process.env,
        ...envOverrides,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        exitCode: code,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        durationMs: performance.now() - start,
      });
    });

    child.stdin.write(stdinPayload);
    child.stdin.end();
  });
}

describe('Phase 2: Hook Forwarder & Field Whitelist', () => {
  let tempDir: string;
  let spoolPath: string;

  const SENSITIVE_RAW_PAYLOAD = {
    conversationId: 'e70c2327-e534-4466-8bd5-0d9445444036',
    modelName: 'gemini-4-argon-medium',
    lastUserInput: 'Refactor C:\\Users\\Secret\\App\\src\\auth.ts using API_KEY=sk-live-999999',
    workspacePaths: ['F:/Antigravity Extension', 'C:\\Users\\Secret\\PrivateWorkspace'],
    transcriptPath:
      'C:/Users/Nednoxx/.gemini/antigravity/brain/e70c2327-e534-4466-8bd5-0d9445444036/.system_generated/logs/transcript_full.jsonl',
    artifactDirectoryPath:
      'C:/Users/Nednoxx/.gemini/antigravity/brain/e70c2327-e534-4466-8bd5-0d9445444036',
    stepIdx: 4,
    invocationNum: 2,
    terminationReason: 'NO_TOOL_CALL',
    fullyIdle: true,
    error: 'Failed reading file C:\\Users\\Secret\\PrivateWorkspace\\.env: permission denied',
    toolCall: {
      name: 'run_command',
      args: {
        CommandLine: 'Get-Content C:\\Users\\Secret\\.env',
        Path: 'C:\\Users\\Secret\\PrivateWorkspace\\secrets.json',
        Content: 'const SECRET_PASSWORD = "hunter2";',
        WaitMsBeforeAsync: 5000,
        toolSummary: 'Read secret env file',
      },
    },
    extraUnlistedField: 'should-be-dropped',
    sourceCode: 'function secret() { return "confidential"; }',
    filePath: '/home/user/private/key.pem',
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-presence-test-'));
    spoolPath = path.join(tempDir, 'spool.jsonl');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('1. Privacy & Whitelist Enforcement', () => {
    it('strips file paths, workspacePaths, transcriptPath, artifactDirectoryPath, lastUserInput, toolCall.args, and raw error strings', () => {
      const result = sanitizeHookPayload(
        'PreToolUse',
        SENSITIVE_RAW_PAYLOAD,
        '2026-11-05T00:00:00.000Z'
      );

      expect(result).not.toBeNull();
      expect(assertStrictlyWhitelisted(result)).toBe(true);

      // Exact keys check
      const keys = Object.keys(result!);
      expect(keys.sort()).toEqual([...WHITELISTED_KEYS].sort());

      // Verify whitelisted values
      expect(result).toEqual({
        event: 'PreToolUse',
        conversationId: 'e70c2327-e534-4466-8bd5-0d9445444036',
        modelName: 'gemini-4-argon-medium',
        toolName: 'run_command',
        stepIdx: 4,
        invocationNum: 2,
        terminationReason: 'NO_TOOL_CALL',
        fullyIdle: true,
        hasError: true,
        timestamp: '2026-11-05T00:00:00.000Z',
      });

      // Verify none of the forbidden properties or substrings exist anywhere in the serialized output
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain('lastUserInput');
      expect(serialized).not.toContain('workspacePaths');
      expect(serialized).not.toContain('transcriptPath');
      expect(serialized).not.toContain('artifactDirectoryPath');
      expect(serialized).not.toContain('toolCall');
      expect(serialized).not.toContain('CommandLine');
      expect(serialized).not.toContain('sk-live-999999');
      expect(serialized).not.toContain('auth.ts');
      expect(serialized).not.toContain('PrivateWorkspace');
      expect(serialized).not.toContain('transcript_full.jsonl');
      expect(serialized).not.toContain('secrets.json');
      expect(serialized).not.toContain('hunter2');
      expect(serialized).not.toContain('.env');
      expect(serialized).not.toContain('permission denied');
      expect(serialized).not.toContain('confidential');
      expect(serialized).not.toContain('key.pem');
    });

    it('rejects path injection attempts inside string identifier fields', () => {
      // Attempt to smuggle file paths inside conversationId, modelName, toolCall.name, terminationReason
      const poisonedConv = sanitizeHookPayload('PreInvocation', {
        conversationId: 'C:\\Users\\Secret\\project',
        modelName: 'gemini-4-argon-medium',
      });
      expect(poisonedConv).toBeNull();

      const poisonedFields = sanitizeHookPayload('PreToolUse', {
        conversationId: 'valid-uuid-1234',
        modelName: '/etc/passwd',
        terminationReason: 'C:\\secret\\file.ts',
        toolCall: {
          name: '../../secret/script.sh',
          args: { foo: 'bar' },
        },
      });

      expect(poisonedFields).not.toBeNull();
      expect(poisonedFields!.modelName).toBe('unknown');
      expect(poisonedFields!.toolName).toBeNull();
      expect(poisonedFields!.terminationReason).toBeNull();
    });

    it('returns correct safe allow outputs for all 6 events', () => {
      expect(JSON.parse(getSafeHookOutput('PreToolUse'))).toEqual({ decision: 'allow' });
      expect(JSON.parse(getSafeHookOutput('Stop'))).toEqual({ decision: 'stop' });
      expect(JSON.parse(getSafeHookOutput('SessionStart'))).toEqual({});
      expect(JSON.parse(getSafeHookOutput('PostToolUse'))).toEqual({});
      expect(JSON.parse(getSafeHookOutput('PreInvocation'))).toEqual({});
      expect(JSON.parse(getSafeHookOutput('PostInvocation'))).toEqual({});
    });
  });

  describe('2. Fail-Open Execution with Daemon Offline', () => {
    it('exits 0 and prints valid JSON allow output for all 6 events when daemon is offline', async () => {
      // Port 49999 has no server listening -> ECONNREFUSED
      const offlineEnv = {
        AGY_PRESENCE_PORT: '49999',
        AGY_PRESENCE_SPOOL_PATH: spoolPath,
      };

      const rawJson = JSON.stringify(SENSITIVE_RAW_PAYLOAD);

      for (const eventName of HOOK_EVENTS) {
        const res = await runForwarderSubprocess(eventName, rawJson, offlineEnv);

        expect(res.exitCode).toBe(0);
        expect(res.stderr).toBe('');

        const parsedStdout: unknown = JSON.parse(res.stdout);
        if (eventName === 'PreToolUse') {
          expect(parsedStdout).toEqual({ decision: 'allow' });
        } else if (eventName === 'Stop') {
          expect(parsedStdout).toEqual({ decision: 'stop' });
        } else {
          expect(parsedStdout).toEqual({});
        }
      }

      // Verify all 6 events were spooled safely without any sensitive fields
      expect(fs.existsSync(spoolPath)).toBe(true);
      const spoolLines = fs.readFileSync(spoolPath, 'utf8').trim().split('\n');
      expect(spoolLines).toHaveLength(6);

      for (const line of spoolLines) {
        expect(line).not.toContain('sk-live-999999');
        expect(line).not.toContain('PrivateWorkspace');
        expect(line).not.toContain('hunter2');
        const parsedLine: unknown = JSON.parse(line);
        expect(assertStrictlyWhitelisted(parsedLine)).toBe(true);
      }
    });

    it('exits 0 and prints valid output even when stdin is malformed JSON or empty', async () => {
      const offlineEnv = {
        AGY_PRESENCE_PORT: '49999',
        AGY_PRESENCE_SPOOL_PATH: spoolPath,
      };

      const malformedRes = await runForwarderSubprocess(
        'PreToolUse',
        '{corrupt json!!!',
        offlineEnv
      );
      expect(malformedRes.exitCode).toBe(0);
      expect(JSON.parse(malformedRes.stdout)).toEqual({ decision: 'allow' });

      const emptyRes = await runForwarderSubprocess('Stop', '', offlineEnv);
      expect(emptyRes.exitCode).toBe(0);
      expect(JSON.parse(emptyRes.stdout)).toEqual({ decision: 'stop' });
    });
  });

  describe('3. Live Daemon Ingest & Spool Recovery', () => {
    it('delivers whitelisted events to live daemon and drains offline spool on startup', async () => {
      const receivedEvents: WhitelistedHookPayload[] = [];

      // 1. First run one event while daemon is offline so it lands in spool.jsonl
      await runForwarderSubprocess('SessionStart', JSON.stringify(SENSITIVE_RAW_PAYLOAD), {
        AGY_PRESENCE_PORT: '49998',
        AGY_PRESENCE_SPOOL_PATH: spoolPath,
      });
      expect(fs.existsSync(spoolPath)).toBe(true);

      // 2. Start the IngestServer on an ephemeral port; it should immediately drain the spooled SessionStart
      const server = new IngestServer({
        port: 0,
        spoolPath,
        onEvent: (evt) => {
          receivedEvents.push(evt);
        },
      });

      const boundPort = await server.start();
      try {
        expect(receivedEvents).toHaveLength(1);
        expect(receivedEvents[0]?.event).toBe('SessionStart');
        expect(fs.existsSync(spoolPath)).toBe(false);

        // 3. Now run PreToolUse and Stop against the live daemon port
        const preToolRes = await runForwarderSubprocess(
          'PreToolUse',
          JSON.stringify(SENSITIVE_RAW_PAYLOAD),
          {
            AGY_PRESENCE_PORT: String(boundPort),
            AGY_PRESENCE_SPOOL_PATH: spoolPath,
          }
        );
        expect(preToolRes.exitCode).toBe(0);
        expect(JSON.parse(preToolRes.stdout)).toEqual({ decision: 'allow' });

        expect(receivedEvents).toHaveLength(2);
        expect(receivedEvents[1]?.event).toBe('PreToolUse');
        expect(receivedEvents[1]?.toolName).toBe('run_command');

        // 4. Verify IngestServer strictly rejects payloads containing forbidden fields
        const rogueRes = await fetch(`http://127.0.0.1:${boundPort}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...receivedEvents[1],
            lastUserInput: 'leaked prompt',
          }),
        });
        expect(rogueRes.status).toBe(400);
        expect(receivedEvents).toHaveLength(2);
      } finally {
        await server.stop();
      }
    });
  });
});
