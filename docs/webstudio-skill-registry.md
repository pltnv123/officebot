# WebStudio Skill Registry

Last updated: 2026-05-04T18:54:00Z

## Installed Skills

| Skill | Purpose | Location | Security Notes | Last Checked |
|-------|---------|----------|----------------|--------------|
| webstudio-skill-curator | Skill discovery/install | `/home/antonbot/.openclaw/workspace/skills/webstudio-skill-curator/` | ✅ No secrets, no credentials | 2026-05-04 |
| webstudio-task-contract-enforcer | Task contract enforcement | `/home/antonbot/.openclaw/workspace/skills/webstudio-task-contract-enforcer/` | ✅ No secrets, no credentials | 2026-05-04 |
| webstudio-brain-substrate-check | Verify Supabase/QWD/lossless/skills | `/home/antonbot/.openclaw/workspace/skills/webstudio-brain-substrate-check/` | ✅ No secrets, no credentials | 2026-05-04 |
| webstudio-organism-memory-check | Verify organism memory (env, /api/state, Supabase probe) | `/home/antonbot/.openclaw/workspace/office/skills/webstudio-organism-memory-check/` | ✅ No secrets, no credentials | 2026-05-04 |

## Custom WebStudio Skills

| Skill | Purpose | Location | Status |
|-------|---------|----------|--------|
| webstudio-skill-curator | Discover, inspect, install OpenClaw skills | workspace/skills/webstudio-skill-curator/ | ✅ Active |
| webstudio-task-contract-enforcer | Enforce task contracts, block premature COMPLETE | workspace/skills/webstudio-task-contract-enforcer/ | ✅ Active |
| webstudio-brain-substrate-check | Verify Supabase/QWD/lossless/skills before brain/governance tasks | workspace/skills/webstudio-brain-substrate-check/ | ✅ Active |
| webstudio-organism-memory-check | Verify persistent env, /api/state JSON, Supabase probe, no secrets | office/skills/webstudio-organism-memory-check/ | ✅ Active |
| webstudio-risk-classifier | Risk classification | workspace/skills/webstudio-risk-classifier/ | ✅ Active |
| webstudio-quality-gate | Quality gate enforcement | workspace/skills/webstudio-quality-gate/ | ✅ Active |
| webstudio-smoke-author | Create/maintain smoke tests | workspace/skills/webstudio-smoke-author/ | ✅ Active |
| webstudio-browser-proof | Browser-based evidence | workspace/skills/webstudio-browser-proof/ | ✅ Active |
| webstudio-security-review | Security review | workspace/skills/webstudio-security-review/ | ✅ Active |
| webstudio-release-discipline | Git discipline | workspace/skills/webstudio-release-discipline/ | ✅ Active |

## ClawHub Skills

| Skill | Purpose | Source | Security Review |
|-------|---------|--------|-----------------|
| (none installed) | - | - | - |

## Bundled/OpenClaw Skills Available

Run `openclaw skills list --eligible` to see current list.

## Skill Search Queries Reference

| Task Type | Query |
|-----------|-------|
| Browser automation | `browser`, `playwright`, `puppeteer` |
| GitHub integration | `github`, `git`, `pr`, `issue` |
| Testing/smoke | `test`, `smoke`, `regression`, `jest` |
| Deployment/release | `deploy`, `release`, `publish` |
| Documentation | `docs`, `markdown`, `api` |
| Security audit | `security`, `audit`, `secret`, `scan` |
| API integration | `api`, `rest`, `graphql`, `http` |
| Data processing | `json`, `csv`, `parse`, `transform` |

## Security Policy

- Third-party skills are UNTRUSTED by default
- Never install without inspecting SKILL.md
- Secret requirements must be flagged
- Obfuscated scripts are a red flag (REJECT)
- Credential access skills require explicit approval (REJECT otherwise)
- Crypto/wallet skills are REJECTED
- Quality Governor approval required for risky skills

## Maintenance

- Run `openclaw skills check` after installing/updating skills
- Update this registry after each skill change
- Review installed skills quarterly for security updates
