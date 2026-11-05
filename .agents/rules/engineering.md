# Engineering Standards & Mandatory Skill Usage Protocol

**Workspace**: `f:\Unstable Wiki`  
**Target Repository**: `https://github.com/itsjamiedev/Unstable-Wiki.git`  
**Status**: ACTIVE & MANDATORY

---

## 1. Directory Isolation & Permission Boundary

> [!CAUTION]
> **STRICT DIRECTORY BOUNDARY**:
> **NEVER** navigate to, search, read, copy from, or modify the `F:\MCBE` project directory without the user's explicit written permission. All operations must remain entirely inside `f:\Unstable Wiki` and designated workspace paths.

---

## 2. Core Mandatory Skill Workflows

Every task executed in this workspace must activate and adhere to the appropriate skills according to the following mandatory lifecycle:

### A. When Planning: MANDATORY `writing-plans`
- **Rule**: Whenever designing a new feature, restructuring architecture, or preparing an implementation plan, you **MUST** activate and strictly follow the [`writing-plans`](file:///f:/Unstable%20Wiki/.agents/skills/writing-plans) skill.
- **Standards**:
  - Produce comprehensive, well-structured plans in `implementation_plan.md`.
  - Include architecture decisions, file paths, visual tokens, data contracts, and verification steps.
  - Never write speculative implementation code without an approved plan.

### B. When Designing UI / Frontend: MANDATORY `high-end-visual-design` & `design-taste-frontend`
- **Rule**: Every user interface component, page layout, CSS rule, and styling decision **MUST** activate and adhere to:
  - [`high-end-visual-design`](file:///f:/Unstable%20Wiki/.agents/skills/high-end-visual-design): Agency-tier visual polish, rich dark modes, layered glassmorphism, subtle micro-motion, and bespoke card structures.
  - [`design-taste-frontend`](file:///f:/Unstable%20Wiki/.agents/skills/design-taste-frontend): Anti-slop frontend standards, anti-generic typography, custom palettes, and strict pre-flight audits.
  - [`ui-ux-pro-max`](file:///f:/Unstable%20Wiki/.agents/skills/ui-ux-pro-max): Exhaustive design intelligence, layout rules, and accessibility standards.
- **Visual Identity Standards for Unstable Wiki**:
  - **Display / Retro Typography**: `Minecraft Seven` self-hosted font for titles, 3D extruded headers, stat badges, and button labels.
  - **Body Typography**: Modern, crisp grotesque/geometric sans (Inter, Outfit, or system-ui) for maximum legibility of long-form wiki lore.
  - **Color Palette**: Deep cosmic obsidian background (`#09070F` / `#0D0B18`), rich glass surfaces (`#161228` / `#1F1938`), neon purple/magenta accents (`#C026D3` / `#E040FB` / `#A855F7`), glowing cyan energy highlights (`#00F0FF` / `#38BDF8`), and Minecraft emerald verification accents (`#10B981`).
  - **Panels**: Multi-layer glassmorphism (`.glass-panel`) with subtle borders (`rgba(168, 85, 247, 0.2)`), ambient purple back-glows, and pixel-art iconography.

### C. When Executing a Plan / Writing Code: MANDATORY `full-output-enforcement`
- **Rule**: When executing any implementation step or creating/updating code files, you **MUST** activate and strictly enforce the [`full-output-enforcement`](file:///f:/Unstable%20Wiki/.agents/skills/full-output-enforcement) skill.
- **Standards**:
  - **ZERO PLACEHOLDERS**: Strictly banned are comments like `// TODO: implement`, `/* ...rest of code... */`, `// add your logic here`, or stubbed functions.
  - **COMPLETE CODE GENERATION**: Always output complete, unabridged, production-grade files.
  - **NO TRUNCATION**: Split files across logical modules or components rather than truncating code.

### D. When Engineering & System Designing: MANDATORY `engineering`
- **Rule**: For feature architecture, bug investigation, performance optimization, and system refactoring, activate and follow the [`engineering`](file:///f:/Unstable%20Wiki/.agents/skills/engineering) skill.
- **Standards**:
  - Full pipeline: understand -> research -> design -> test -> implement -> measure -> optimize -> secure -> verify -> complete.
  - Pair with [`codebase-design`](file:///f:/Unstable%20Wiki/.agents/skills/codebase-design) for deep module interfaces and [`domain-modeling`](file:///f:/Unstable%20Wiki/.agents/skills/domain-modeling) for domain concepts and ADRs.

### E. When Implementing Database & Backend: MANDATORY `supabase` & `supabase-postgres-best-practices`
- **Rule**: Any schema design, migration, PostgreSQL query, authentication flow, or RLS policy **MUST** activate:
  - [`supabase`](file:///f:/Unstable%20Wiki/.agents/skills/supabase): Auth, Edge Functions, Realtime, Storage, RLS, CLI, migrations.
  - [`supabase-postgres-best-practices`](file:///f:/Unstable%20Wiki/.agents/skills/supabase-postgres-best-practices): Indexing, query performance, connection pooling, and declarative schemas.
  - [`elysia`](file:///f:/Unstable%20Wiki/.agents/skills/elysia): High-performance, type-safe API endpoints.

---

## 3. Skill Selection Matrix

| Task Category | Mandatory Skills | Optional / Supporting Skills |
|---|---|---|
| **Planning & Specs** | `writing-plans`, `engineering` | `to-spec`, `to-tickets`, `wayfinder` |
| **Frontend UI / UX** | `high-end-visual-design`, `design-taste-frontend` | `ui-ux-pro-max`, `web-design-guidelines`, `shadcn`, `stitch-design-taste` |
| **Code Execution** | `full-output-enforcement` | `tdd`, `diagnosing-bugs` |
| **Backend & Database** | `supabase`, `supabase-postgres-best-practices` | `elysia`, `setup-ts-deep-modules` |
| **Review & Security** | `code-review`, `requesting-code-review` | `research` |

---

## 4. Mandatory Code Push Integration
- As defined in [.agents/rules/codepush.md](file:///f:/Unstable%20Wiki/.agents/rules/codepush.md), every code change must immediately result in a Git commit and push to `origin main`.
