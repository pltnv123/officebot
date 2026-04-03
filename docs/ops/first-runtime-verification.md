# First Runtime Verification Plan

## Wired Elements
- Routing metadata ties requests for technical-director, release-manager, qa-lead, devops-engineer, and lead-programmer to their respective third_party/ccgs agent specs.
- Documentation entries under docs/ops/first-activation-set.md and docs/ops/role-routing-map.md serve as the central wiring references without touching runtime code.

## Where Wired
- docs/ops/first-activation-set.md records the allowed activities for each family and explicitly states all other agents remain reference-only.
- docs/ops/role-routing-map.md maps each role to its domain responsibilities, making routing metadata discoverable by automation.

## Reachability Verification
- Confirm config referencing these docs by ensuring the files exist (`ls docs/ops/first-activation-set.md docs/ops/role-routing-map.md docs/ops/first-runtime-verification.md`).
- Run targeted queries or scripts (placeholder: `git status --short`) to ensure these files are tracked and accessible.

## No Extra Roles Activated
- Verify no other routing docs were modified by checking git status output only shows these docs.
- Ensure third_party directories remain untouched by not staging or modifying other entries.

## Rollback Steps
1. Remove/restore docs/ops/first-runtime-verification.md if the wiring needs reversing.
2. Revert docs/ops/first-activation-set.md and role-routing-map.md to prior commits if misapplied.
3. Re-run verification commands to confirm cleanup.
