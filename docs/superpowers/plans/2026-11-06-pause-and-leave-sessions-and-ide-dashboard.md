# Pause & Leave Sessions and In-IDE Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 24-hour session persistence ("Pause and Leave Sessions") with interactive startup resumption confirmation, and build a native in-IDE Webview dashboard inside Antigravity IDE alongside the external browser dashboard.

**Architecture:**
- Create `src/tracker/session-manager.ts` encapsulating session life-cycle persistence, 24-hour shutdown retention, periodic crash-safe heartbeats, and exact elapsed-time math.
- Integrate session state API (`/api/session/pause`, `/api/session/resume`, `/api/session/status`) in `src/dashboard/server.ts` and interactive pause/resume triggers in `src/dashboard/html-content.ts`.
- Build `src/extension/dashboard-webview.ts` registering `antigravityPresence.openDashboardInIde` to create/reveal a native `vscode.WebviewPanel` with dark glassmorphism styling and real-time SSE streaming.
- Hook into extension activation in `src/extension/index.ts` to query `canResumeSession(24)` and show an interactive `vscode.window.showInformationMessage` prompt ("Resume Session" vs "Start Fresh").

**Tech Stack:** TypeScript, VS Code Extension API (`vscode.window.createWebviewPanel`, `showInformationMessage`, `createStatusBarItem`), Node.js `fs` / `path` / `http`, Server-Sent Events (SSE).

**Spec:** User prompt 10 ("Pause and Leave sessions what it does is it helps to let us shutdown our computer for 24 hours and it will store our last session data if we want we can continue from that same time on our discord RPC if not then we can start fresh... also like other extensions we want to have a proper dashboard inside our IDE like other plugins do such dashboard there too").

---

## Global Constraints

- Never touch `F:\MCBE`. All operations must strictly remain in `f:\Antigravity Extension`.
- Keep `~/.gemini/config/hooks.json` empty `{}`.
- Zero native C++ SQLite addons (`better-sqlite3` forbidden).
- Maintain 100% compatibility with Discord RPC timestamps and elapsed time.
- Mandatory automatic commit and push to `origin main` on every change.

---

## Review Focus

1. **Sudden power cut / crash during session:** Heartbeat must save elapsed seconds every 10s so power loss never loses session elapsed time.
2. **Offline duration calculation:** Resuming after a 12-hour machine shutdown must NOT add 12 hours to the active session duration; `startedAt` must be set to `Date.now() - (elapsedSeconds * 1000)`.
3. **Multi-window leader arbitration:** Only the primary Leader window should display the resumption dialog on startup, preventing duplicate popup storms.
4. **Webview CSP & local SSE connectivity:** In-IDE Webview must connect seamlessly to `http://127.0.0.1:41177/events` without blocking on `vscode-webview://` security policies.
5. **24-hour expiration boundary:** Sessions older than 24 hours (86,400,000 ms) must automatically expire and trigger a fresh start without nagging the user.

---

### Task 1: Session Manager with 24-Hour Persistence & Resumption Engine

**Files:**
- Create: `src/tracker/session-manager.ts`
- Modify: `src/tracker/pure-tracker.ts`
- Test: `tests/session-persistence.test.ts`

**Interfaces:**
- Consumes: `Session`, `TokenUsageRecord` from `src/shared/types.ts`
- Produces:
  ```typescript
  export interface PersistentSessionState {
    version: number;
    sessionId: string;
    startedAt: string;
    elapsedSeconds: number;
    lastHeartbeatMs: number;
    isPaused: boolean;
    pausedAt?: string;
    savedAt: string;
    savedTokens?: TokenUsageRecord;
  }

  export class SessionManager {
    constructor(customFilePath?: string);
    public getSessionState(): PersistentSessionState | null;
    public canResumeSession(maxAgeMs?: number): boolean;
    public getElapsedSeconds(): number;
    public recordHeartbeat(): void;
    public pauseSession(tokens?: TokenUsageRecord): PersistentSessionState;
    public resumeSession(): { startedAt: string; elapsedSeconds: number };
    public startFreshSession(): { startedAt: string; elapsedSeconds: number };
    public saveOnShutdown(): void;
  }
  ```

- [ ] **Step 1: Write failing unit test in `tests/session-persistence.test.ts`**
  Verify that saving state, shutting down for 10 hours, and resuming preserves exact elapsed seconds and recalculates `startedAt = Date.now() - elapsedSeconds * 1000`. Also verify > 24h expiration returns `canResumeSession() === false`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/session-persistence.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement `SessionManager` in `src/tracker/session-manager.ts` and integrate with `PureTracker`**
  Implement 24h retention logic, 10s auto-heartbeat, pause/resume arithmetic, and atomic JSON persistence to `~/.gemini/antigravity/presence-session.json`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/session-persistence.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run: `git add tests/session-persistence.test.ts src/tracker/session-manager.ts src/tracker/pure-tracker.ts && git commit -m "feat(tracker): add 24-hour session manager and pause-leave persistence"`

---

### Task 2: Dashboard Server & UI Session Controls ("Pause & Leave")

**Files:**
- Modify: `src/dashboard/server.ts`
- Modify: `src/dashboard/html-content.ts`
- Test: `tests/dashboard.test.ts`

