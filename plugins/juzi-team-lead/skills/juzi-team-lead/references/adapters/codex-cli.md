# Codex CLI Surface

Read this after `codex.md` when running through `codex exec`.

## Health Gate

1. Before team dispatch, run one read-only command in the target repository and confirm it returns output.
2. Ensure the `.codex` parent directory and `ACTIVE_TASK.md` can be created within the declared scope. Do not assume an edit tool can create a missing parent directory under every Windows sandbox.
3. Confirm collaboration control with `list_agents`; after each `spawn_agent`, require a returned identifier and visible live Agent before treating a lease as active.
4. Treat the default `codex exec` sandbox as read-only unless the session header proves otherwise. A repair, implementation, or other mutating `/goal` must not be created until state and command health pass; a read-only planning Goal may be created directly.
5. When the CLI header already says `sandbox: read-only` for a mutating task, stop immediately and request a user-selected writable sandbox. Do not spend tokens reading Skills, memory, project files, or state through shell commands merely to rediscover the declared limitation.

## Windows Sandbox Policy

- A `workspace-write` run can fail before command execution with Windows process-creation errors such as `CreateProcessAsUserW failed: 5`. This is an environment blocker, not a reason to bypass the lease protocol.
- When `codex exec` starts in `read-only`, use it only for investigation, review, or planning. Report that a mutating task needs a user-selected writable sandbox; do not create a stuck execution Goal.
- If state or command health fails, report the exact blocker and stop. Do not spawn writers, modify business files, or create probe files outside the declared scope.
- Never automatically switch to `danger-full-access`. It may be used only when the user explicitly authorizes a disposable, isolated validation repository; record that choice in the task state and do not generalize it to production workspaces.
- If collaboration control alone fails while state and commands work, use the documented serial fallback and say that no sub-agents were launched.
