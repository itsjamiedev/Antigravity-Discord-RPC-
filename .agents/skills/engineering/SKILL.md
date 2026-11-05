---
name: engineering
description: >-
  Autonomous AI software-engineering system. Covers the full pipeline:
  understand, verify, research, design, test, implement, measure, optimize,
  secure, review, verify, complete. Use when the user wants a feature built,
  a bug fixed, an architecture changed, a system optimized, or anything that
  requires careful, evidence-based engineering rather than blind code generation.
---

# Engineering Skill

> **NEVER blindly modify the repository.**
> Understand first. Question everything. Prove the design. Measure everything.
> Only then call the task complete.

---

## Proportionality Rule

Scale the depth of each phase to the complexity of the task.

    TRIVIAL  (typo, rename, copy change)
             -> Phases 0, 1, 20, 28 only.

    SMALL    (add a field, fix a single bug, add a utility function)
             -> Phases 0-6, 14, 18, 20, 24, 28.

    MEDIUM   (new feature, refactor a module, add an API endpoint)
             -> All phases. Phases 9-11 scoped to relevant subsystem only.

    LARGE    (new subsystem, architecture change, migration, security overhaul)
             -> All phases. Full depth. No shortcuts.

When in doubt, prefer MORE coverage. It is always safe to run an extra phase.
Phases may loop. If Phase 14 reveals the Phase 12 architecture is flawed, loop
back to Phase 3. Engineering is iterative.

---

## Canvas -- Operational Definition

    SMALL task   -> write information inline in your chat response.
    MEDIUM task  -> create/update implementation_plan.md before coding.
    LARGE task   -> create implementation_plan.md, get user approval, create
                    task.md to track progress, walkthrough.md at end.

Rule: DISCOVER AUTOMATICALLY -> ASK ONLY WHAT CANNOT BE DETERMINED.

Inspect the repository first. If it already tells you Redis is in use, do NOT
ask "Which caching system are you using?"

Never invent critical requirements silently. If a decision cannot be inferred,
ask the user.

---

## Phase 0 -- Skill Dependency Check

This phase runs BEFORE Phase 1. It is mandatory and cannot be skipped.

Scan package.json / pom.xml / build.gradle, imports, config files, and file
extensions in the affected area. Match against this table:

| Signal Found | Load Skill |
|---|---|
| @supabase/ imports, SUPABASE_URL, SUPABASE_ANON_KEY | supabase |
| react / next in package.json, .tsx / .jsx / next.config.* | vercel-react-best-practices |
| Modifying .tsx / .jsx / .css / .scss / UI component files | design-taste-frontend |
| components.json, imports from @/components/ui | shadcn |
| elysia in package.json, import { Elysia } | elysiajs |
| Raw SQL, .sql files, supabase/migrations/ | supabase-postgres-best-practices |
| .java files, paper-api / bukkit / spigot / purpur in pom.xml or build.gradle | mc-plugins |
| Task is purely additive -- no existing implementation | tdd |
| User reported something broken, throwing, or failing | diagnosing-bugs |
| Marketing page, landing page, or premium visual design required | high-end-visual-design |
| Requirements are vague, contradictory, or underspecified | writing-plans |

How to execute:
1. Run view_file on the build manifest and grep_search for the signals.
2. Build a Skill Load List -- every skill whose signal was detected.
3. Read each required skill SKILL.md before continuing.
4. Display result inline:

    SKILL DEPENDENCY CHECK
    --------------------------------
    Detected: Paper API, Java plugin
    Loading:  mc-plugins
    Status:   READY -- proceeding to Phase 1

Skills are additive. Load ALL that match -- they do not conflict.

---

## Phase 1 -- Requirements Engineering

Convert the natural-language request into an engineering specification.

Determine:
- What is being requested?
- Why is it being requested?
- What existing behavior is involved?
- What must change?
- What must NOT change? (breaking-change constraints)
- Functional requirements
- Non-functional requirements: performance, security, reliability, scalability, compatibility

Identify ambiguity. Do not silently invent critical requirements.

Separate:
    FUNCTIONAL REQUIREMENT    <- what the system must do
    IMPLEMENTATION DETAIL     <- how it should be done (agent decides unless specified)
    CONSTRAINT                <- what cannot be violated
    ASSUMPTION                <- flagged to user if critical

Do not invent:
- Performance targets not mentioned
- Security requirements beyond good practice
- Compatibility requirements not stated
- Features not requested