**Interfaces:**
- Consumes: `SessionManager` from `src/tracker/session-manager.ts`
- Produces:
  - `POST /api/session/pause`
  - `POST /api/session/resume`
  - `GET /api/session/status`
  - Interactive "Pause & Leave" button in dashboard top bar and session timer card with 24h retention chip.

- [ ] **Step 1: Write failing tests in `tests/dashboard.test.ts`**
  Test `POST /api/session/pause` freezes session elapsed timer and returns `isPaused: true`. Test `POST /api/session/resume` unpauses.

- [ ] **Step 2: Run test to verify failure**
  Run: `npx vitest run tests/dashboard.test.ts`
  Expected: FAIL (endpoints return 404).

- [ ] **Step 3: Implement API endpoints in `src/dashboard/server.ts` and UI in `src/dashboard/html-content.ts`**
  Add endpoints and wire client-side JavaScript to dispatch pause/resume, toggle button visual states, and show toast notifications.

- [ ] **Step 4: Run test to verify pass**
  Run: `npx vitest run tests/dashboard.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run: `git add src/dashboard/server.ts src/dashboard/html-content.ts tests/dashboard.test.ts && git commit -m "feat(dashboard): add session pause and leave API endpoints and UI controls"`

---

### Task 3: Extension Startup Confirmation Dialog & Deactivation Persistence

**Files:**
- Modify: `src/extension/index.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `SessionManager`
- Produces:
  - Startup prompt: `vscode.window.showInformationMessage("Antigravity Presence: Found a previous session (elapsed: 1h 24m, saved 3 hours ago). Would you like to resume where you left off or start fresh?", "Resume Session", "Start Fresh")`
  - Registered Commands:
    - `antigravityPresence.pauseAndLeaveSession`
    - `antigravityPresence.resumePreviousSession`
    - `antigravityPresence.startFreshSession`
  - Clean `deactivate()` hook calling `saveOnShutdown()`.

- [ ] **Step 1: Add commands to `package.json`**
  Declare commands in `contributes.commands`.

- [ ] **Step 2: Implement startup prompt and command handlers in `src/extension/index.ts`**
  On leader activation, if `canResumeSession(24)` is true and offline gap > 60s, prompt user. If "Resume Session", resume session and update Discord presence start timestamp. On deactivation, save state.

- [ ] **Step 3: Verify TypeScript compilation**
  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 4: Commit changes**
  Run: `git add package.json src/extension/index.ts && git commit -m "feat(extension): add interactive startup resumption confirmation and pause commands"`

---

### Task 4: Native In-IDE Dashboard Webview Panel

**Files:**
- Create: `src/extension/dashboard-webview.ts`
- Modify: `src/extension/index.ts`
- Modify: `src/dashboard/html-content.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `openDashboardWebview(context: vscode.ExtensionContext, port: number): vscode.WebviewPanel`
  - Command: `antigravityPresence.openDashboardInIde`
  - Status bar click menu item: "Open In-IDE Dashboard"

- [ ] **Step 1: Create `src/extension/dashboard-webview.ts`**
  Implement `DashboardWebviewManager` using `vscode.window.createWebviewPanel`:
  - Title: `Antigravity Presence Dashboard`
  - ViewColumn: `vscode.ViewColumn.One`
  - Options: `{ enableScripts: true, retainContextWhenHidden: true }`
  - Supports loading dashboard HTML directly with base URL or proxying to `http://127.0.0.1:41177`.

- [ ] **Step 2: Update `html-content.ts` for VS Code Webview environment**
  Ensure API requests and SSE events fall back to `http://127.0.0.1:41177` when `window.location.protocol === 'vscode-webview:'`.

- [ ] **Step 3: Register command in `package.json` and status bar in `src/extension/index.ts`**
  Wire status bar click to open QuickPick offering "Open In-IDE Dashboard" or "Open in Browser".

- [ ] **Step 4: Run typecheck and existing tests**
  Run: `npm run typecheck && npm test`
  Expected: All passing.

- [ ] **Step 5: Commit changes**
  Run: `git add src/extension/dashboard-webview.ts src/extension/index.ts src/dashboard/html-content.ts package.json && git commit -m "feat(ide): add native in-IDE dashboard webview and status bar integration"`

---

### Task 5: End-to-End Verification, Extension Packaging, and Deployment

**Files:**
- Package: `dist/*`
- Deploy target: `C:\Users\Nednoxx\.antigravity-ide\extensions\itsjamiefied.antigravity-presence-1.0.0`

- [ ] **Step 1: Run full test suite & typecheck**
  Run: `npm test && npm run typecheck`
  Expected: All 8 test suites pass, 0 type errors.

- [ ] **Step 2: Build and package production bundle**
  Run: `npm run build`
  Expected: Clean compilation with `tsup`.

- [ ] **Step 3: Sync built files to installed extension directory**
  Copy `dist/*` and `package.json` to `C:\Users\Nednoxx\.antigravity-ide\extensions\itsjamiefied.antigravity-presence-1.0.0\dist`.

- [ ] **Step 4: Push to GitHub `origin main`**
  Run: `git push origin main`

