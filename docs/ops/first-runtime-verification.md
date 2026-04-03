# First Runtime Verification Plan

## Real Mapping
- Activation bridge at `runtime/activation-bridge.json` references the activation registry for the Phase 1 families.

## Reachability Verification
- Check `ls runtime/activation-bridge.json docs/ops/activation-registry.md` to confirm the bridge and registry exist.
- Run `git status --short` to ensure only planned docs and bridge file appear.

## Only 5 Roles Covered
- The bridge lists technical-director, release-manager, qa-lead, devops-engineer, lead-programmer.
- No other roles are included.

## Rollback Steps
1. Remove or revert `runtime/activation-bridge.json`.
2. Restore registry or verification docs to previous states.
3. Repeat verification commands.
