# CI/CD Diagnostic Commands Reference

**Version:** 1.0
**Date:** 2026-05-07
**Purpose:** Standardized diagnostic commands for CI/CD troubleshooting

---

## Pre-Build Diagnostics

### Environment State

```bash
# Working directory
pwd

# Git state
git rev-parse HEAD
git rev-parse --abbrev-ref HEAD
git status --porcelain
git log --oneline -5

# Environment variables (non-secret)
echo "RUNNER_OS=$RUNNER_OS"
echo "RUNNER_ARCH=$RUNNER_ARCH"
echo "GITHUB_REF=$GITHUB_REF"
echo "GITHUB_SHA=$GITHUB_SHA"
```

### Unity Project State

```bash
# Unity version
cat ProjectSettings/ProjectVersion.txt

# Project structure
ls -la

# Asset database state
find Assets -type f -name "*.meta" | wc -l

# Scene files
find Assets -type f -name "*.unity" | head -10

# Script files
find Assets -type f -name "*.cs" | wc -l
```

### File System Diagnostics

```bash
# Disk space
df -h

# Large files
find . -type f -size +100M | head -10

# Recent changes
find . -type f -mmin -60 | head -20
```

---

## Build Diagnostics

### Build Configuration

```bash
# Build target
echo "BuildTarget: WebGL"

# IL2CPP vs Mono
grep -r "ScriptingBackend" ProjectSettings/

# Stripping level
grep -r "StripEngineCode" ProjectSettings/
```

### Build Output

```bash
# Build directory layout
ls -la Build/

# File sizes
du -sh Build/*

# WebGL specific files
ls -la Build/*.data Build/*.framework.js Build/*.wasm 2>/dev/null || echo "Files not found"

# Build timestamp
stat Build/index.html | grep Modify
```

### Build Log Analysis

```bash
# Search for errors
grep -i "error\|exception\|failed" build.log | tail -20

# Search for warnings
grep -i "warning" build.log | tail -20

# Build duration
grep -E "Build completed|Finished in" build.log
```

---

## Deploy Diagnostics

### GitHub Pages Status

```bash
# Check Pages deployment via API
gh api repos/pltnv123/officebot/pages

# Check deployment status
gh api repos/pltnv123/officebot/deployments

# Check latest Pages build
gh api repos/pltnv123/officebot/pages/builds/latest
```

### Artifact Diagnostics

```bash
# List workflow artifacts
gh api repos/pltnv123/officebot/actions/artifacts

# Download specific artifact
gh run download <run-id> --name <artifact-name>

# Artifact retention
gh api repos/pltnv123/officebot/actions/artifacts | jq '.artifacts[] | {name, size_in_bytes, created_at}'
```

### Permissions Check

```bash
# Current workflow permissions (from workflow file)
grep -A5 "^permissions:" .github/workflows/unity-webgl-deploy.yml

# Job-level permissions
grep -B2 -A5 "permissions:" .github/workflows/unity-webgl-deploy.yml
```

---

## Post-Failure Diagnostics

### Run Information

```bash
# Get run details
gh run view <run-id>

# Get run conclusion and timing
gh run view <run-id> --json conclusion,startedAt,updatedAt

# List jobs in run
gh run view <run-id> --json jobs
```

### Log Analysis

```bash
# Download all logs
gh run view <run-id> --log

# Search logs for errors
grep -r "error\|Error\|ERROR" <log-dir>/ | head -30

# Check specific job logs
cat <log-dir>/<job-name>.txt
```

### Failure Pattern Analysis

```bash
# Recent failures
gh run list --workflow unity-webgl-deploy.yml --limit 10 --json status,conclusion,displayTitle

# Failure rate
# Count failures vs successes in last N runs
```

---

## Recovery Commands

### Retry Failed Run

```bash
# Rerun failed run
gh run rerun <run-id>

# Rerun specific failed job
gh run rerun <run-id> --job <job-id>
```

### Cancel Stuck Run

```bash
# Cancel running workflow
gh run cancel <run-id>
```

### Debug Mode

```bash
# Enable debug logging (add to workflow)
# env:
#   ACTIONS_STEP_DEBUG: true
#   ACTIONS_RUNNER_DEBUG: true
```

---

## Expected Values Reference

### Unity WebGL Build

| File | Expected | Notes |
|------|----------|-------|
| `Build/*.data` | Present | Game data |
| `Build/*.framework.js` | Present | Unity framework |
| `Build/*.wasm` | Present | WebAssembly (if enabled) |
| `Build/index.html` | Present | Entry point |

### Workflow Permissions (Post-PR32)

```yaml
permissions:
  contents: read
  actions: write
```

### Typical Build Duration

| Phase | Expected Time |
|-------|---------------|
| Checkout | 30-60 seconds |
| Unity Build | 5-15 minutes |
| Upload | 1-3 minutes |
| Deploy | 1-2 minutes |

---

## Related Documents

- CI/CD Troubleshooting Checklist: `./cicd-troubleshooting-checklist.md`
- CI/CD Diagnostics Report: `/output/cicd-diagnostics-001-execution-report.md`
- Workflow File: `.github/workflows/unity-webgl-deploy.yml`
