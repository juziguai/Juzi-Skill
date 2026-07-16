---
name: juzi-team-lead
description: "Tool-agnostic PM + sub-agent workflow for multi-file implementation tasks. Use only when the user explicitly asks for delegation, parallel work, or team coordination."
metadata:
  trigger: Multi-file implementation, refactoring, feature development with 3+ files
  author: juzi
---

# Juzi Team Lead Skill

## Read Order

1. Read `references/core-workflow.md` for the shared workflow.
2. For normal Codex work, treat the desktop App as the primary host: read `references/adapters/codex.md`, then `references/adapters/codex-app.md`.
3. Read `references/adapters/codex-cli.md` only for explicit `codex exec` automation, isolated validation, or CLI diagnosis.
4. Read `references/adapters/claude-code.md` when the host is Claude Code.
5. Read `references/adapters/antigravity.md` when the host is Antigravity.
6. Read `references/adapters/fallback.md` when sub-agents are unavailable.
7. Read `references/examples.md` only when you need task templates or examples.

## Rule

- Follow the core workflow first.
- Use the active host adapter second.
- Do not mix host-specific tool names into the core workflow.