---

## Phase 2 -- Full Repository Reconnaissance

Tools: list_dir, view_file, grep_search

Before implementation, inspect the codebase.

Analyze: files, directories, modules, dependencies, imports, exports, functions,
classes, interfaces, APIs, database schemas, configuration, environment variables,
build system, tests, CI/CD, infrastructure.

Start broad (list_dir root), then narrow to affected areas. Use grep_search to
find existing implementations before assuming none exists.

The goal: "What actually exists?" -- not "What do I assume exists?"

---

## Phase 3 -- Architecture Discovery

Tools: view_file, grep_search

Build an explicit internal model of the system. Write it out -- do not keep it
implicit.

    Example: Client -> API -> Service Layer -> Business Logic -> Database

Identify: components, services, boundaries, data flow, control flow, external
services, databases, caches, queues, workers, auth systems.

---

## Phase 4 -- Dependency and Relationship Graph

Tools: grep_search (imports, requires, exports)

Create a relationship graph:

    File->File, Function->Function, Module->Module, Service->Service,
    API->Service, Service->Database, Event->Consumer, Config->Component

Use this graph to answer: "If I modify X, what could break?"

Perform impact analysis before modifying any code.

---

## Phase 5 -- Current-State Verification (Baseline)

Tools: run_command (build, test, lint, benchmark scripts)

Before any changes, establish a baseline. Run what is applicable:
- Build
- Type checking
- Unit tests / integration tests
- Lint / static analysis
- Benchmarks

    BASELINE
    Tests:       428/428 PASS
    Build:       PASS
    Typecheck:   PASS
    Latency:     18.4 ms (p99)
    Memory:      412 MB

If the baseline is already broken before your change, report this to the user
immediately and do NOT proceed until resolved.

---

## Phase 6 -- Code Quality and Logic Audit

Tools: view_file, grep_search

Analyze relevant existing implementation for:
- Bugs, logic errors, race conditions
- Duplicated logic, poor abstractions, incorrect assumptions
- Inefficient algorithms, memory leaks, N+1 queries
- Security problems

IMPORTANT: Do NOT automatically fix unrelated problems.

    REQUIRED CHANGE        <- what the task demands
    UNRELATED IMPROVEMENT  <- flag for later, do not touch now

Avoid scope creep.

---

## Phase 7 -- Architecture Smell Detection

Tools: view_file, grep_search

Ask: "Is this logic living in the correct place?"

Detect:
- Client doing server-side work, or vice versa
- Database doing inappropriate application logic
- Duplicated business logic across boundaries
- Excessive API layers or unnecessary abstraction
- Repeated expensive computation (should be cached)
- Wrong data ownership / bad service boundaries
- Overengineering or underengineering

---

## Phase 8 -- Technology Evaluation

Tools: view_file, grep_search

Question whether the existing technology is appropriate.

Do NOT blindly introduce:
- Microservices
- Event-driven architecture
- Message queues
- Caches
- Abstraction layers
- Frameworks or ORMs

unless they provide a concrete, measurable benefit for THIS system.

Select technology based on requirements + evidence.

---

## Phase 9 -- External Research Engine

Tools: search_web, read_url_content

Before major architectural or algorithmic changes, research the problem.

Search priority:
1. Official documentation (Very High)
2. Technical specifications (High)
3. Mature open-source implementations (High)
4. Independent benchmarks (Medium/High)
5. Technical articles (Medium)
6. Forums / Stack Overflow (Low)

Cross-reference at least two independent sources for any critical technical claim.

---

## Phase 10 -- Solution Comparison

Generate 2-4 viable solutions. Compare:

    Performance / Memory / Complexity / Security / Reliability /
    Scalability / Compatibility / Maintainability / Cost

Select the solution best suited to THIS system. Fastest != automatically best.
Show the comparison before implementing.

---

## Phase 11 -- Algorithm and Data Structure Analysis

For algorithmic work, analyze:
- Time complexity (best / average / worst case)
- Space complexity
- Input characteristics and data size
- Memory allocation patterns, cache locality
- Concurrency and parallelization potential

Theoretical complexity is not enough. Benchmark against the actual workload
whenever possible.

---

## Phase 12 -- Architecture Design

Output goes to canvas (implementation_plan.md for MEDIUM/LARGE tasks).

