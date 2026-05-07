# ws.service Approval Boundary Update

Generated: 2026-05-07T19:39:00Z

## Boundary
`APR-008` provisioning is blocked and not ready. Do not create or use provisioning approval until the actual deploy VPS read-only preflight passes.

## Pending Approval to Create
`APR-008-PREFLIGHT-RETRY APPROVED — ws-service-host-readiness-readonly-on-deploy-vps`

## Explicitly Not Approved
- service file creation
- daemon-reload
- enable/start/restart
- nginx changes
- deploy/rsync
- workflow/source changes
