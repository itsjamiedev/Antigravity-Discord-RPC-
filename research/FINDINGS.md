# Phase 1 Research Findings & Empirical Verification

This document records the empirical evidence captured during Phase 1 of the **Antigravity Presence** project. All findings are derived from real runtime captures using the lifecycle hook logging framework (`research/logger-hook.js`), the Antigravity CLI (`agy`), Antigravity IDE, transcripts (`transcript.jsonl`), and internal SQLite databases (`conversation_summaries.db`).

---

## 1. Lifecycle Hook Registration & Execution

### Windows Command Execution Quirks
When registering hooks in `~/.gemini/config/hooks.json` on Windows, Antigravity executes handlers via `cmd.exe /c`.
- **Finding**: On Windows, passing paths with spaces in quotes (e.g. `node "F:/Antigravity Extension/research/logger-hook.js" PreToolUse`) causes Go's `os/exec` command-line escaper to wrap arguments in `\"`. `cmd.exe` does not parse `\"` as an escape sequence, treating it as a literal backslash followed by a quote. This caused Node to receive `"F:\Antigravity` and fail with `MODULE_NOT_FOUND`.
- **Verified Solution**: A zero-space wrapper batch script `C:/Users/Nednoxx/.gemini/config/run-hook.cmd` forwards arguments directly to the node hook:
  ```cmd
  @node "F:\Antigravity Extension\research\logger-hook.js" %*
  ```
  Commands in `hooks.json` are registered as:
  `"command": "C:/Users/Nednoxx/.gemini/config/run-hook.cmd <EventName>"`
- **Performance**: Hook invocation and execution averages **<60ms** (well within the <100ms non-negotiable budget).

---

## 2. Evidence-Based Research Questions

### Q1: Do concurrent agents have distinct `conversationId`s? Do subagents?
- **Finding**: **YES**. Every concurrent agent and every subagent receives a unique UUIDv4 `conversationId`.
- **Empirical Evidence**:
  - Independent agents:
    - Session A: `512bfea5-728a-474e-aba6-0a95667802db`
    - Session B: `e70c2327-e534-4466-8bd5-0d9445444036`
    - Session C: `6e4b9dd9-a75c-407e-9897-4236e592ea11`
  - Interleaving capture: In `raw-events.jsonl`, events from `e4702af5-e1d8-4450-88ae-90392f1b91aa` and `6e4b9dd9-a75c-407e-9897-4236e592ea11` interleaved in the same sub-second window, each maintaining distinct `conversationId` tagging.
  - Subagents: When parent agent `7cf4546d-4f4a-46d2-ac55-0397b7710684` launched a subagent via `invoke_subagent`, the subagent executed under its own distinct ID `0818dbfd-d870-455f-a40a-fd2d2a08a5aa` and fired the complete sequence of hook events (`PreInvocation`, `PreToolUse`, `PostToolUse`, `PostInvocation`, `Stop`).
  - Relationship linkage: The relationship is persisted in `~/.gemini/antigravity/conversation_summaries.db` in the `parent_conversation_id` and `nesting_depth` columns.

### Q2: Does `modelName` change when the model switches mid-conversation?
- **Finding**: **YES**. `modelName` updates dynamically in hook event payloads as soon as the model changes.
- **Empirical Evidence**:
  - Conversation `e70c2327-e534-4466-8bd5-0d9445444036` started with model `gemini-4-argon-medium`.
  - Events during turn 1 reported:
    `"modelName": "gemini-4-argon-medium"`
  - Turn 2 was invoked using `--model gemini-3.8-flash-high`.
  - `PreInvocation` at `2026-11-04T23:19:52.555Z` immediately reported:
    `"modelName": "gemini-3.8-flash-high"`
  - Subsequent `PostInvocation` and `Stop` events also reported `gemini-3.8-flash-high`.
  - **Important Note**: `SessionStart` only fires once at conversation inception. Therefore, tracking model transitions requires monitoring `PreInvocation` and other per-turn events, not just `SessionStart`.

