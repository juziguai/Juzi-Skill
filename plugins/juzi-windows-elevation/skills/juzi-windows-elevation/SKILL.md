---
name: juzi-windows-elevation
description: Use when a Windows task requires administrator privileges, UAC approval, system configuration changes, environment repair, or verification of a CodexElevation request. Enforces reviewed scripts, hash-locked one-time elevation, scoped series authorization, and non-admin verification.
---

# Juzi Windows Elevation

## Use This Workflow

1. Determine whether the task can finish as the normal user. Do not request elevation for convenience.
2. Read [references/elevation-protocol.md](references/elevation-protocol.md) before creating or executing any elevation request.
3. Create a reviewed `.ps1` with the smallest system scope, then use `CodexElevation`; never use credentials, scheduled tasks, services, or persistent admin sessions to bypass UAC.
4. Before execution, obtain the required user confirmation unless a still-valid, explicitly scoped series authorization covers the action; invoke the approved request with `Invoke-CodexElevationRequest` exactly once.
5. After execution, read the actual receipt, verify from a new non-admin process, run the relevant smoke test, and confirm no request remains pending.

## Canonical Paths

- Module: `C:\Users\juzi\Documents\WindowsPowerShell\Modules\CodexElevation\1.0.0\`
- Requests and receipts: `C:\Users\juzi\AppData\Local\Codex\Elevation\`
- Reviewed scripts: `C:\Users\juzi\AppData\Local\Codex\Elevation\Scripts\`

## Scope Rule

Treat credentials, security software, accounts/groups, partitions, drivers, startup, services, recovery, deletion of user data, and security-disable actions as separate confirmation boundaries even during a series authorization.
