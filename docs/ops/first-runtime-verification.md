# First Runtime Verification Plan

## Runtime Integration
- Added `runtime/activation-bridge-loader.js` which reads `runtime/activation-bridge.json`.
- The loader filters mapped roles to technical-director, release-manager, qa-lead, devops-engineer, and lead-programmer.

## Reachability Verification
- Check `ls runtime/activation-bridge.json runtime/activation-bridge-loader.js` and ensure `docs/ops/activation-registry.md` exists.
- Running `node -e "require('./runtime/activation-bridge-loader').loadBridge();"` should succeed without errors.

## Only 5 Roles Covered
- The loader enforces a whitelist of the five Phase 1 roles.
- Additional roles remain in the vendor packs untouched.

## Rollback Steps
1. Remove `runtime/activation-bridge-loader.js` if needed.
2. Restore verification docs to previous content.
3. Re-run the verification commands.
