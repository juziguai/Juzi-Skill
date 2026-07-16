# Codex Paths And Lifecycle

## Path Map

| Purpose | Canonical location | Rule |
|---|---|---|
| Codex user root | `C:\Users\juzi\.codex\` | Contains global config, guidance, memories, skills, and plugin cache. |
| Global guidance | `C:\Users\juzi\.codex\AGENTS.md` | Keep stable defaults and links to extended workflows. |
| Long-term memory | `C:\Users\juzi\.codex\memories\` | Auxiliary only; real workspace evidence wins. |
| Native Skills | `C:\Users\juzi\.codex\skills\` | Install verified pure Skills as Junctions. |
| Plugin cache | `C:\Users\juzi\.codex\plugins\cache\` | Never edit directly. |
| Juzi source root | `D:\Tools\AI\Juzi-Skill\` | Create and validate custom capability source here. |
| Juzi plugin marketplace | `D:\Tools\AI\Juzi-Skill\.agents\plugins\marketplace.json` | Manage marketplace-backed plugins here. |
| Direct MCP config | `C:\Users\juzi\.codex\config.toml` under `[mcp_servers.<name>]` | Do not hand-edit plugin-provided MCP cache. |

## Pure Skill Lifecycle

1. Create a user-owned `Juzi-xxx` source folder under `D:\Tools\AI\Juzi-Skill\` with `SKILL.md`; keep the Skill frontmatter `name` and installed identifier normalized as lowercase `juzi-xxx`.
2. Use the standard initializer for new Skills and `quick_validate.py` before installation.
3. Test the intended workflow against a safe artifact or real bounded task.
4. Confirm that any existing destination is a known Junction before replacing it.
5. Create a Junction from `C:\Users\juzi\.codex\skills\juzi-xxx` to the verified source.
6. Start a new Codex task and confirm the Skill is in the available list.

## Plugin Lifecycle

1. Use a plugin only for MCP, Apps, Hooks, or bundled capabilities; place source under `D:\Tools\AI\Juzi-Skill\plugins\Juzi-xxx\`.
2. Keep the plugin identifier lowercase `juzi-xxx`; manage its marketplace entry through the marketplace file, not cache edits.
3. Validate with the plugin validator, update its cachebuster, then reinstall using the configured marketplace.
4. Inspect the generated cache only to verify installed artifacts. Start a new task to verify loaded Skills and tools.

## Loaded-State Rule

`SKILL.md` existing on disk, a Junction existing, or a plugin being installed does not prove the current task has loaded it. Report separately: source valid, installed, and loaded in a new task.
