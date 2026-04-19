# Agency Agents Runtime Bridge

Imported agents remain dormant until fronted through a controlled bridge.

## Resolution
- Files under `third_party/agency-agents` are referenced by canonical role keys stored in `runtime/agency-agents-registry.json`.
- The bridge resolves a request by matching the desired canonical role key and division to the source file path, then loading metadata as needed.

## Dormant policy
- Every agent is tagged `dormant: true` in the registry so it is ignored in runtime unless the bridge explicitly switches its stage.
- Only stage 3 roles trigger runtime execution; prior stages are informative/documentary.

## Collision handling
- If an imported canonical key matches an OpenClaw-native role, the native role takes precedence. The bridge checks the native namespace first before loading vendor files.
- Divergent source paths use division+canonical to ensure uniqueness and avoid aliasing.

## Future staging
- When ready to activate a vendor role, update the registry entry with the desired stage and add a documented bridge configuration so the runtime loader whitelists it.