Before implementation, design and show the proposed architecture. Define:
- Modules, services, interfaces, data structures, APIs
- Data flow and control flow
- Error handling strategy
- Configuration approach
- Compatibility strategy, migration strategy, rollback strategy

For MEDIUM/LARGE tasks: the user approves this design BEFORE any code is written.

---

## Phase 13 -- Impact Analysis

Using the dependency graph from Phase 4, analyze:
- What will break if X changes?
- What public/internal APIs are affected?
- What database schemas, serialization formats, or protocols are affected?

Classify each change: LOW RISK / MEDIUM RISK / HIGH RISK

High-risk changes require user approval (Phase 19).

---

## Phase 14 -- Security Engineering

Security operates BEFORE, DURING, and AFTER implementation -- not as a final step.

Mandatory considerations:

| Category | Check |
|---|---|
| Secrets | No API keys, tokens, passwords, private keys in code or config |
| Authentication | Verify identity correctly; use getUser() not getSession() server-side |
| Authorization | Least-privilege; verify permissions before every sensitive operation |
| Input validation | Validate and sanitize ALL untrusted input |
| Injection | SQL injection, command injection, path traversal |
| Network | SSRF, unsafe redirects, unvalidated URLs |
| Dependencies | Check CVEs before adding packages |
| Deserialization | Validate before deserializing untrusted data |
| Rate limiting | Protect public-facing endpoints |
| Logging | Never log passwords, tokens, or PII |
| Permissions | No unnecessary privilege escalation |

Never commit:
    API_KEY=real_key
    DATABASE_PASSWORD=real_password
    TOKEN=real_token
    PRIVATE_KEY=...

Use environment variables or a secret manager instead.

If an optimization introduces a serious security regression: REJECT IT.

If security analysis reveals the Phase 12 architecture is flawed, loop back to
Phase 3 before continuing.

---

## Phase 15 -- Performance Strategy

Performance optimization must be evidence-based.

    BASELINE -> IMPLEMENT -> BENCHMARK -> FIND BOTTLENECK -> OPTIMIZE -> BENCHMARK AGAIN

Tools: run_command (benchmark scripts, profilers)

Measure: CPU, memory, latency, throughput, allocations, I/O, network, DB queries,
cache performance.

Never claim an optimization without evidence when measurement is possible.

---

## Phase 16 -- Memory Analysis

Tools: run_command (heap snapshots, memory profilers)

Inspect:
- Heap usage, peak memory, allocations, object lifetime
- Buffer usage, cache growth, memory leaks
- Garbage collection pressure

    Gate example:
      Before: 412 MB
      After:  1.7 GB  -> REJECT / INVESTIGATE

A feature working correctly is not enough if it destroys memory usage.

---

## Phase 17 -- Cost and Infrastructure Evaluation

Evaluate: compute, database usage, function invocations, network traffic,
storage, third-party API costs, operational complexity.

A solution that is 2% faster but dramatically more expensive is not
automatically the correct solution.

---

## Phase 18 -- Test-Driven Development

Tools: run_command, view_file, write_to_file, multi_replace_file_content

    Requirement -> Write Test -> Test Fails -> Implement ->
    Test Passes -> Refactor -> Repeat

Test coverage must target meaningful behavior:
- Normal behavior
- Edge cases
- Invalid input
- Error handling
- Integration
- Regression
- Security
- Performance (where applicable)

Write the failing test FIRST. Do not start implementation until a red test
exercises the correct seam.

Do not blindly create tests for every trivial line. Target meaningful behavior
and failure modes.

---

## Phase 19 -- Human Approval Gates

Before dangerous operations, STOP and explicitly ask for user approval:
- Data deletion or destructive database migration
- Production deployment
- Authentication / authorization changes
- Major API breaking changes
- Major architecture rewrites
- Security-sensitive modifications
- Large-scale migrations

The agent must never have unlimited authority over high-risk operations.

---

## Phase 20 -- Incremental Implementation

Tools: write_to_file, multi_replace_file_content, replace_file_content, run_command

Never blindly rewrite huge portions of the repository.

    Change -> Test -> Verify -> Next Change

If something fails:
    STOP -> Diagnose -> Fix -> Re-test

Do NOT stack additional changes on top of an unknown broken state.

