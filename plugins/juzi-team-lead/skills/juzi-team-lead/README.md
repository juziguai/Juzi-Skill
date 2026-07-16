# Juzi Team Lead Skill

Tool-agnostic PM + sub-agent workflow for multi-file implementation work,
currently adapted for Codex, Claude Code, and Antigravity.

## What this is

This repository defines a shared workflow for splitting non-trivial tasks into
bounded pieces, assigning single-writer leases, and verifying results with
actual files. The host adapter decides how that workflow maps to concrete tools.

## When to use it

Use this skill only after the user explicitly asks for delegation, a team, or
parallel work, and the work involves:

- 3 or more files
- multiple independent changes
- parallelizable work
- module boundaries that can be separated cleanly

Do not use it for:

- a single small edit
- pure research or exploration
- an urgent hotfix that should be applied directly

## Read order

1. `SKILL.md` for the skill entry point.
2. `references/core-workflow.md` for the shared PM/worker workflow.
3. `references/adapters/codex.md` when the host is Codex.
4. `references/adapters/claude-code.md` when the host is Claude Code.
5. `references/adapters/antigravity.md` when the host is Antigravity.
6. `references/adapters/fallback.md` when sub-agents are unavailable.
7. `references/examples.md` when you need task templates or examples.

## Current adapters

This skill is currently adapted for these AI tools:

- Codex
- Claude Code
- Antigravity
- fallback mode when sub-agents are not available

## Codex Integration

The Codex adapter uses the current collaboration tools rather than legacy
multi-agent APIs. The root agent owns `/goal`, `.codex\ACTIVE_TASK.md`, shared
configuration, file leases, and final acceptance. Writers receive disjoint
file leases; scouts and reviewers are read-only. The adapter is designed to
work with `juzi-codex-continuity` for recovery after context compression.

Before dispatching, the Codex adapter enforces a unified health gate for task
state storage, read-only command execution, and collaboration control. The
desktop App is the production host; `codex exec` is for isolated validation,
diagnosis, or explicit automation. They have separate surface notes because
Windows CLI sandbox behavior can differ from the App runner. A failed health
gate stops workers and business-file edits; it never silently escalates sandbox
access.

## Adding a new tool

When adding support for another AI tool, keep the shared workflow unchanged and
add a new adapter file under `references/adapters/`.

1. Copy the structure used by the existing adapter files.
2. Map the new tool's concrete commands or workflow to the shared PM rules.
3. Add the new adapter to the read order in this README and `SKILL.md`.
4. Keep host-specific details out of `references/core-workflow.md`.

## Repository layout

```text
juzi-team-lead/
├── README.md
├── SKILL.md
└── references/
    ├── core-workflow.md
    ├── examples.md
    └── adapters/
        ├── codex.md
        ├── claude-code.md
        ├── antigravity.md
        └── fallback.md
```

## Core rule

- Follow the shared workflow first.
- Use the active host adapter second.
- Do not mix host-specific tool names into the core workflow.
