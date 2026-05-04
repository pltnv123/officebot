# WebStudio Risk Classification

## Risk Levels

| Level | Color | Action |
|-------|-------|--------|
| CRITICAL | 🔴 | Stop immediately, escalate to user |
| HIGH | 🟠 | Require Quality Governor + user approval |
| MEDIUM | 🟡 | Require Quality Governor approval |
| LOW | 🟢 | Standard review, document decision |

## Risk Categories

### 1. Security Risks

| Risk | Level | Indicators |
|------|-------|------------|
| Secret leakage | CRITICAL | SERVICE_ROLE, SUPABASE_KEY, TOKEN= in logs/files |
| Credential access | HIGH | Skill requests API keys, passwords |
| Obfuscated scripts | CRITICAL | Base64 encoded, minified, hidden logic |
| Crypto/wallet ops | CRITICAL | Private keys, wallet addresses, transactions |
| Network exfiltration | HIGH | Unknown endpoints, POST to external APIs |
| Filesystem write | MEDIUM | Write to unexpected directories |
| Shell command injection | HIGH | Unsanitized input to exec |

### 2. Git Risks

| Risk | Level | Indicators |
|------|-------|------------|
| Force push | HIGH | `git push --force` without approval |
| git add . | MEDIUM | Commits unintended files |
| Secrets in commit | CRITICAL | API keys, tokens in diff |
| Log files committed | LOW | backend.log, runtime storage |
| Branch deletion | MEDIUM | `git branch -D` without backup |

### 3. Runtime Risks

| Risk | Level | Indicators |
|------|-------|------------|
| Infinite loop | MEDIUM | No timeout, no exit condition |
| Memory exhaustion | MEDIUM | Large data processing without limits |
| Blocking I/O | MEDIUM | Sync file ops in async context |
| Unhandled rejection | LOW | Missing .catch() or try/catch |
| Race conditions | MEDIUM | Concurrent writes without locking |

### 4. Third-Party Skill Risks

| Risk | Level | Indicators |
|------|-------|------------|
| No SKILL.md | CRITICAL | Missing documentation |
| Secret requirements | MEDIUM | Requires env vars, API keys |
| Credential access | HIGH | Requests OAuth, tokens |
| Obfuscated logic | CRITICAL | Encrypted, encoded, hidden |
| Crypto operations | CRITICAL | Wallet, blockchain, keys |
| Network calls | MEDIUM | External API calls |
| Filesystem access | LOW | Read/write operations |

### 5. UI/UX Risks

| Risk | Level | Indicators |
|------|-------|------------|
| Breaking changes | HIGH | Removes existing features |
| Visual regression | MEDIUM | Changes layout without approval |
| Accessibility loss | MEDIUM | Removes ARIA, alt text |
| Performance degradation | MEDIUM | Slow rendering, large bundles |
| Browser incompatibility | LOW | Works in Chrome only |

### 6. Data Risks

| Risk | Level | Indicators |
|------|-------|------------|
| Data loss | CRITICAL | DELETE without backup |
| Data corruption | HIGH | Write without validation |
| PII exposure | CRITICAL | Personal data in logs |
| Schema migration | HIGH | Database changes without rollback |
| Cache invalidation | MEDIUM | Stale data after changes |

## Risk Assessment Workflow

### Before Implementation

1. **Classify task** — What type of change is this?
2. **Identify risks** — Which categories apply?
3. **Assign levels** — CRITICAL/HIGH/MEDIUM/LOW
4. **Determine approvals** — Who must approve?

### During Implementation

1. **Monitor for risks** — Watch for indicators
2. **Escalate immediately** — If CRITICAL detected
3. **Document decisions** — Log risk assessments

### After Implementation

1. **Verify no new risks** — Security scan, secret scan
2. **Update documentation** — Risk registry
3. **Lessons learned** — MEMORY.md update

## Approval Matrix

| Risk Level | Required Approvals |
|------------|-------------------|
| CRITICAL | User + Quality Governor + Security Auditor |
| HIGH | Quality Governor + Security Auditor |
| MEDIUM | Quality Governor |
| LOW | Standard review |

## Safe Defaults

When risk is uncertain:

1. **Assume higher risk** — Better safe than sorry
2. **Document uncertainty** — Do not overclaim
3. **Request review** — Quality Governor approval
4. **Use sandbox** — Isolated execution when possible

## Secret Scan Patterns

```bash
# Scan for secrets
grep -RniE "SERVICE_ROLE|SUPABASE_KEY|SUPABASE_URL=.*[A-Za-z0-9]|TOKEN=|SECRET=|PASSWORD=|PRIVATE_KEY|API_KEY" \
  /path/to/scan \
  2>/dev/null | head -300
```

**Always redact:** `sed -E 's/=.*/=<redacted>/'`

## See Also

- `docs/webstudio-sandbox-security-plan.md`
- `docs/webstudio-security-auditor-policy.md`
- `workspace-security-auditor/SOUL.md`