Code quality mandates during implementation:
- Functions should do one thing. If naming requires "and", split it.
- Name things for what they are, not how they work internally.
- No magic values -- use named constants.
- No dead code. No commented-out code unless it serves as documentation.
- Handle all four states in every feature: loading, success, error, empty.
- Predictable error handling -- never silently swallow exceptions.
- Consistent with existing project conventions.
- Strong typing where the language supports it.
- Separation of concerns -- IO, business logic, and presentation in separate layers.
- No premature abstraction -- generalize when there are 3+ concrete use cases.

---

## Phase 21 -- Logic Verification Engine

Verify that the logic itself is correct -- do not rely exclusively on tests.

Analyze: preconditions, postconditions, invariants, state transitions, control
flow, data flow, failure states, boundary conditions, race conditions,
impossible states.

For critical logic, reason about properties:
    decode(encode(data)) == data

The goal is to verify the underlying logic, not merely make tests pass.

---

## Phase 22 -- Migration Engine

When architecture must change, do NOT immediately destroy the old system.

    Current System -> New Implementation -> Run Both ->
    Compare Results -> Validate -> Shift Traffic -> Remove Old System

For high-risk migrations, use compatibility layers. If old result != new result:
    STOP -> INVESTIGATE -> DO NOT MIGRATE

---

## Phase 23 -- Dependency Security and Quality

Tools: search_web, view_file

When adding a dependency, inspect:
- Maintenance status, security history, license, version
- Transitive dependencies, bundle size, performance
- Compatibility, community adoption

Ask: "Do we actually need this dependency?" Avoid dependency bloat.

---

## Phase 24 -- Regression Analysis

Tools: run_command (build, test, benchmark)

Compare BEFORE vs AFTER:

    Tests:    428/428 -> 447/447  PASS       (+19 new)
    Latency:  18.4ms  -> 11.2ms   IMPROVED   (-39%)
    Memory:   412MB   -> 419MB    ACCEPTABLE (+1.7%)
    Security: PASS
    Breaking: NONE

---

## Phase 25 -- Documentation Engine

When architecture or behavior changes, update relevant documentation:
- README, API docs, architecture docs
- Configuration docs, migration guides, developer notes
- Inline comments for non-obvious logic

Do NOT modify irrelevant documentation.

This project brain protocol:
- Update the modified subsystem CONTEXT.md
- Sync schema changes to docs/DATABASE.md
- Record API changes in docs/ARCHITECTURE.md
- Create an ADR in docs/adr/ for significant decisions

---

## Phase 26 -- Engineering Decision Records (EDR)

For major decisions, record in the canvas output or docs/adr/:

    DECISION:     What was chosen
    WHY:          Evidence and reasoning
    TRADEOFFS:    What you give up
    ALTERNATIVES: Options rejected and why
    BENCHMARKS:   Performance/cost data
    SECURITY:     Security implications
    RESULT:       Final selection

---

## Phase 27 -- Final Senior Engineer Review

Before declaring complete, independently review:

| Dimension | Question |
|---|---|
| CORRECTNESS | Does this actually solve the problem? |
| ARCHITECTURE | Does it fit the existing system? |
| ALGORITHMS | Appropriate for the actual workload? |
| DATA STRUCTS | Appropriate for the data characteristics? |
| SECURITY | Did the attack surface increase? |
| PERFORMANCE | Did performance improve or remain acceptable? |
| MEMORY | Did memory regress? |
| COMPATIBILITY | Did anything existing break? |
| RELIABILITY | What happens when dependencies fail? |
| MAINTAINABILITY | Can another engineer understand this later? |
| TESTING | Are important behaviors covered? |

---

## Phase 28 -- Final Engineering Gate

The agent CANNOT declare success until all required gates pass.

    IMPLEMENTATION
          |
    TESTS PASS?       -> NO -> STOP, diagnose, fix, restart gate
          | YES
    SECURITY PASS?    -> NO -> STOP
          | YES
    PERFORMANCE OK?   -> NO -> STOP
          | YES
    REGRESSION OK?    -> NO -> STOP
          | YES
    FINAL REVIEW
          |
    COMPLETE

Never declare success while a required validation gate is failing.
Never claim a test was run when it was not.
If something cannot be verified, explicitly state that it could not be
verified and why.

---

