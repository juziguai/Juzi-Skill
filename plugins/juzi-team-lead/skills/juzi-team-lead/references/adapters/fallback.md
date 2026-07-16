# Fallback Adapter

Use this adapter when the host does not provide sub-agent or background execution support.

## Rules

- The main thread performs planning, implementation, and verification directly.
- Keep the same decomposition and verification discipline.
- Do not claim parallelism that the host cannot provide.
- Tell the user clearly that delegation is downgraded.
