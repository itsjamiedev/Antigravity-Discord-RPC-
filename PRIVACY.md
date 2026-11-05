# Antigravity Presence — Privacy Statement

**Antigravity Presence** is built with zero-trust local isolation. Everything runs 100% locally on your machine (`127.0.0.1`). There are no cloud servers, no remote proxies, and no telemetry tracking.

---

## The 10-Field Edge Whitelist

Antigravity lifecycle hooks receive rich context on `stdin`, including user prompts, file paths, tool arguments, and environment variables. The **`hook-forwarder` unconditionally drops this sensitive data at the process boundary**, before anything is transmitted to the local daemon or Discord.

**Only the following 10 primitive fields ever leave the hook forwarder:**

| Whitelisted Field | Type | Description |
| :--- | :--- | :--- |
| `event` | string | Lifecycle event name (`SessionStart`, `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`). |
| `conversationId` | string (UUID) | Unique identifier for the agent conversation turn. |
| `modelName` | string | Sanitized model identifier (e.g. `gemini-4-argon-medium`, `gemini-3.8-flash-high`). |
| `toolName` | string \| null | Name of the tool being executed (e.g. `run_command`, `edit_file`). **Arguments (`toolCall.args`) are dropped**. |
| `stepIdx` | number \| null | Current step integer index. |
| `invocationNum` | number \| null | Current invocation number in the conversation. |
| `terminationReason` | string \| null | Executor termination reason (e.g. `NO_TOOL_CALL`, `MAX_INVOCATIONS`). |
| `fullyIdle` | boolean \| null | Boolean indicating if background tasks are finished. |
| `hasError` | boolean | Boolean flag indicating whether an error occurred. **Raw error message strings are dropped**. |
| `timestamp` | string (ISO 8601) | Event capture timestamp. |

---

## Fields That Are NEVER Stored, Transmitted, or Exported

The following fields are **unconditionally stripped** at the edge:

1. **Prompts (`lastUserInput`)**: Stripped immediately. Never sent to the daemon, never displayed on Discord, never written to SQLite.
2. **Source Code & File Content**: Never inspected, logged, or exported.
3. **File Paths & Directory Trees (`workspacePaths`, `transcriptPath`, `artifactDirectoryPath`)**: Stripped immediately. String fields are checked with path-rejection regexes to prevent path smuggling.
4. **Tool Arguments (`toolCall.args`)**: Command lines, bash arguments, file write payloads, and parameter objects are completely omitted.
5. **Raw Error Messages**: Converted to a boolean `hasError: true/false`. Raw error strings (which may contain path names or stack traces) are dropped.

---

## Discord Rich Presence Privacy Defaults

By default, Antigravity Presence follows **minimal public sharing**:
- **Tokens are hidden** by default (`hideTokens: true`).
- **Conversations are hidden** by default (`hideConversations: true`).
- In **AI Mode**, Discord only shows `"N AI agents active"` and the high-level model names.
- In **Manual Coding Mode**, you can optionally hide file names (`hideFileNamesInManualEdits: true`), displaying only the programming language and line numbers (e.g., `"Coding in TypeScript — Line 42 of 150"`).
- You can turn off Discord Rich Presence entirely at any time via the Local Dashboard or `config.json` (`disableRichPresence: true`).
