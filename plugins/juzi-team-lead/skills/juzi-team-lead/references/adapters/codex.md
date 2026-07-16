# Codex Adapter

Use this adapter when the host is Codex with collaboration tools available.

## Activation And Boundaries

- Start team mode only when the user explicitly asks for delegation, a team, or parallel work. A multi-file task or an active `/goal` alone does not authorize spawning agents.
- The root agent is the PM and remains the sole owner of the active Goal, `.codex\ACTIVE_TASK.md`, shared configuration, integration changes, and final acceptance.
- Respect the live concurrency limit. In the current desktop environment there are four slots total, so the root normally has at most three concurrent child agents.

## Capability Mapping

| Abstract role | Current Codex capability | Required constraint |
|---------------|--------------------------|---------------------|
| PM | root agent | Owns routing, state, leases, acceptance, and Goal status. |
| scout / planner | `spawn_agent` | Read-only evidence gathering; no edits. |
| writer | `spawn_agent` | Exact, non-overlapping write lease only. |
| reviewer | `spawn_agent` | Read-only validation of another writer's work. |
| phase continuation | `followup_task` | Only after the PM records PASS and releases the prior lease. |
| clarification | `send_message` | Add context without interrupting an active agent. |
| observability | `list_agents` | Check live slots, owners, and phase progress. |
| stop / containment | `interrupt_agent` | Stop an out-of-scope, conflicting, or stalled agent. |

Roles are expressed in the task name and prompt. Do not use legacy `multi_agent_v1` calls or `agent_type` parameters.

## Fixed Workflow

### 0. Pre-flight

1. Read project guidance, `git status`, relevant diff, and the active `.codex\ACTIVE_TASK.md`.
2. If the user explicitly created a `/goal`, record its objective and status in the task state. Do not create a Goal by inference. For a Goal that requires mutation or commands, create it only after the state and command portions of the health gate pass; read-only planning Goals are the exception.
3. List every file, shared configuration, interface contract, migration, or release file in scope. Record pre-existing user edits as prohibited unless the user explicitly includes them.
4. Choose one mode: direct, read-only fan-out, serial writer pipeline, or isolated writer parallelism.
5. Before dispatching, pass the unified health gate: the task state is writable, a read-only command runs, and `list_agents` returns a usable controller response. If state or command health fails, do not spawn workers, edit business files, or create probe files outside the declared scope; report the environment blocker and stop.
6. If collaboration health alone fails while state and command health pass, record a serial fallback in the task state and let the root agent perform the work. Do not claim that a worker exists until `spawn_agent` returns its identifier and `list_agents` shows it.

### 1. Lease Plan

Before any `spawn_agent`, the root agent fills the task state's team section with:

- mode and phase order;
- each agent's allowed files, prohibited files, read-only context, verification command, and release condition;
- dependencies and the root agent's own write scope.

One file or shared boundary has exactly one writer at a time. The root agent must not edit an active writer's lease.

### 2. Dispatch

- Use `spawn_agent` for bounded work only. Give each agent the problem, allowed files, prohibited files, acceptance conditions, verification command, and required evidence in its final report.
- Parallelize scouts freely when they are read-only. Parallelize writers only when their leases and verification results are independent.
- Do not ask workers to edit `.codex\ACTIVE_TASK.md`, update Goal status, commit, push, or resolve cross-lease conflicts.

### 3. Gate And Handoff

1. On completion, the root agent reads the real diff and compares changed paths with the lease.
2. The root agent runs or reviews the required verification. A separate reviewer is used when a cross-check materially reduces risk.
3. PASS: record evidence, release the lease, then use `followup_task` or spawn the next independent phase.
4. FAIL or scope escape: pause affected work with `interrupt_agent` when needed, preserve user edits, record the conflict, and issue a narrower repair lease.

### 4. Recovery

- After interruption or context compression, read the task state and verify it against the real working tree before dispatching anything.
- If an unclaimed path changed, a user edits a leased file, or an agent needs another file, pause the related lane and re-plan serially. Never overwrite, revert, or attribute changes without evidence.

## Worker Prompt Minimum

Every writer prompt must include these labels:

```text
Role:
Allowed files:
Prohibited files:
Read-only context:
Expected behavior:
Verification:
Lease release evidence:
```

Every scout and reviewer prompt must explicitly say `只读：禁止编辑文件、提交或修改任务状态。`.

## Fallback

If collaboration tools are unavailable or the work cannot be split without lease conflicts, the root agent performs the work serially and records the downgrade in `ACTIVE_TASK.md`.
