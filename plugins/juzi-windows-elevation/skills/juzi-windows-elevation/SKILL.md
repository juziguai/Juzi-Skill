---
name: juzi-windows-elevation
description: Use when a Windows task requires administrator privileges, UAC approval, production service control, system configuration changes, or verification of a CodexElevation request. Enforces pre-production failure tests, protected baselines, hash-locked one-time elevation, and real non-admin chain verification.
---

# Juzi Windows Elevation

## Use This Workflow

1. Determine whether the task can finish as the normal user. Do not request elevation for convenience.
2. Read [references/elevation-protocol.md](references/elevation-protocol.md) before creating or executing any elevation request.
3. Classify every administrator action as read-only, reversible, or destructive. `stop`, `restart`, `kill`, service replacement, deletion and route/port changes are destructive.
4. For production-connected actions, record the protected baseline, user impact, standby evidence, stop condition, rollback/rescue path and one-time destructive-action budget. A user-restored Runtime/PID is protected until a verified replacement exists.
5. Prove the reviewed `.ps1` outside production, including stop/start/cleanup/wait failures, UAC cancellation and partial state. The script must fail nonzero, preserve useful error output, and keep logging/telemetry failures from blocking the critical control path.
6. Create the smallest hash-locked `CodexElevation` request; never use credentials, scheduled tasks, services or persistent admin sessions to bypass UAC. Obtain required confirmation unless a valid explicitly scoped series authorization covers it, then invoke the approved request exactly once.
7. After execution, treat the receipt and exit code only as execution evidence. From a new non-admin process verify the relevant service, parent/child processes, ports, Runtime API, error logs and real smoke traffic, then confirm no request remains pending.

## Production Safety Gate

- Never use a production service to discover whether a new elevation script handles failure correctly.
- Do not release the current usable baseline before standby or an independently proven rescue path is ready.
- Failure, cancellation or UAC denial consumes the one-time attempt. Stop and re-investigate; do not issue another stop/restart/kill request automatically.
- If a user manually restores service, freeze that state and switch to read-only verification until a safer replacement plan is ready.
- “UAC closed”, “receipt written” and exit code `0` are not success criteria.

## Canonical Paths

- Module: `C:\Users\juzi\Documents\WindowsPowerShell\Modules\CodexElevation\1.0.0\`
- Requests and receipts: `C:\Users\juzi\AppData\Local\Codex\Elevation\`
- Reviewed scripts: `C:\Users\juzi\AppData\Local\Codex\Elevation\Scripts\`

## Scope Rule

Treat credentials, security software, accounts/groups, partitions, drivers, startup, services, recovery, deletion of user data, and security-disable actions as separate confirmation boundaries even during a series authorization. A series authorization does not remove protected-baseline, failure-injection, one-attempt or non-admin acceptance requirements.
