# Codex Paths And Lifecycle

## Path Map

| Purpose | Canonical location | Rule |
|---|---|---|
| Codex user root | `C:\Users\juzi\.codex\` | Contains global config, guidance, memories, skills, and plugin cache. |
| Global guidance | `C:\Users\juzi\.codex\AGENTS.md` | Keep stable defaults and links to extended workflows. |
| Long-term memory | `C:\Users\juzi\.codex\memories\` | Auxiliary only; real workspace evidence wins. |
| Native Skills | `C:\Users\juzi\.codex\skills\` | Prefer verified Junctions; use a hash-verified real copy when the current loader rejects Junction traversal. |
| Plugin cache | `C:\Users\juzi\.codex\plugins\cache\` | Never edit directly. |
| Juzi source root | `D:\Tools\AI\Juzi-Skill\` | Create and validate custom capability source here. |
| Juzi plugin marketplace | `D:\Tools\AI\Juzi-Skill\.agents\plugins\marketplace.json` | Manage marketplace-backed plugins here. |
| Direct MCP config | `C:\Users\juzi\.codex\config.toml` under `[mcp_servers.<name>]` | Do not hand-edit plugin-provided MCP cache. |

## Pure Skill Lifecycle

1. Create a user-owned `Juzi-xxx` source folder under `D:\Tools\AI\Juzi-Skill\` with `SKILL.md`; keep the Skill frontmatter `name` and installed identifier normalized as lowercase `juzi-xxx`.
2. Use the standard initializer for new Skills and `quick_validate.py` before installation.
3. Test the intended workflow against a safe artifact or real bounded task.
4. Back up any existing destination outside the active Skill tree and confirm whether it is a known Junction or a real directory; do not overwrite it in place.
5. Try one canary Junction from `C:\Users\juzi\.codex\skills\juzi-xxx` to the verified source, then start a new Codex task and confirm the Skill plus its updated description are in the available list.
6. If the loader omits the Skill or reports an untrusted mount point, quarantine the Junction, restore the backup, and stop further Junction migration.
7. In that environment, install a real copy from the canonical source and verify the complete relative file list plus SHA-256 values. Keep editing only the canonical source and deliberately resynchronize future updates.
8. Report source validation, installation mode/hash verification, and new-task loading as separate results.

## Plugin Lifecycle

1. Use a plugin only for MCP, Apps, Hooks, or bundled capabilities; place source under `D:\Tools\AI\Juzi-Skill\plugins\Juzi-xxx\`.
2. Keep the plugin identifier lowercase `juzi-xxx`; manage its marketplace entry through the marketplace file, not cache edits.
3. Validate with the plugin validator, update its cachebuster, then reinstall using the configured marketplace.
4. Inspect the generated cache only to verify installed artifacts. Start a new task to verify loaded Skills and tools.

## Loaded-State Rule

`SKILL.md` existing on disk, a Junction or copied directory existing, or a plugin being installed does not prove the current task has loaded it. Report separately: source valid, installation mode/hash valid, and loaded in a new task.
