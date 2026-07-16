---
name: juzi-codex-skill-lifecycle
description: Use when creating, updating, validating, installing, or diagnosing Juzi custom Codex Skills, plugins, MCP configuration, or local capability loading. Enforces canonical source paths, validation-before-installation, Junction installs for pure Skills, plugin cache safety, and new-session loaded-state verification.
---

# Juzi Codex Skill Lifecycle

## Use This Workflow

1. Read [references/codex-paths-and-lifecycle.md](references/codex-paths-and-lifecycle.md) before creating or installing a capability.
2. Classify the capability: use a pure Skill by default; use a plugin only when MCP, App, Hook, or a multi-Skill bundle is actually needed.
3. Build and validate in the Juzi source root. Do not edit installed cache directories.
4. Validate structure and target behavior before installation.
5. Install a pure Skill as a Junction; use the plugin update/reinstall flow for plugins.
6. In a new Codex task, verify that the capability is actually loaded. Files on disk alone are not proof.

## Source And Installation Paths

- Juzi source root: `D:\Tools\AI\Juzi-Skill\`
- Native Skill destination: `C:\Users\juzi\.codex\skills\`
- Plugin cache, read-only for diagnosis: `C:\Users\juzi\.codex\plugins\cache\`
- Direct MCP configuration: `C:\Users\juzi\.codex\config.toml`

## Naming

Use the `juzi-` prefix for normalized Skill and plugin identifiers. For new user-owned source folders, preserve the human-facing `Juzi-xxx` convention where practical; the `name` field, plugin identifier, and installed Skill key remain Codex-compatible lowercase `juzi-xxx`. On case-insensitive Windows volumes, an existing lowercase path is technically equivalent and does not require a risky casing-only migration.
