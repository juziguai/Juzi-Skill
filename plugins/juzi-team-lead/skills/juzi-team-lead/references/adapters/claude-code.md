# Claude Code Adapter

Use this adapter when the host is Claude Code.

## Capability Mapping

| Abstract role | Claude Code capability |
|---------------|------------------------|
| worker | implementation agent |
| reviewer | read-only explorer agent |
| planner | planning agent |
| task tracking | host task tracker |
| messaging | host agent messaging |
| stop | host task stop |

## Workflow Notes

- Use background workers for independent write scopes.
- Keep task ownership disjoint.
- Never let a worker verify its own output.
- If the host cannot delegate, downgrade to direct execution in the main thread.
