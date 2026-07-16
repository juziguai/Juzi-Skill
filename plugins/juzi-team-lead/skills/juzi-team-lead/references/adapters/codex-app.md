# Codex Desktop App Surface

Read this after `codex.md` when running inside the Codex desktop App.

## Health Gate

1. Run one read-only command in the target workspace, such as `Get-Location` and `git status --short`.
2. Ensure `.codex\ACTIVE_TASK.md` exists or create it inside the declared task scope before any worker dispatch.
3. Call `list_agents` before dispatch. A successful controller response proves that the App collaboration surface is reachable, but every writer still requires a successful `spawn_agent` response and a visible entry in `list_agents`.

## Surface Rules

- Keep the reasoning strength selected by the user in the App. Do not change it from the task workflow.
- Use App file-editing tools for the task state and scoped code changes. Do not use a probe file to test writability.
- If command or state health fails, stop before editing business files. If only collaboration health fails, record the serial fallback and proceed only with the root agent.
- The App's command runner and collaboration controller are separate checks; success in one does not prove the other.
