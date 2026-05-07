# CI/CD Troubleshooting Checklist

**Version:** 1.0
**Date:** 2026-05-07
**Purpose:** Systematic troubleshooting for CI/CD failures

---

## Quick Triage (First 5 Minutes)

- [ ] Check run conclusion: `gh run view <run-id>`
- [ ] Identify failing job
- [ ] Download logs: `gh run view <run-id> --log`
- [ ] Search for "error" in logs
- [ ] Check if failure is new or recurring

---

## Failure Category: Build Failed

### Symptoms
- Job `build` or `unity-build` shows ❌
- Logs show Unity build errors
- No Build/ directory created

### Diagnostic Steps

1. **Check Unity version compatibility**
   ```bash
   cat ProjectSettings/ProjectVersion.txt
   ```

2. **Verify project integrity**
   ```bash
   find Assets -name "*.meta" | wc -l
   ```

3. **Check disk space**
   ```bash
   df -h
   ```

4. **Review build log for specific error**
   ```bash
   grep -i "error" build.log | tail -20
   ```

### Common Causes

| Cause | Fix |
|-------|-----|
| Missing Unity modules | Add to workflow `unity-builder` action config |
| Script compilation errors | Fix C# errors locally first |
| Disk space exhausted | Clean up large assets |
| License checkout failed | Verify Unity license credentials |

---

## Failure Category: Artifact Upload Failed

### Symptoms
- Job `upload` or `artifact` shows ❌
- Build succeeded but upload failed
- Error mentions "not found" or "permission denied"

### Diagnostic Steps

1. **Verify Build directory exists**
   ```bash
   ls -la Build/
   ```

2. **Check artifact name matches**
   ```bash
   grep "name:" .github/workflows/unity-webgl-deploy.yml
   ```

3. **Verify permissions**
   ```bash
   grep -A5 "permissions:" .github/workflows/unity-webgl-deploy.yml
   ```

### Common Causes

| Cause | Fix |
|-------|-----|
| Build directory empty | Check build step completed |
| Artifact name mismatch | Verify artifact name in upload action |
| Permission denied | Add `actions: write` permission |
| File too large | Check GitHub artifact size limits (500MB) |

---

## Failure Category: Deploy Failed

### Symptoms
- Job `deploy` or `pages` shows ❌
- Build and upload succeeded
- Deployment to GitHub Pages failed

### Diagnostic Steps

1. **Check Pages configuration**
   ```bash
   gh api repos/pltnv123/officebot/pages
   ```

2. **Verify deployment permissions**
   ```bash
   grep -B5 -A10 "deploy" .github/workflows/unity-webgl-deploy.yml
   ```

3. **Check Pages build status**
   ```bash
   gh api repos/pltnv123/officebot/pages/builds/latest
   ```

### Common Causes

| Cause | Fix |
|-------|-----|
| Pages not enabled | Enable GitHub Pages in repo settings |
| Wrong branch selected | Verify Pages source branch |
| Permission missing | Add `pages: write` or `deployments: write` |
| Custom domain conflict | Check Pages domain settings |

---

## Failure Category: Timeout

### Symptoms
- Job shows ⏱️ or "cancelled"
- No explicit error, just timeout
- Build takes longer than expected

### Diagnostic Steps

1. **Check build duration**
   ```bash
   gh run view <run-id> --json startedAt,updatedAt
   ```

2. **Identify slow step**
   ```bash
   grep -E "Starting|Completed|took" build.log
   ```

3. **Compare with baseline**
   - Typical Unity WebGL build: 5-15 minutes
   - Timeout threshold: usually 360 minutes (6 hours)

### Common Causes

| Cause | Fix |
|-------|-----|
| Large project | Enable build caching |
| Network issues | Add retry logic |
| Resource contention | Use dedicated runner |
| Infinite loop in build | Check custom build scripts |

---

## Failure Category: Permission Denied

### Symptoms
- Error mentions "permission denied" or "unauthorized"
- API calls fail
- Deploy step fails with 403

### Diagnostic Steps

1. **Check workflow permissions**
   ```bash
   cat .github/workflows/unity-webgl-deploy.yml | grep -A20 "permissions:"
   ```

2. **Verify token has required scopes**
   - `contents: read` - for checkout
   - `actions: write` - for artifact upload
   - `pages: write` - for Pages deploy (if needed)

3. **Check token expiration**
   - GitHub tokens are short-lived (usually 1 hour)
   - Should be auto-refreshed by `actions/checkout`

### Common Causes

| Cause | Fix |
|-------|-----|
| Missing permission | Add to workflow `permissions:` block |
| Token expired | Usually auto-resolved by Actions |
| Environment protection | Check environment rules in repo settings |
| Organization policy | Contact org admin |

---

## Escalation Path

### Level 1: Self-Service
- Review logs
- Check checklist
- Retry failed run

### Level 2: Documentation
- Consult diagnostic commands: `./cicd-diagnostics-commands.md`
- Review recent changes: `git log --oneline -10`
- Check related PRs

### Level 3: Owner Review Required
- Workflow permission changes
- GitHub Pages settings
- Unity license credentials
- Environment secrets
- Organization policies

---

## Recovery Commands

```bash
# Retry failed run
gh run rerun <run-id>

# Retry specific job
gh run rerun <run-id> --job <job-id>

# Cancel stuck run
gh run cancel <run-id>

# View run details
gh run view <run-id>

# Download logs
gh run view <run-id> --log
```

---

## Related Documents

- Diagnostic Commands: `./cicd-diagnostics-commands.md`
- Execution Report: `/output/cicd-diagnostics-001-execution-report.md`
- Workflow File: `.github/workflows/unity-webgl-deploy.yml`
