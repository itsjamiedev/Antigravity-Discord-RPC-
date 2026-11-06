# Dual Tokens Discord RPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display both current session tokens and overall lifetime tokens on Discord Rich Presence (RPC) across AI Mode, Manual Mode, and Idle Mode, and ensure exact synchronization across multi-window IDE instances and 24-hour persistence.

**Architecture:** 
1. Extend `Session` and `TrackerSnapshot` domain models in `src/shared/types.ts` with explicit `sessionTokens` and `lifetimeTokens` fields alongside existing `tokens`.
2. Enhance `SessionManager` in `src/tracker/session-manager.ts` to persist `sessionTokens` and `initialLifetimeTokens` in `presence-session.json`, allowing session token tracking to survive restarts, reloads, and 24h pauses.
3. Enhance `PureTracker` in `src/tracker/pure-tracker.ts` to compute turn-by-turn `deltaTokens` into `sessionTokens`, sync across windows, and provide both `sessionTokens` and `lifetimeTokens` in snapshots.
4. Update `PresenceManager` formatting in `src/discord/presence-manager.ts` to output `⚡ ${sessionStr} session • ${lifetimeStr} lifetime` in presence states and rich hover tooltips.
5. Update `SidebarDashboardProvider` in `src/extension/sidebar-provider.ts` so the bento token card clearly shows both session tokens and lifetime tokens.
6. Verify all test suites (`npm test`), package VSIX, deploy to installed extension directory, and execute mandatory git commit & push to `origin main`.

**Tech Stack:** TypeScript, Node.js IPC, Vitest, VS Code Extension API.

**Spec:** User request: "On our rpc it shall show how much tokens weve used overall lifetime and in this session both too".

## Global Constraints
- STRICT PROHIBITION: NEVER access, read, search, or modify `F:\MCBE`. All operations must strictly remain inside `f:\Antigravity Extension`.
- PUSH ON EVERY SINGLE CODE CHANGE: Automatically commit and push to GitHub (`origin main`) immediately.
- 100% test pass rate across all vitest suites with zero typecheck errors.
- Zero placeholder comments (`// ...`), full unabridged implementations only (`full-output-enforcement`).

## Review Focus
1. Backward compatibility: Existing code reading `snapshot.session.tokens` must continue to receive total cumulative tokens without crashing or undefined errors.
2. Edge case: Zero tokens burned in session (brand new session) must format cleanly as `0 session` rather than `NaN` or omitting metrics.
3. Edge case: Multi-window reloads: If a secondary window is reloaded, it reads `presence-session.json` and accurately derives session tokens without resetting to 0.
4. Discord 128-character limit: State strings containing long model lists, file paths, and dual tokens must not exceed 128 characters.
5. Session pause & resume: Pausing for 24h must freeze session tokens; resuming must restore exact session tokens burned prior to pause.

---

### Task 1: Extend Shared Types with Dual Token Contracts
**Files:**
- Modify: `src/shared/types.ts`
- Test: `tests/tracker.test.ts`

- [ ] Add `sessionTokens?: TokenUsageRecord` and `lifetimeTokens?: TokenUsageRecord` to `Session`.
- [ ] Add `sessionTokens?: TokenUsageRecord` and `lifetimeTokens?: TokenUsageRecord` to `TrackerSnapshot`.
- [ ] Verify TypeScript compiles cleanly with `npm run typecheck`.

### Task 2: Update SessionManager to Persist Session Tokens and Initial Lifetime Baseline
**Files:**
- Modify: `src/tracker/session-manager.ts`
- Test: `tests/session-persistence.test.ts`

- [ ] Add `sessionTokens?: TokenUsageRecord` and `initialLifetimeTokens?: number` to `PersistentSessionState`.
- [ ] Add `updateSessionTokens(sessionTokens: TokenUsageRecord, initialLifetimeTokens?: number): void`.
- [ ] Update `pauseSession(lifetimeTokens?: TokenUsageRecord, sessionTokens?: TokenUsageRecord)` to store both.
- [ ] Update `resumeSession()` and `startFreshSession(currentLifetimeTokens?: number)` to reset or preserve session tokens accordingly.
- [ ] Update `tests/session-persistence.test.ts` to test session token persistence across simulated pauses and restarts.

### Task 3: Accumulate Turn Deltas and Provide Dual Tokens in PureTracker
**Files:**
- Modify: `src/tracker/pure-tracker.ts`
- Test: `tests/tracker.test.ts`

- [ ] Initialize `this.sessionTokens` and `this.initialLifetimeTokens` from `SessionManager` state.
- [ ] In `updateFromAgentWatcher`, accumulate `deltaTokens` from `recordConversationMultiModelTokens` and `recordConversationTokens` into `this.sessionTokens`.
- [ ] In `getSnapshot()`, populate `snapshot.session.sessionTokens` and `snapshot.session.lifetimeTokens`.
- [ ] In `syncFromLeaderSnapshot()`, sync `sessionTokens` and `lifetimeTokens`.
- [ ] In `startFreshSession()`, reset `this.sessionTokens` and set `initialLifetimeTokens`.

### Task 4: Format Dual Tokens in Discord Presence Manager
**Files:**
- Modify: `src/discord/presence-manager.ts`
- Test: `tests/discord.test.ts`

- [ ] Export `formatTokenNumberShort(tokens: number): string` (e.g. `0`, `500`, `12.5K`, `3.8M`, `2.06B`).
- [ ] In `buildDiscordActivity`, construct `dualTokenStr = `⚡ ${sessionStr} session • ${lifetimeStr} lifetime``.
- [ ] Apply `dualTokenStr` to AI Agent Mode `state`, Manual Coding Mode `state`, and Idle Mode `state`.
- [ ] Apply dual tokens to `assets.large_text` and `assets.small_text` hover tooltips.
- [ ] Update `tests/discord.test.ts` to verify dual token formatting in `state` and assets.

### Task 5: Enhance Sidebar Dashboard to Display Both Session and Lifetime Tokens
**Files:**
- Modify: `src/extension/sidebar-provider.ts`
- Test: `tests/sidebar.test.ts`

- [ ] In `renderHtmlContent`, render both session tokens (e.g. `12.5M Session`) and lifetime tokens (e.g. `784M Total`) in the Bento Token Volume card.
- [ ] In `updateFromSnapshot`, update both session and lifetime DOM elements via `postMessage`.

### Task 6: Full Verification, VSIX Packaging, Installed Extension Deployment & Git Push
**Files:**
- Output: `dist/*`, `resources/*`, `package.json`
- Deploy: `C:\Users\Nednoxx\.antigravity-ide\extensions\itsjamiefied.antigravity-presence-1.0.0`

- [ ] Run `npm run typecheck && npm test` to ensure 100% pass rate.
- [ ] Run `npm run build && npm run package`.
- [ ] Copy fresh artifacts to the installed Antigravity IDE extensions directory.
- [ ] Execute `git add -A && git commit -m "..." && git push origin main`.
