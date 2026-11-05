# Antigravity Presence — Privacy Policy & Data Guarantees

> **Last Updated:** November 2026  
> **Commitment:** 100% Local Execution (`127.0.0.1`), Zero Cloud Servers, Zero Telemetry, Zero Data Extraction.

---

## 1. Executive Summary

**Antigravity Presence** is an open-source, privacy-preserving developer companion for **Google Antigravity IDE**. It connects your local Antigravity environment to **Discord Rich Presence** and provides an offline local observability dashboard (`http://127.0.0.1:41177`).

We believe developers should never have to sacrifice privacy to show off their AI agent workflows. Antigravity Presence is engineered from the ground up with **zero-trust local isolation**:

- **No Remote Servers**: Antigravity Presence has no remote backend, no telemetry endpoints, and no analytics collection. All code runs locally on your machine.
- **Strict Data Sanitization**: Source code, prompt text, tool arguments, full workspace paths, and credentials **never leave your device**.
- **100% Hookless & Safe**: Runs as a standard VS Code / Antigravity IDE extension without injecting fragile external hooks into your Antigravity agent configuration.

---

## 2. What We Process & Where It Goes

| Data Category | Processed Locally? | Sent to Discord? | Displayed in Local Dashboard? | Persisted on Disk? |
| :--- | :---: | :---: | :---: | :---: |
| **Active Agent Count** | Yes | Yes (e.g. `1 AI agent active`) | Yes | In memory |
| **Model Names** | Yes | Yes (e.g. `Gemini 3.8 Flash`) | Yes | Yes (`presence-tokens.json`) |
| **Token Counts (In/Cache/Out)** | Yes | **No** (Hidden by default) | Yes | Yes (`presence-tokens.json`) |
| **Current File Name** | Yes | Yes (Basename only, e.g. `types.ts`) | Yes | In memory |
| **File Language & Line Count** | Yes | Yes (e.g. `TypeScript • Line 10 of 120`) | Yes | In memory |
| **Session Elapsed Time** | Yes | Yes (Elapsed timer) | Yes | Yes (`presence-session.json`) |
| **Active Tool Name** | Yes | **No** | Yes (e.g. `⚡ run_command`) | In memory |
| **User Prompts & Chats** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| **Source Code & Diffs** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| **Tool Arguments & Payloads** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| **Directory & File Paths** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |
| **Environment Variables & Secrets** | **NEVER** | **NEVER** | **NEVER** | **NEVER** |

---

## 3. Strict Boundary Rules

### A. Zero Prompt Inspection
Antigravity Presence reads transcript log watermarks solely to count turns and extract numeric token statistics (`input_tokens`, `cache_read_tokens`, `output_tokens`). User prompt content (`lastUserInput`, prompt instructions, system prompts) is **never parsed, stored, or forwarded**.

### B. Path Rejection & Privacy Masking
Only the file basename (e.g., `presence-manager.ts`) is used for Manual Editor presence. Full directory trees (`C:\Users\...`, `/home/...`) and workspace paths are stripped at the edge. If you prefer total file privacy, you can enable `hideFileNamesInManualEdits` to mask file names into generic language indicators (e.g., `"Coding in TypeScript"`).

### C. Tool Argument Stripping
When an agent executes tools (such as terminal commands, file writes, or API calls), only the high-level tool name (e.g., `run_command` or `edit_file`) is displayed in the local dashboard. Arguments, shell scripts, parameters, and return outputs are completely excluded.

### D. Local Token Persistence
To ensure your token statistics and daily graphs are not lost when closing or reloading the IDE, token counts are saved locally to:
```
~/.gemini/antigravity/presence-tokens.json
```
This file contains **only numerical token counts, model names, and date strings**. No code, prompts, or personal identifying information are stored.

---

## 4. Discord Rich Presence Privacy Controls

You retain 100% control over what Discord displays. The following settings are available via Antigravity IDE Settings (`Ctrl+,` -> `Antigravity Presence`) or the local dashboard settings tab:

| Setting Key | Default | Description |
| :--- | :---: | :--- |
| `antigravityPresence.disableRichPresence` | `false` | Master toggle to turn Discord Rich Presence completely on or off. |
| `antigravityPresence.hideTokens` | `true` | Prevents token numbers from appearing on Discord (they remain visible only in your local dashboard). |
| `antigravityPresence.hideModels` | `false` | Hides specific AI model names (displays `"AI Agent"` instead of `"Gemini 4 Argon"`). |
| `antigravityPresence.enableManualEditsPresence` | `true` | Enables Dual-Mode Presence to show coding activity when AI agents are idle. |
| `antigravityPresence.hideFileNamesInManualEdits` | `false` | Replaces active file names with language-only presence (e.g. `"Coding in Python"`). |

---

## 5. Security & Isolation

- **Localhost Only**: The local dashboard server binds exclusively to `127.0.0.1:41177`. It rejects external network connections and is inaccessible from the local network or internet.
- **No Native Binary Addons**: The extension is built purely in standard TypeScript/Node.js, avoiding compiled C++ binaries or third-party daemon drivers that could pose memory safety or privilege escalation risks.
- **Fail-Open & Isolated**: If Discord closes or the dashboard server is stopped, Antigravity IDE continues running normally without any interruption.

---

## 6. Open Source & Auditability

Antigravity Presence is free, open-source software licensed under the MIT License. The entire source code is available for public audit at:  
👉 **[https://github.com/itsjamiedev/Antigravity-Discord-RPC-](https://github.com/itsjamiedev/Antigravity-Discord-RPC-)**
