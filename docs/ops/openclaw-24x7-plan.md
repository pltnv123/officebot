# OpenClaw 24x7 Plan

## Bounded Execution Blocks
- Define short execution windows (1-2 hour blocks) where specific agent families own tasks.
- Each block has a clear trigger, completion metric, and handoff summary before the next block begins.

## File-Backed State
- Persist intent, progress, and verification status in files under `docs/ops` or `state/` so every action remains auditable.
- Update the state files before and after each bounded block, including dependencies and next steps.

## Supervisor/Recovery After Timeout/Reset
- After any timeout or reset, a supervisor compares the last known good state file to determine rollback points.
- Recovery scripts replay minimal steps to bring the system back in sync before resuming new blocks.

## Role Routing Across Imported Packs
- Route game/studio/Unity tasks to the CCGS leadership and Unity specialists.
- Route engineering/product/project-management/testing/marketing/support tasks to agency-agents families.
- Each request explicitly records the preferred pack/family in the state files before execution.

## Telegram as Control Surface Only
- Telegram sends alerts, approvals, and emergency stop commands but does not become the execution engine.
- Execution agents rely on file-backed instructions and notify Telegram only when manual input is required.

## Proof/Verification Discipline
- Every block produces a verification snippet (logs, screenshots, checks) stored alongside the state.
- Supervisors refuse to mark completion until proof is recorded and cross-checked.

## Staged Activation Instead of Enabling Everything at Once
- Activation follows the defined phase order; no Unity or agency-agents families go live until earlier phases are stable.
- Monitor each stage with dedicated telemetry before progressing.
