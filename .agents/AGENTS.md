# Unstable Wiki - Master Agent Guidelines & Rules

## 1. Directory Isolation & Permission Boundary
- **STRICT PROHIBITION**: NEVER access, read, search, or modify `F:\MCBE` without the user's explicit written permission. All operations must strictly remain inside `f:\Unstable Wiki`.

## 2. Mandatory Skill Usage Protocols
See [.agents/rules/engineering.md](file:///f:/Unstable%20Wiki/.agents/rules/engineering.md) for full protocol definitions:
- **Planning**: ALWAYS use the [`writing-plans`](file:///f:/Unstable%20Wiki/.agents/skills/writing-plans) skill when drafting, updating, or reviewing implementation plans.
- **Frontend & UI**: ALWAYS use [`high-end-visual-design`](file:///f:/Unstable%20Wiki/.agents/skills/high-end-visual-design) and [`design-taste-frontend`](file:///f:/Unstable%20Wiki/.agents/skills/design-taste-frontend) (along with [`ui-ux-pro-max`](file:///f:/Unstable%20Wiki/.agents/skills/ui-ux-pro-max)). Enforce anti-slop, rich dark-mode aesthetics, custom glassmorphism, and Minecraft Seven font typography.
- **Plan Execution & Coding**: ALWAYS use [`full-output-enforcement`](file:///f:/Unstable%20Wiki/.agents/skills/full-output-enforcement) skill. Strictly ban placeholder comments, stubbed functions, and token truncations.
- **Software Engineering**: ALWAYS use [`engineering`](file:///f:/Unstable%20Wiki/.agents/skills/engineering) skill for autonomous end-to-end engineering, codebase design, and testing.
- **Database & Backend**: ALWAYS use [`supabase`](file:///f:/Unstable%20Wiki/.agents/skills/supabase), [`supabase-postgres-best-practices`](file:///f:/Unstable%20Wiki/.agents/skills/supabase-postgres-best-practices), and [`elysia`](file:///f:/Unstable%20Wiki/.agents/skills/elysia).

## 3. Mandatory Code Push Protocol
- **PUSH ON EVERY SINGLE CODE CHANGE**: Whenever ANY code, configuration, or documentation change is made in this workspace, you MUST automatically commit and push to GitHub (`origin main`) immediately. See [.agents/rules/codepush.md](file:///f:/Unstable%20Wiki/.agents/rules/codepush.md).
- Repository: `https://github.com/itsjamiedev/Unstable-Wiki.git`
- Branch: `main`
- NEVER leave uncommitted changes at the end of a turn.
- ALWAYS perform security checks (`.env`, credentials, tokens must never be staged).
