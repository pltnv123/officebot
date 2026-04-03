# First Runtime Verification Plan

## Real Mapping
- Activation registry introduced at `docs/ops/activation-registry.md` linking each of the Phase 1 families to their CCGS agent spec files.

## Reachability Verification
- Check `ls docs/ops/activation-registry.md` to confirm the registry exists.
- Run `git status --short` to ensure only planned docs are tracked.

## No Extra Roles Activated
- The registry lists only technical-director, release-manager, qa-lead, devops-engineer, lead-programmer; no other roles appear.
- Third-party directories remain untouched by this doc-only wiring.

## Rollback Steps
1. Restore `docs/ops/first-runtime-verification.md` to the earlier version if needed.
2. Remove `docs/ops/activation-registry.md` or revert it.
3. Re-run the verification commands to confirm cleanup.
