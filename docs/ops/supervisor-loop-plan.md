# Supervisor Loop Plan

## Bounded Execution Cycle
- Supervisor triggers a cycle every hour, reviewing `current-objective.json` and `next-step.json`.
- Each cycle includes verification, execution handoff, and finalization before the next block begins.

## Choosing Next Step
- After an objective completes, supervisors read `backlog.json` to select the highest-priority entry that matches the Phase 1 roles.
- The selected objective is written to `next-step.json` and scheduled for assignment.

## Recording Blockers
- Any encountered blocker is appended to `blockers.json` with timestamp and impact, halting progress until resolved.
- Supervisors reference `blockers.json` each cycle to decide whether to bail or reroute.

## Appending Completed Work
- When an objective finishes, append a JSON line to `completed.jsonl` containing the objective summary, role, and verification evidence.

## Recovery After Interruptions
- On restart or timeout, the supervisor reloads `current-objective.json`, `backlog.json`, `blockers.json`, and `next-step.json` to resume where left off.
- If `completed.jsonl` is ahead of `current-objective.json`, supervisors skip already-done work.

## Telegram Control Surface
- Telegram stays a control/alert channel: it receives status updates and stop commands but does not dictate execution details.
- Any actual changes to the state files are made via the supervisor loop, not Telegram messages.
