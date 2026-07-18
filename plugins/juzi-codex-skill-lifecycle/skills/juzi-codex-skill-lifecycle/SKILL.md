---
name: juzi-codex-skill-lifecycle
description: Use when creating, updating, validating, installing, or diagnosing Juzi custom Codex Skills, plugins, MCP configuration, or local capability loading. Enforces canonical sources, validation-before-installation, verified Junction-or-copy installs, plugin cache safety, and new-task loaded-state proof.
---

# Juzi Codex Skill Lifecycle

## Use This Workflow

1. Read [references/codex-paths-and-lifecycle.md](references/codex-paths-and-lifecycle.md) before creating or installing a capability.
2. Classify the capability: use a pure Skill by default; use a plugin only when MCP, App, Hook, or a multi-Skill bundle is actually needed.
3. Build and validate in the Juzi source root. Do not edit installed cache directories.
4. Validate structure and target behavior before installation.
5. Install a pure Skill with the verified installation gate below: prefer a Junction only when the current Codex loader proves it can load that target; otherwise use a hash-verified real copy while keeping the Juzi source canonical. Use the plugin update/reinstall flow for plugins.
6. In a new Codex task, verify that the capability is actually loaded. Files on disk alone are not proof.

## Pure Skill Installation Gate

1. Back up the existing installed directory outside the active `skills` tree; never delete the only known-good copy.
2. If using a Junction, migrate one canary Skill first. Verify Junction metadata, then start a new Codex task and confirm that the Skill and its new description are present.
3. If the loader omits the Skill, reports an untrusted mount point, or cannot traverse the Junction, quarantine the Junction and restore the original directory immediately. Do not migrate the remaining Skills.
4. Fallback installation is a real directory copied from the validated canonical source. Compare the relative file list and SHA-256 values after copying; future edits still occur only in the canonical source and must be resynchronized deliberately.
5. Report three states separately: source valid, installed mode/hash valid, and loaded in a new task. A successful file operation proves only the second state.

## Source And Installation Paths

- Juzi source root: `D:\Tools\AI\Juzi-Skill\`
- Native Skill destination: `C:\Users\juzi\.codex\skills\`
- Plugin cache, read-only for diagnosis: `C:\Users\juzi\.codex\plugins\cache\`
- Direct MCP configuration: `C:\Users\juzi\.codex\config.toml`

## Naming

Use the `juzi-` prefix for normalized Skill and plugin identifiers. For new user-owned source folders, preserve the human-facing `Juzi-xxx` convention where practical; the `name` field, plugin identifier, and installed Skill key remain Codex-compatible lowercase `juzi-xxx`. On case-insensitive Windows volumes, an existing lowercase path is technically equivalent and does not require a risky casing-only migration.
