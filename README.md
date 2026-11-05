# Antigravity Presence

> A privacy-safe local companion for Google Antigravity that displays real-time agent activity on Discord Rich Presence and serves a local usage dashboard.

---

## Key Features

- **Bullet-Proof Discord Rich Presence**: Scans IPC pipes `0..9`, uses binary packet framing, PING/PONG heartbeats, and auto-reconnects with exponential backoff when Discord closes or reopens.
- **Dual-Mode Presence**:
  - **AI Agent Mode** (Priority when agents are active): Displays active agent count, model names, and exact token totals.
  - **Manual Coding Mode** (When AI agents are idle): Displays file name, language, total line count, and active line number (`Editing types.ts • TypeScript — Line 42 of 150`).
- **Sub-100ms Fail-Open Hook Forwarder**: Compiled into an isolated `.cjs` bundle with a hard `85ms` watchdog timer. Always exits `0` and prints the required allow JSON so agent execution is never altered or delayed.
- **Offline Event Spooling**: If the daemon is temporarily offline, events are spooled safely to `spool.jsonl` and automatically drained when the daemon starts—zero lost events.
- **Local Real-Time Dashboard (`127.0.0.1:41177`)**: 100% offline, zero-dependency spatial glass UI with Server-Sent Events (SSE) live updates across 5 tabs: Overview, Agents, Models, Conversations, and Analytics.
- **Strict Privacy Guarantees**: Whitelists only 10 primitive fields. Source code, prompts (`lastUserInput`), file paths (`workspacePaths`, `transcriptPath`), and tool arguments (`toolCall.args`) are stripped at the edge.

---

## Architecture & Data Flow

```
┌─────────────────────────────────┐
│ Multiple Antigravity IDE / CLI  │
└────────────────┬────────────────┘
                 │ stdin (Event JSON)
                 ▼
┌────────────────────────────────────────────────────────┐
│  Hook Forwarder (dist/hook-forwarder.cjs)              │
│  - 85ms Hard Watchdog Timer (Sub-100ms Guarantee)      │
│  - Strict 10-Field Privacy Whitelist                   │
│  - Fail-Open Output: always exits 0                    │
└───────┬──────────────────────────────────┬─────────────┘
        │ HTTP POST <40ms                  │ (If Daemon Offline)
        ▼                                  ▼
┌───────────────────────────────┐  ┌─────────────────────────┐
│ Local Daemon (127.0.0.1:41177)│  │ Local Offline Spool     │
│ - Ingest Server & Spool Drain │◄─┤ (spool.jsonl)           │
│ - Central SQLite WAL Tracker  │  └─────────────────────────┘
│ - Local Transcript Reader     │
│ - 15s Discord Debouncer       │
└───────┬───────────────────────┘
        │
        ├────────────────────────────────┐
        ▼                                ▼
┌────────────────────────┐      ┌─────────────────────────┐
│ Discord Rich Presence  │      │ Local Web Dashboard     │
│ (IPC Pipes 0..9)       │      │ (http://127.0.0.1:41177)│
└────────────────────────┘      └─────────────────────────┘
```

---

## Quick Start

### 1. Installation
Clone or navigate to the repository directory and install dependencies:

```bash
npm install
npm run build
```

### 2. Register Hooks in Antigravity
Register the production hook forwarder in `~/.gemini/config/hooks.json`:

```bash
npm run hooks:install
```

This configures Antigravity to run all 6 lifecycle events (`SessionStart`, `PreToolUse`, `PostToolUse`, `PreInvocation`, `PostInvocation`, `Stop`) through our fail-open runner.

### 3. Launch the Local Daemon
Start the daemon to enable Discord Rich Presence and the Web Dashboard:

```bash
npm start
```

Open your browser to **`http://127.0.0.1:41177`** to view your local usage dashboard.

### 4. Unregistering Hooks (Uninstall)
To cleanly remove Antigravity Presence hooks without touching any other user hooks:

```bash
npm run hooks:uninstall
```

---

## Dual-Mode Presence

Antigravity Presence automatically coordinates between two states:

1. **AI Agent Mode** (Active whenever agents are thinking or running tools):
   - **Details**: `1 AI agent active` / `N AI agents active`
   - **State**: `Gemini 4 Argon, Gemini 3.8 Flash`
   - **Assets**: `antigravity_logo` + `robot` ("AI Agent Working")
2. **Manual Coding Mode** (Active when AI agents are idle):
   - **Details**: `Editing types.ts` (or `Coding in TypeScript` if `hideFileNamesInManualEdits: true`)
   - **State**: `TypeScript — Line 42 of 150`
   - **Assets**: `antigravity_logo` + `pencil` ("Manual Editing")

---

## Packaging Options

- **Antigravity Plugin**: Located in [`plugins/antigravity-presence/`](file:///f:/Antigravity%20Extension/plugins/antigravity-presence/) with `plugin.json` and `hooks.json`. Appears natively under **Settings → Customizations** in the Antigravity IDE.
- **Antigravity App Sidecar**: Located in [`sidecars/antigravity-presence/sidecar.json`](file:///f:/Antigravity%20Extension/sidecars/antigravity-presence/sidecar.json) for automatic background process management.

---

## Verification & Testing

Run the full automated test suite (31 unit, integration, chaos, and privacy tests):

```bash
npm test
```

Test coverage includes:
- **Phase 1**: Empirical data capture & research findings ([`research/FINDINGS.md`](file:///f:/Antigravity%20Extension/research/FINDINGS.md)).
- **Phase 2**: Sub-100ms fail-open forwarder, strict field whitelist, offline spooling ([`tests/forwarder.test.ts`](file:///f:/Antigravity%20Extension/tests/forwarder.test.ts)).
- **Phase 3**: Central SQLite WAL tracker, idempotency, exact token extraction ([`tests/tracker.test.ts`](file:///f:/Antigravity%20Extension/tests/tracker.test.ts)).
- **Phase 4**: Discord binary framing, pipe scanning (0..9), dual-mode formatting, 15s debouncing, auto-reconnect ([`tests/discord.test.ts`](file:///f:/Antigravity%20Extension/tests/discord.test.ts)).
- **Phase 5**: Local dashboard REST API, SSE real-time stream, settings mutation ([`tests/dashboard.test.ts`](file:///f:/Antigravity%20Extension/tests/dashboard.test.ts)).
- **Phase 6**: Comprehensive 10-scenario chaos suite ([`tests/e2e-chaos.test.ts`](file:///f:/Antigravity%20Extension/tests/e2e-chaos.test.ts)).

---

## Privacy Statement

See [`PRIVACY.md`](file:///f:/Antigravity%20Extension/PRIVACY.md) for the formal privacy statement listing every field that ever exits the forwarder.
