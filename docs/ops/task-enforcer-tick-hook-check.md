# Task Enforcer Tick Hook Check

## Hook Location
- The guarded manual tick hook is placed at the end of scripts/task_enforcer.sh.
- Existing tasks.json enforcement behavior remains intact.

## Behavior
- After normal enforcer processing completes, the script attempts one guarded call to scripts/manual_tick.sh.
- One-step execution and non-reentry are enforced by manual_tick.sh.
- If the tick is blocked, missing state, or a no-op, the enforcer logs the result and exits safely.

## Safety
- Existing task handling is preserved.
- The hook is easy to disable by removing the appended block.
- Blockers and lock behavior remain governed by manual_tick.sh.

## Verification
- Inspect the tail of scripts/task_enforcer.sh.
- Run bash scripts/task_enforcer.sh in a controlled state.
- Confirm the log shows one guarded hook attempt.
- Confirm no uncontrolled loop occurs.
