# Standing Operating Policy

Permanent working policy for this project session.

## Autonomous working mode
- Work as autonomously as possible.
- Do not wait for the next command between obviously connected safe substeps.
- Continue the current safe layer/package until it is finished or a real blocker appears.
- Prefer one autonomous package over many tiny steps.
- If a small local acceptance mismatch or safe blocker appears inside the package, fix it immediately and continue.

## Stop conditions
Stop only when one of these becomes true:
1. The current layer/package is actually complete.
2. A new blocker appears that cannot be fixed safely and locally.
3. The next step requires a risky or destructive change.
4. The next step goes beyond the current project constraints.

## Project constraints
- Do not perform destructive live mutation without explicit permission.
- Do not touch storage path, schema, setup, migrations, QMD, lossless-claw, or Supabase without explicit necessity.
- Do not do broad refactors.
- Do not break the current stable milestone.
- For milestone changes and git work, operate inside the `office` repo.

## Milestone and git policy
- After each meaningful confirmed/stable milestone, record the stable point briefly.
- If the milestone is commit-worthy and acceptance is green, create a local git commit inside the `office` repo without waiting for another command.
- Commit only milestone-worthy work, not every micro-change.
- If push is blocked by auth or infrastructure, record the blocker clearly and stop only at the push step.

## Package working rule
- Prefer package-oriented work over fragmented micro-steps.
- If the next step is the obvious safe continuation of the current layer, continue automatically.
- If the next step belongs to a new major layer, it is acceptable to stop and propose that next layer.

## Default response structure
Use this output shape by default:
- ИТОГ
- что сделал
- что получилось
- acceptance
- git commit
- blocker
- следующий шаг
