# WebStudio Skill Registry

## Overview

This document tracks OpenClaw skills known to WebStudio, including installed skills, organism-specific skills, install/update history, and missing requirements.

Last updated: 2026-05-05

## Currently Known Local Skills

| Skill | Status | Source | Notes |
|-------|--------|--------|-------|
| gh-issues | ✅ Ready | openclaw-bundled | GitHub issues, PRs, reviews |
| github | ✅ Ready | openclaw-bundled | GitHub CLI (gh) operations |
| healthcheck | ✅ Ready | openclaw-bundled | Host security audit |
| lossless-claw | ✅ Ready | openclaw-extra | Session history recall |
| node-connect | ✅ Ready | openclaw-bundled | OpenClaw node pairing |
| session-logs | ✅ Ready | openclaw-bundled | Session log analysis |
| skill-creator | ✅ Ready | openclaw-bundled | Create/edit skills |
| taskflow | ✅ Ready | openclaw-bundled | Multi-step task coordination |
| taskflow-inbox-triage | ✅ Ready | openclaw-bundled | Inbox triage pattern |
| tmux | ✅ Ready | openclaw-bundled | Tmux remote control |
| video-frames | ✅ Ready | openclaw-bundled | FFmpeg frame extraction |
| weather | ✅ Ready | openclaw-bundled | Weather forecasts |

**Total:** 12 ready/eligible skills
**Disabled:** 41 skills (not needed for current WebStudio tasks)
**Missing Requirements:** 0

## Organism Skills

These skills are specific to WebStudio organism operation:

| Skill | Purpose | Location |
|-------|---------|----------|
| webstudio-skill-intelligence-check | Check installed/eligible/missing skills before tasks | `workspace/skills/webstudio-skill-intelligence-check/SKILL.md` |
| webstudio-organism-memory-check | Verify Supabase + /api/state + QMD + lossless | `scripts/webstudio-organism-memory-smoke.js` |

## Skill Install/Update History

| Date | Skill | Action | Result | Notes |
|------|-------|--------|--------|-------|
| 2026-05-05 | (baseline) | Scan | 12 ready | Initial Skill Intelligence scan |

## Missing Requirements

| Skill | Missing Requirement | Status |
|-------|---------------------|--------|
| (none) | — | All requirements satisfied |

## ClawHub Discovery

ClawHub search is operational. Use for task-specific skill discovery:

```bash
# Search for skills
openclaw skills search "<query>" --limit 20

# Inspect before install
openclaw skills info <slug>

# Install (after security review)
openclaw skills install <slug>
```

### Potential Future Skills

| Skill | Use Case | Risk Level | Status |
|-------|----------|------------|--------|
| telegram | Telegram bot integration | Medium (channel) | Not installed |
| slack | Slack integration | Medium (channel) | Not installed |
| discord | Discord integration | Medium (channel) | Not installed |
| gog | Google Workspace API | High (secrets) | Not installed |
| notion | Notion API | Medium (secrets) | Not installed |

## Policy Reference

See `docs/webstudio-skill-intelligence-agent.md` for:
- Auto-install policy
- Approval requirements
- Skill Intelligence agent workflow

## Scan Script

Run manual scan:
```bash
node scripts/webstudio-skill-intelligence-scan.js
```

Report location:
```
/tmp/webstudio-demo/skill-intelligence-report.json
```

## Daily Timer

A systemd timer runs the scan daily:
```bash
systemctl --user status webstudio-skill-intelligence.timer
```
