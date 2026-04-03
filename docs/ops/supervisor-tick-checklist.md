# Supervisor Tick Checklist

1. **State readable**: Confirm `runtime/state/current-objective.json` and `runtime/state/backlog.json` exist and are valid JSON.
2. **Next-step present**: Verify `runtime/state/next-step.json` describes a bounded task assigned to one of the five core roles.
3. **One bounded step selected**: Choose the single action from `next-step.json`; do not span multiple updates.
4. **Completed log append rule**: After executing the step, append a line to `runtime/state/completed.jsonl` with summary info.
5. **Next-step refresh rule**: Write the upcoming bounded task to `runtime/state/next-step.json` before ending the tick.
6. **Blocker handling rule**: If `runtime/state/blockers.json` lists an active blocker, abort and do not mutate other state files.
7. **Verification rule**: Before the next automated tick, ensure the new `next-step.json` and `completed.jsonl` entry exist for traceability.