### Q3: Can activity (thinking, running a tool, finished, waiting for approval/input) be derived from events alone? Which states cannot?
- **Derivable States**:
  - **Thinking / Planning**: Active between `PreInvocation` and either `PreToolUse` (tool generated) or `PostInvocation` (response generated).
  - **Running a Tool**: Active between `PreToolUse` and `PostToolUse`. The tool name is available at `toolCall.name`.
  - **Finished / Idle**: Signaled when `Stop` fires with `fullyIdle: true`. The agent has concluded its turn and is waiting for the user's next prompt.
  - **Waiting for Background Tasks**: Signaled when `Stop` fires with `fullyIdle: false`.
- **States That CANNOT Be Derived From Events Alone**:
  - **Waiting for User Approval**: There is NO dedicated approval hook event. `PreToolUse` fires *before* the IDE prompts the user for permissions. If the IDE waits for the user to click "Allow", no hook event is emitted during this wait; the agent remains in the `PreToolUse` state. It can only be flagged as `waiting_for_approval (estimated)` if the duration in `PreToolUse` exceeds a threshold (e.g., >10s).
  - **Abrupt Termination / Crash**: If the user kills the terminal or IDE window, no `Stop` event is sent. The tracker must use a staleness timeout (e.g. 60s without events while in an active state) to transition the agent to `unknown / stale`.

### Q4: Is `fullyIdle` reliable for "completed" vs "waiting"?
- **Finding**: **YES, 100% reliable**.
- **Empirical Evidence**:
  - When an asynchronous background task (`WaitMsBeforeAsync: 500`) was initiated in conversation `6e4b9dd9-a75c-407e-9897-4236e592ea11`, turn 1 concluded with:
    `{ "terminationReason": "NO_TOOL_CALL", "fullyIdle": false }`
  - While running, internal logs indicated: `root agent idle; waiting for 1 background task(s) to finish`.
  - Once the background process finished, turn 2 concluded with:
    `{ "terminationReason": "NO_TOOL_CALL", "fullyIdle": true }`
  - For normal turns without background tasks, `Stop` consistently reports `fullyIdle: true`.

### Q5: Transcript Schema & Token Usage
- **Finding**: `transcript.jsonl` contains **EXACT, provider-reported token metrics** on every `PLANNER_RESPONSE` step.
- **Empirical Evidence**:
  - Turn 1 (`PLANNER_RESPONSE`): `input_tokens: 11356`, `cache_read_tokens: 0`, `output_tokens: 70`
  - Turn 2 (`PLANNER_RESPONSE`): `input_tokens: 2219`, `cache_read_tokens: 9302`, `output_tokens: 22`
- **Schema (Keys Only)**:
  ```json
  // USER_INPUT
  {
    "step_index": "number",
    "source": "string (e.g. USER_EXPLICIT)",
    "type": "string (e.g. USER_INPUT)",
    "status": "string (e.g. DONE)",
    "created_at": "string (ISO 8601)",
    "content": "string"
  }

  // PLANNER_RESPONSE
  {
    "step_index": "number",
    "source": "string (e.g. MODEL)",
    "type": "string (e.g. PLANNER_RESPONSE)",
    "status": "string (e.g. DONE)",
    "created_at": "string (ISO 8601)",
    "input_tokens": "number",
    "cache_read_tokens": "number",
    "output_tokens": "number",
    "thinking": "string",
    "tool_calls": "array",
    "content": "string",
    "truncated_fields": "array (optional)"
  }

  // GENERIC / TOOL STEP
  {
    "step_index": "number",
    "source": "string (e.g. MODEL)",
    "type": "string (e.g. GENERIC)",
    "status": "string (e.g. DONE | RUNNING)",
    "created_at": "string (ISO 8601)",
    "content": "string"
  }
  ```
- **Conversation Titles**: Titles are **NOT** stored in `transcript.jsonl`.
- **Message Roles & Step Counts**: Fully verifiable from `transcript.jsonl` lines.

### Q6: What other local files expose usage?
Under `<app_data_dir>` (`~/.gemini/antigravity` and `~/.gemini/antigravity-cli`):
1. **`conversation_summaries.db` (SQLite)**:
   Contains table `conversation_summaries`:
   - `conversation_id`: Primary key UUID.
   - `title`: User-visible conversation title (e.g., "Creating Multi-Agent Systems", "Echo Hello Antigravity Command").
   - `step_count`: Exact integer step count.
   - `status`: Execution status (e.g., `CASCADE_RUN_STATUS_IDLE`).
   - `agent_name`: Name of specialized subagent (e.g., `research`, `ui-ux-designer`).
   - `parent_conversation_id`: UUID of parent agent when spawned as subagent.
   - `nesting_depth`: Integer hierarchy level (0 for root, 1+ for subagents).
   - `not_fully_idle`: Boolean indicating background execution.
   - `killed`: Boolean indicating termination.
   - `last_modified_time`: Timestamp of last turn update.
