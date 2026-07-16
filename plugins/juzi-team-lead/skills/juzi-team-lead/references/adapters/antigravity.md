# Antigravity Adapter

Use this adapter when the host is Antigravity.

## Capability Mapping

| Abstract role | Antigravity capability |
|---------------|------------------------|
| worker | `self` subagent (read/write/run command) |
| reviewer | `research` subagent (read-only research/explorer) or PM |
| planner | PM on planning mode (uses `implementation_plan.md` and `task.md`) |
| task tracking | local `task.md` in the artifacts directory |
| messaging | `send_message` tool |
| stop | `manage_subagents` tool with `Action: "kill"` |

## Workflow Notes

- **Task Isolation**: Use `self` subagents for implementing disjoint write tasks. When spawning subagents via `invoke_subagent`, prefer `workspace: "share"` to share the underlying repository directory, which is optimal for lightweight branch-free execution. Use `workspace: "branch"` only if deep isolation or independent git branches are required.
- **Verification**: Never let a worker verify its own output. Reviewers (`research` subagents or the PM) must inspect changed files directly.
- **Coordination**: PM coordinates all communication and holds the final task tracking (`task.md`). Keep worker context focused on their specific write scope.
- **Graceful Downgrade**: If subagents are not supported or execution fails, downgrade to direct execution in the main thread (refer to `fallback.md`).
