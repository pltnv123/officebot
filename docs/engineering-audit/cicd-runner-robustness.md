# CI/CD Runner Robustness Proposal

**Version:** 1.0
**Date:** 2026-05-07
**Task:** cicd-runner-robustness-003

---

## Executive Summary

This document proposes improvements for CI/CD runner failure handling, retry patterns, timeout configurations, and recovery procedures for the officebot Unity WebGL Build \u0026 Deploy workflow.

**Current Issues:**
- 100% failure rate on last 7+ runs
- No retry logic configured
- Default timeouts too long
- No failure notification
- No standardized recovery procedures

**Proposed Solutions:**
1. Retry logic with exponential backoff
2. Configurable timeout per job
3. Failure notification and alerting
4. Graceful degradation patterns
5. Recovery runbooks (created)

---

## Retry Logic Proposal

### Implementation

```yaml
jobs:
  build:
    strategy:
      fail-fast: false
      max-parallel: 1
    steps:
      - name: Unity Build (with retry)
        uses: nick-fields/retry@v2
        with:
          timeout_minutes: 30
          max_attempts: 3
          retry_wait_seconds: 60
          command: |
            # Unity build commands
```

### Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| max_attempts | 3 | Balance between reliability and cost |
| retry_wait_seconds | 60 | Prevent runner overload |
| timeout_minutes | 30 | Reasonable build time + buffer |

---

## Timeout Configuration Proposal

### Recommended Timeouts

| Job | Current | Proposed | Rationale |
|-----|---------|----------|-----------|
| checkout | Default (6h) | 5 min | Git clone is fast |
| build | Default (6h) | 45 min | Unity build + buffer |
| upload | Default (6h) | 10 min | Artifact upload is fast |
| deploy | Default (6h) | 15 min | Pages deployment is fast |

### Benefits

- Faster failure detection
- Better resource utilization
- Clearer SLA expectations

---

## Failure Notification Proposal

### Slack Integration

```yaml
jobs:
  notify:
    runs-on: ubuntu-latest
    needs: [build, upload, deploy]
    if: always()
    steps:
      - name: Send failure notification
        if: failure()
        uses: slackapi/slack-github-action@v1.23.0
```

### Notification Content

| Field | Content |
|-------|---------||
| Workflow | Workflow name |
| Run ID | Link to run |
| Conclusion | success/failure/cancelled |
| Duration | Total run time |
| Failed Jobs | List of failed jobs |

---

## Graceful Degradation Proposal

### Degradation Levels

| Level | Condition | Action |
|-------|-----------|--------||
| Full Success | All jobs pass | Deploy to production |
| Partial Success | Build + Upload pass, Deploy fails | Notify, artifacts available |
| Build Success | Build passes, Upload fails | Notify, build logs available |
| Total Failure | Build fails | Notify, investigate |

### Implementation

```yaml
jobs:
  deploy:
    needs: [build, upload]
    if: always() \u0026\u0026 needs.build.result == 'success' \u0026\u0026 needs.upload.result == 'success'
```

---

## Recovery Runbooks

**Status:** ✅ Created

| Runbook | Title | Location |
|---------|-------|----------||
| RB001 | Build Failure Recovery | `/output/cicd-runner-recovery-runbooks.md` |
| RB002 | Upload Failure Recovery | `/output/cicd-runner-recovery-runbooks.md` |
| RB003 | Deploy Failure Recovery | `/output/cicd-runner-recovery-runbooks.md` |
| RB004 | Timeout Recovery | `/output/cicd-runner-recovery-runbooks.md` |
| RB005 | Permission Failure Recovery | `/output/cicd-runner-recovery-runbooks.md` |

---

## Implementation Priority

### Phase 1 (Docs-Only — Autonomous)

- ✅ Create robustness proposal (this document)
- ✅ Create recovery runbooks
- ⏳ Create docs-only PR with proposals

### Phase 2 (Requires Approval)

- ⚠️ Implement retry logic
- ⚠️ Add timeout configurations
- ⚠️ Set up failure notifications
- ⚠️ Implement graceful degradation

### Phase 3 (Owner Action)

- 🔒 Verify Unity license
- 🔒 Check Pages settings
- 🔒 Configure notification channels

---

## Related Documents

- CI/CD Diagnostics Commands: `./cicd-diagnostics-commands.md`
- CI/CD Troubleshooting Checklist: `./cicd-troubleshooting-checklist.md`
- CI/CD Artifact Verification: `./cicd-artifact-verification-002.md`
- CI/CD Artifact Risk Register: `./cicd-artifact-risk-register.md`
- Recovery Runbooks: `/output/cicd-runner-recovery-runbooks.md`

---

## Safety Verification

- ✅ Report-only task
- ✅ No workflow modifications
- ✅ No source code changes
- ✅ No runtime/build/evidence changes
- ✅ All proposals documented for future approval