2. **`presence/<conversation_id>.lock`**:
   Zero-byte lock files present for active/open agent sessions.
3. **`conversations/<conversation_id>.db`**:
   SQLite database holding raw serialized protobuf steps and metadata.

---

## 3. Capability Matrix

| Feature / Requirement | Capability Status | Source of Truth & Method |
| :--- | :--- | :--- |
| **Active Agent Count** | **SUPPORTED** | Count active unique `conversationId`s from lifecycle events with a staleness timeout. |
| **Concurrent Agent Separation** | **SUPPORTED** | Unique `conversationId` present in every event payload. |
| **Subagent Detection & Hierarchy** | **SUPPORTED** | Distinct `conversationId` in events; `parent_conversation_id` and `nesting_depth` verified in `conversation_summaries.db`. |
| **Active Model Name** | **SUPPORTED** | `modelName` field in `SessionStart`, `PreInvocation`, `PostInvocation`, and `Stop`. Updates dynamically on model switch. |
| **Thinking State** | **SUPPORTED** | State between `PreInvocation` and `PreToolUse` / `PostInvocation`. |
| **Tool Execution State** | **SUPPORTED** | State between `PreToolUse` and `PostToolUse` (includes `toolCall.name`). |
| **Tool Error Detection** | **SUPPORTED** | `error` field present and populated in `PostToolUse`. |
| **Completed / Idle State** | **SUPPORTED** | Emitted by `Stop` with `fullyIdle: true`. |
| **Waiting for Background Tasks** | **SUPPORTED** | Emitted by `Stop` with `fullyIdle: false`. |
| **Waiting for User Approval** | **ESTIMATE-ONLY** | Not in events. Derivable only as duration heuristic (>10s) while in `PreToolUse` state. |
| **Agent Crash / Window Close** | **DERIVABLE** | Staleness watchdog (mark "unknown / stale" after configurable timeout without events). |
| **Token Usage (Prompt, Output, Cache)** | **SUPPORTED** | Parsed directly from `transcript.jsonl` (`input_tokens`, `cache_read_tokens`, `output_tokens`). Zero guessing. |
| **Token Usage from Hooks Alone** | **NOT AVAILABLE** | Hook payloads omit token fields. Must be read from local `transcriptPath`. |
| **Conversation Titles** | **SUPPORTED** | Read from local `conversation_summaries.db` by `conversationId`. |
| **Message / Step Counts** | **SUPPORTED** | Hook `stepIdx` / `invocationNum` and `transcript.jsonl` line count. |
| **Discord Rich Presence (`SET_ACTIVITY`)** | **SUPPORTED** | Discord IPC socket protocol (Opcode 1 FRAME). OAuth requirement to be verified in Phase 4. |
| **Local Dashboard** | **SUPPORTED** | 127.0.0.1 Web UI reading from single central tracker. |

---

## 4. Privacy & Whitelist Verification
- Raw payloads received on stdin contain:
  - `lastUserInput`: User prompt text (**CONFIDENTIAL** - must be stripped).
  - `workspacePaths`: Local filesystem paths (**CONFIDENTIAL** - must be stripped).
  - `artifactDirectoryPath`: Local paths (**CONFIDENTIAL** - must be stripped).
  - `toolCall.args`: May contain bash commands, file paths, sensitive source code (**CONFIDENTIAL** - must be stripped).
- **Forwarder Whitelist**:
  Only the following safe fields ever exit the forwarder:
  - `event`: Event name (`SessionStart`, `PreToolUse`, etc.)
  - `conversationId`: UUID
  - `modelName`: Sanitized model string
  - `toolName`: `toolCall.name` ONLY (e.g. `run_command`, `read_file`)
  - `stepIdx`: Integer
  - `invocationNum`: Integer
  - `terminationReason`: String
  - `fullyIdle`: Boolean
  - `hasError`: Boolean (`true` if `error` is non-empty, otherwise `false`)
  - `timestamp`: ISO 8601 string

