# officebot runtime state strategy implementation plan

## Current dependencies

Runtime/state candidates found: **11**.

- `.world.json` — 163 bytes, refs: 8, risk: CRITICAL
- `runtime/activation-bridge-loader.js` — 638 bytes, refs: 3, risk: CRITICAL
- `runtime/activation-bridge.json` — 355 bytes, refs: 4, risk: CRITICAL
- `runtime/agency-agents-registry.json` — 3 bytes, refs: 4, risk: CRITICAL
- `runtime/state/backlog.json` — 3 bytes, refs: 15, risk: CRITICAL
- `runtime/state/blockers.json` — 3 bytes, refs: 18, risk: CRITICAL
- `runtime/state/completed.jsonl` — 1775 bytes, refs: 19, risk: CRITICAL
- `runtime/state/current-objective.json` — 228 bytes, refs: 18, risk: CRITICAL
- `runtime/state/next-step.json` — 242 bytes, refs: 21, risk: CRITICAL
- `state.json` — 27831 bytes, refs: 29, risk: CRITICAL
- `tasks.json` — 8790 bytes, refs: 19, risk: CRITICAL

## Why direct untrack is risky

Runtime state files can be active operational inputs, default fixtures, or expected bootstrapping data. Directly untracking them without init/default behavior can break fresh checkout, ops scripts, or backend startup.

## Proposed policy

- Keep explicit example/default files tracked where needed, e.g. `*.example.json` or `runtime/defaults/*`.
- Treat generated live state as ignored runtime output.
- Add startup/init checks that create missing generated files safely.
- Document which files are config examples vs runtime data.

## Future PR sequence

1. Docs/checklist PR: owner decision matrix and exact path proposals.
2. Init/default sample PR: add safe defaults and bootstrapping behavior if needed.
3. Limited untrack PR: `git rm --cached` only for exact approved generated paths.
4. Validation PR: fresh checkout smoke test and ops docs validation.

## Acceptance criteria

- Fresh checkout starts without committed live runtime state.
- Ops scripts either create or tolerate missing generated files.
- Tests/demos do not depend on removed tracked runtime files.
- Rollback is a normal git revert plus restoring exact paths if needed.

## Rollback plan

Revert cleanup PR and re-add exact runtime paths from the last known good commit.
