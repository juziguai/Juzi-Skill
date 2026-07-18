# CodexElevation Protocol

## Preconditions

- Import `CodexElevation`; use the user `juzi` separated administrator token through normal Windows UAC only.
- Never request, store, or reuse passwords. Never use `runas /savecred`, auto-logon, scheduled tasks, services, startup entries, or a persistent administrator session to bypass approval.
- Store request, result, backup, and reviewed script artifacts only under `C:\Users\juzi\AppData\Local\Codex\Elevation\`.
- Classify the action as read-only, reversible, or destructive. `stop`, `restart`, `kill`, service replacement, deletion and route/port changes are destructive.
- Before a destructive production action, record the user impact, protected baseline, standby evidence, stop condition, rollback/rescue command and remaining one-time action budget.
- Test the reviewed script outside production. Inject stop/start/cleanup/wait failures, UAC cancellation, partial execution, stale PID, occupied port and unavailable logging/telemetry. An untested failure path may not be exercised for the first time against production.

## One-Time Request

1. Write the administrator action as a reviewable `.ps1`; use terminating errors, return nonzero on unmet postconditions, preserve stdout/stderr, and keep cleanup in explicit `finally` paths without hiding the original failure.
2. Create a request with `New-CodexElevationRequest`; it must lock the script's absolute path, arguments, and SHA-256.
3. Explain purpose, system scope, impact, and the one-time approval code. Wait for explicit user confirmation.
4. Invoke the request with `Invoke-CodexElevationRequest` exactly once. Execution, failure, cancellation, or UAC denial consumes the code.
5. If the script changes after approval, discard the old request and create a new one.
6. A restart/stop authorization does not permit an automatic second attempt. Re-query real state and obtain a new authorization when required by the workspace rules.

## Series Authorization

Use only when the user explicitly authorizes a series. First state the series objective, allowed system scope, and termination condition. Within that boundary, create separate hash-locked requests as needed; UAC, expiry, and non-replay guarantees remain mandatory. Combine only dependent, clearly scoped substeps to reduce UAC prompts; never expand a script's responsibility merely for convenience.

End the series when the objective is accepted, the user revokes it, work stops, the conversation changes topic, or system scope must expand. Reconfirm separately for sensitive boundaries listed in `SKILL.md`.

## Failure And Acceptance

- After partial failure, inspect real system state and result receipts before repairing anything.
- Protect the last usable service. Do not kill or clean a user-restored Runtime/PID while trying to make the automation look tidy.
- Exit code `0` is not acceptance. From a new non-admin process verify the relevant service, parent/child process tree, listening ports, Runtime/health API, recent error logs and a real smoke request, then check `Get-CodexElevationRequest` for pending work.
- If verification fails, restore the protected baseline first. Preserve the receipt and error evidence; do not expand system scope or repeat destructive actions until the failure is understood.
- Historical scripts such as `Repair-UserDevEnvironment.ps1`, `Repair-MachineDevEnvironment.ps1`, `Install-DotNet10Sdk.ps1`, and `Dedupe-DotNetMachinePath.ps1` must still be rechecked for current file hash and machine state.
