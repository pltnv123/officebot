# CI/CD Artifact Risk Register

**Version:** 1.0
**Date:** 2026-05-07
**Task:** cicd-artifact-verification-002

---

## Risk Overview

| Risk ID | Severity | Area | Status |
|---------|----------|------|--------|
| R001 | HIGH | CI/CD | Active |
| R002 | MEDIUM | CI/CD | Active |
| R003 | HIGH | CI/CD | Active |
| R004 | LOW | Release | Active |
| R005 | MEDIUM | CI/CD | Active |
| R006 | LOW | CI/CD | Active |

---

## R001 — Build Step Fails Consistently

**Severity:** HIGH
**Area:** CI/CD
**Evidence:** 7+ consecutive failures on runs #520-526

**Description:**
The build step in `unity-webgl-deploy.yml` fails consistently, preventing all downstream steps (artifact upload, deployment) from executing.

**Impact:**
- No build artifacts produced
- No deployment to GitHub Pages
- CI/CD pipeline completely blocked

**Proposed Next Step:**
Review build job logs to identify specific failure cause. Verify Unity license checkout and module configuration.

**Approval Required:** No (audit only)

---

## R002 — Artifact Upload Never Reached

**Severity:** MEDIUM
**Area:** CI/CD
**Evidence:** Build failure blocks upload step

**Description:**
The artifact upload job exists in the workflow but never executes because the build step fails first.

**Impact:**
- Cannot verify upload logic works correctly
- No GitHub Actions artifacts available for download
- Cannot diagnose upload-specific issues

**Proposed Next Step:**
Fix build step first, then verify upload executes successfully.

**Approval Required:** No (audit only)

---

## R003 — Pages Deployment Failing

**Severity:** HIGH
**Area:** CI/CD
**Evidence:** Deploy job fails even when artifacts exist

**Description:**
Even in the rare cases where build and upload succeed, the GitHub Pages deployment step fails.

**Impact:**
- No live deployment of Unity WebGL build
- Users cannot access deployed application

**Proposed Next Step:**
Check GitHub Pages settings (enabled, source branch, custom domain). Verify workflow has `pages: write` permission.

**Approval Required:** Yes (settings change)

---

## R004 — No Release Assets Configured

**Severity:** LOW
**Area:** Release
**Evidence:** No GitHub Releases in workflow

**Description:**
The repository does not have a workflow for creating GitHub Releases with build artifacts.

**Impact:**
- No versioned release artifacts
- Users cannot download specific versions

**Proposed Next Step:**
Optional: Add release workflow if versioned releases are needed.

**Approval Required:** Yes (workflow change)

---

## R005 — webgl-build.yml Integration Unclear

**Severity:** MEDIUM
**Area:** CI/CD
**Evidence:** Separate build workflow exists

**Description:**
A separate `webgl-build.yml` workflow exists in addition to `unity-webgl-deploy.yml`. Integration points between these workflows are not documented.

**Impact:**
- Potential workflow duplication
- Confusion about which workflow to modify
- Possible conflicting configurations

**Proposed Next Step:**
Document integration points and clarify workflow responsibilities.

**Approval Required:** No (docs only)

---

## R006 — Artifact Retention Policy Unknown

**Severity:** LOW
**Area:** CI/CD
**Evidence:** Retention not documented

**Description:**
GitHub Actions artifact retention policy is not documented or verified.

**Impact:**
- Artifacts may be deleted before needed
- Storage costs may accumulate if retention is infinite

**Proposed Next Step:**
Check repository settings for artifact retention configuration. Document findings.

**Approval Required:** No (audit only)

---

## Risk Mitigation Priority

### Immediate (This Week)

1. **R001** — Fix build step (blocks everything)
2. **R003** — Fix Pages deployment (blocks deployment)

### Short Term (This Month)

3. **R002** — Verify upload after build fix
4. **R005** — Document workflow integration

### Optional (Backlog)

5. **R004** — Add release workflow (if needed)
6. **R006** — Document retention policy

---

## Related Documents

- CI/CD Artifact Verification Report: `./cicd-artifact-verification-002.md`
- CI/CD Diagnostics Commands: `./cicd-diagnostics-commands.md`
- CI/CD Troubleshooting Checklist: `./cicd-troubleshooting-checklist.md`
- Execution Report: `/output/cicd-artifact-verification-002-report.md`
