# Native In-IDE Side Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native Activity Bar sidebar container and real-time Webview sidebar dashboard (`vscode.WebviewViewProvider`) inside Antigravity IDE featuring compact bento KPI cards, active agents, model breakdowns, session pause/resume controls, and one-click full dashboard launch.

**Architecture:**
- Contribute `viewsContainers.activitybar` and `views` in `package.json` with a crisp monochrome vector SVG icon (`resources/activity-bar-icon.svg`).
- Implement `SidebarDashboardProvider` in `src/extension/sidebar-provider.ts` implementing `vscode.WebviewViewProvider` with SSE real-time updates from `http://127.0.0.1:41177/api/stream` and VS Code message bridge.
- Design high-density, anti-slop glassmorphism HTML/CSS/JS tailored for narrow vertical sidebars (240px–450px) displaying Tokenmaxxing stats, live model distribution, agent thinking state, 24h pause/resume actions, and quick links.
- Wire extension registration in `src/extension/index.ts` and handle bidirectional commands.

**Tech Stack:** TypeScript, VS Code Extension API (`vscode.WebviewViewProvider`, `vscode.window.registerWebviewViewProvider`), HTML5/CSS3 (Geist typography, CSS variables, glassmorphism), Server-Sent Events (SSE).

**Spec:** User uploaded screenshot `media_1793920797239_603752ed.png` requesting a native side dashboard inside the IDE activity bar, similar to Qoder/Copilot.

---

## Global Constraints

- Never touch `F:\MCBE`. All work must strictly remain in `f:\Antigravity Extension`.
- Keep `~/.gemini/config/hooks.json` empty `{}`.
- Zero native C++ SQLite addons (`better-sqlite3` forbidden in extension runtime).
- Sidebar must be responsive across narrow sidebars (220px) to wide sidebars (500px).
- Mandatory automatic commit and push to `origin main` on every change.

---

## Review Focus

1. **Activity Bar Icon Rendering:** Icon must use SVG with `fill="currentColor"` so VS Code applies active/inactive theme colors properly.
2. **Webview Lifecycle & Context Preservation:** `retainContextWhenHidden: true` must be enabled so switching between Explorer and Antigravity sidebar does not reload or disconnect SSE.
3. **Sidebar View Column Responsiveness:** Cards must stack vertically and use CSS flex/grid with no horizontal scrollbars.
4. **Offline / Follower Mode Resilience:** If port 41177 is temporarily reconnecting or in follower mode, sidebar must display connecting states smoothly and auto-reconnect via SSE.
5. **Bidirectional Command Dispatch:** Clicking "Pause", "Resume", or "Open Full Dashboard" in the sidebar Webview must post messages to the extension host and execute corresponding extension commands.

---

### Task 1: Vector Activity Bar Icon & Extension Manifest Contributions

**Files:**
- Create: `resources/activity-bar-icon.svg`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - Activity Bar view container `antigravity-presence-sidebar`
  - Webview view `antigravityPresence.sidebarView`
  - Clean monochrome vector SVG icon conforming to VS Code activity bar specs.

- [ ] **Step 1: Create `resources/activity-bar-icon.svg`**
  Vector SVG with `viewBox="0 0 24 24"`, Antigravity levitation prism glyph with `fill="currentColor"`.

- [ ] **Step 2: Update `package.json` with `viewsContainers` and `views`**
  Add activitybar container and webview view configuration.

- [ ] **Step 3: Verify manifest validity with `npm run typecheck`**
  Run: `npm run typecheck`
  Expected: 0 errors.

- [ ] **Step 4: Commit changes**
  Run: `git add resources/activity-bar-icon.svg package.json && git commit -m "feat(sidebar): contribute activity bar container and webview view manifest"`

---

### Task 2: Compact Sidebar Webview Provider & UI Design

**Files:**
- Create: `src/extension/sidebar-provider.ts`
- Test: `tests/sidebar.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export class SidebarDashboardProvider implements vscode.WebviewViewProvider {
    public resolveWebviewView(
      webviewView: vscode.WebviewView,
      context: vscode.WebviewViewResolveContext,
      token: vscode.CancellationToken
    ): void;
    public updateSnapshot(snapshot: TrackerSnapshot): void;
  }
  ```

- [ ] **Step 1: Write unit tests in `tests/sidebar.test.ts`**
  Test HTML generation, message handling dispatch for `openFullDashboard`, `pauseSession`, `resumeSession`, `startFreshSession`, and presence data injection.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run tests/sidebar.test.ts`
  Expected: FAIL (module missing).

- [ ] **Step 3: Implement `SidebarDashboardProvider` in `src/extension/sidebar-provider.ts`**
  Implement responsive dark glassmorphic HTML tailored for vertical sidebars:
  - Header: Antigravity logo + live Discord status pill.
  - KPI Tile: Total Tokens Burned (`⚡ TOKENMAXXING`), prompt cache savings, and live session duration.
  - Session Control Strip: `⏸️ Pause (24h)`, `▶️ Resume`, `🔄 Fresh`.
  - Active Agents List: In-progress tasks, model name, and tool execution status.
  - Model Allocation Bar: Model breakdown list with percentages and token counts.
  - Launch Full Dashboard button.
  - Native VS Code message bridge & SSE live stream listener.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run tests/sidebar.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run: `git add src/extension/sidebar-provider.ts tests/sidebar.test.ts && git commit -m "feat(sidebar): implement native sidebar webview provider with real-time telemetry"`

---

### Task 3: Extension Host Integration & Command Wiring

**Files:**
- Modify: `src/extension/index.ts`

**Interfaces:**
- Consumes: `SidebarDashboardProvider` from `src/extension/sidebar-provider.ts`
- Produces:
  - Registered webview view provider `antigravityPresence.sidebarView`
  - Updated snapshot forwarding to sidebar on agent activity changes

- [ ] **Step 1: Register `SidebarDashboardProvider` in `activate()` in `src/extension/index.ts`**
  Register with `vscode.window.registerWebviewViewProvider`.

- [ ] **Step 2: Forward snapshots to `sidebarProvider` during agent watcher events and startup**
  Keep sidebar live even before SSE connects.

- [ ] **Step 3: Run full test suite & typecheck**
  Run: `npm test && npm run typecheck`
  Expected: 0 errors, all 9 test suites pass.

- [ ] **Step 4: Commit changes**
  Run: `git add src/extension/index.ts && git commit -m "feat(extension): register native sidebar webview provider in extension lifecycle"`

---

### Task 4: Packaging, Production Deployment & Git Push

**Files:**
- Package: `dist/*`
- Deploy target: `C:\Users\Nednoxx\.antigravity-ide\extensions\itsjamiefied.antigravity-presence-1.0.0`

- [ ] **Step 1: Build production bundle**
  Run: `npm run build`
  Expected: Clean compilation with `tsup`.

- [ ] **Step 2: Package VSIX bundle**
  Run: `npm run package`
  Expected: Packaged successfully.

- [ ] **Step 3: Deploy to installed Antigravity IDE extension folder**
  Copy `dist/*`, `resources/*`, and `package.json` to extension install location.

- [ ] **Step 4: Push to GitHub `origin main`**
  Run: `git push origin main`