## Phase 29 -- Final Canvas Report

    +======================================+
    |       ENGINEERING TASK COMPLETE      |
    +======================================+
    | Feature:     <name>                  |
    | Status:      COMPLETE                |
    +--------------------------------------+
    | Tests:       447/447 PASS            |
    | Build:       PASS                    |
    | Security:    PASS                    |
    | Regression:  PASS                    |
    +--------------------------------------+
    | Latency:     -39%                    |
    | Throughput:  +41%                    |
    | Memory:      +1.7%                   |
    +--------------------------------------+
    | Breaking Changes: NONE               |
    | Risk:             LOW                |
    +--------------------------------------+
    | Files Changed:   <list>              |
    | Files Created:   <list>              |
    | Tradeoffs:       <summary>           |
    | Remaining Risks: <summary>           |
    +======================================+

Update walkthrough.md for MEDIUM/LARGE tasks.

---

## Complete Pipeline (Quick Reference)

    USER REQUEST
         |
    PHASE 0:  SKILL DEPENDENCY CHECK
         |
    PROPORTIONALITY CHECK
         |
    PHASE 1:  REQUIREMENTS ENGINEERING
         |
    PHASE 2:  REPOSITORY RECONNAISSANCE
         |
    PHASE 3:  ARCHITECTURE DISCOVERY
         |
    PHASE 4:  DEPENDENCY GRAPH
         |
    PHASE 5:  BASELINE (build + tests)
         |
    PHASE 6:  CODE QUALITY AUDIT
         |
    PHASE 7:  ARCHITECTURE SMELL CHECK
         |
    PHASE 8:  TECHNOLOGY EVALUATION
         |
    PHASE 9:  EXTERNAL RESEARCH
         |
    PHASE 10: SOLUTION COMPARISON
         |
    PHASE 11: ALGORITHM ANALYSIS
         |
    PHASE 12: ARCHITECTURE DESIGN -> user approval (MEDIUM/LARGE)
         |
    PHASE 13: IMPACT ANALYSIS
         |
    PHASE 14: SECURITY THREAT MODEL  <- may loop back to Phase 3
         |
    PHASE 15: PERFORMANCE STRATEGY
         |
    PHASE 16: MEMORY ANALYSIS
         |
    PHASE 17: COST EVALUATION
         |
    PHASE 18: TDD
         |
    PHASE 19: HUMAN APPROVAL (HIGH RISK only)
         |
    PHASE 20: INCREMENTAL IMPLEMENTATION
         |
    PHASE 21: LOGIC VERIFICATION
         |
    PHASE 22: MIGRATION (if applicable)
         |
    PHASE 23: DEPENDENCY SECURITY
         |
    PHASE 24: REGRESSION ANALYSIS
         |
    PHASE 25: DOCUMENTATION UPDATE
         |
    PHASE 26: ENGINEERING DECISION RECORD
         |
    PHASE 27: FINAL SENIOR REVIEW
         |
    PHASE 28: FINAL ENGINEERING GATE
         |
    PHASE 29: CANVAS REPORT (+ walkthrough.md)
         |
    DONE

---

## Core Principles

1.  NEVER blindly modify the repository.
2.  Understand the existing system before changing it.
3.  Ask only questions that cannot be answered through repository analysis.
4.  Research significant technical decisions.
5.  Compare multiple viable approaches -- fastest != best.
6.  Prefer evidence over assumptions.
7.  Use algorithms appropriate to the actual workload.
8.  Verify logic, not merely syntax.
9.  Write the failing test first (TDD).
10. Make changes incrementally.
11. Test continuously.
12. Measure performance before and after optimization.
13. Treat memory as a first-class engineering constraint.
14. Treat security as a continuous process, not a final checkbox.
15. Detect architectural problems, not just coding bugs.
16. Do not blindly introduce microservices, caches, queues, or ORMs.
17. Avoid premature abstraction -- generalize at 3+ concrete use cases.
18. Preserve backwards compatibility. Maintain rollback paths.
19. Require human approval for high-risk operations.
20. Document major engineering decisions as EDRs.
21. Never claim an optimization without evidence when measurement is possible.
22. Never declare success while required validation gates are failing.
23. Never claim a test was run when it was not.
24. Handle all four states: loading, success, error, empty.
25. Names should reveal intent. Functions should do one thing.
26. Never log sensitive data -- passwords, tokens, PII.
27. Scale phase depth to task size -- the Proportionality Rule.
28. Phases are not a strict waterfall -- loop back when new information demands it.
29. NEVER use AI generative image models for project images or UI graphics.
30. ALWAYS compile and build software that can be compiled to verify build integrity.
31. ALWAYS follow the dual-remote push protocol: monorepo origin, then standalone remotes.
