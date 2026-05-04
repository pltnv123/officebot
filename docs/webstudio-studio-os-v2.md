# WebStudio Studio OS v2

## OPENCLAW-WEBSTUDIO-STUDIO-OS-V2-001

**Goal:** Build a professional autonomous development studio operating system with layered verification, quality enforcement, and multi-agent orchestration.

## Vision

WebStudio is not just a code generator — it is an **autonomous development studio** that operates like a professional software organization with:

- Clear role separation (Planner, Builder, Reviewer, QA, Governor)
- Layered verification (static → smoke → regression → runtime → browser → delivery)
- Quality gates that cannot be bypassed
- Error memory that prevents repeated failures
- Honest blocker reporting over fake confidence

## Operating Principles

### 1. Quality over speed

- No milestone is complete without verification
- curl-only proof is insufficient for UI tasks
- Browser proof required for click-flow verification
- Delivery proof required for artifact workflows

### 2. Layered verification

Every milestone must pass through verification layers:

| Layer | Name | Purpose |
|-------|------|---------|
| A | Static/Code Sanity | Verify exact labels, contracts, code presence |
| B | Focused Task Smoke | Task-specific behavioral test |
| C | Regression Verification | Ensure no breakage of existing functionality |
| D | Runtime Health | Server/port/endpoint health |
| E | Browser/Interaction Proof | Real click flows, console error checks |
| F | Delivery/Product Proof | End-to-end artifact workflow verification |

### 3. Hard-gate quality model

Quality Governor outputs exactly one status:

| Status | Meaning |
|--------|---------|
| **ACCEPTED** | All criteria met, all proofs present, no critical regression |
| **CONDITIONALLY ACCEPTED** | Non-critical limitations explicitly listed and acceptable |
| **REJECTED — REWORK REQUIRED** | Requirements incomplete, proof insufficient, regression detected |
| **BLOCKED** | Environmental/runtime/tooling blocker; honest report |

### 4. Bounded rework loops

- Up to 3 focused rework cycles per milestone
- More cycles only if clear progress and narrow remaining issues
- If not converging after 3 cycles, report **BLOCKED** with exact blocker summary

### 5. Error memory

Error Guardian maintains a living registry of known failure patterns:
- Artifact identity mismatches
- Delivery route 404s
- EventSource 404s after live run
- Open Delivery guard failures
- Restore functionality breaking
- File tree label contract mismatches
- Editable whitelist violations
- Run History variable scope errors
- Browser UI bugs hidden by curl success
- Premature completion claims

### 6. Honest blocker policy

Prefer **BLOCKED** over fake confidence. Report honestly when:
- Environmental/runtime/tooling blocker prevents verification
- After 3 rework cycles critical issues remain
- Required tools unavailable (e.g., browser automation for UI)
- Cannot proceed without making false claims

## Multi-Agent Orchestration

### Execution chain

```
User → Planner/CTO → Builder(s) → Reviewer(s) → Browser Reviewer (if UI) → Error Guardian (if relevant) → Quality Governor (final gate) → completion
```

### Sub-Agent Workspaces (9)

| Workspace | Role | Location |
|-----------|------|----------|
| workspace-planner | Scope / PRD / acceptance criteria | `~/.openclaw/workspace-planner/` |
| workspace-worker | Bounded implementation | `~/.openclaw/workspace-worker/` |
| workspace-reviewer | Code/regression reviewer | `~/.openclaw/workspace-reviewer/` |
| workspace-vreviewer | Browser/manual-flow reviewer | `~/.openclaw/workspace-vreviewer/` |
| workspace-builder | Deploy & verify | `~/.openclaw/workspace-builder/` |
| workspace-memory | Continuity and retrieval | `~/.openclaw/workspace-memory/` |
| workspace-error-guardian | Repeated-bug defense | `~/.openclaw/workspace-error-guardian/` |
| workspace-quality-governor | Final gate & rework authority | `~/.openclaw/workspace-quality-governor/` |
| workspace (main) | Orchestrator + full-stack | `~/.openclaw/workspace/` |

### Agent responsibilities

| Agent | Responsibilities |
|-------|-----------------|
| **Planner/CTO** | Clarify product intent, refine spec, break into milestones, protect architecture |
| **Builder** | Bounded implementation, smallest correct change, update tests |
| **Reviewer** | Code quality, regression prevention, contract compliance |
| **Browser Reviewer (vreviewer)** | Browser automation, click-flow verification, console error checks |
| **Error Guardian** | Pattern detection, lesson surfacing, escalation to Governor |
| **Quality Governor** | Layered verification, hard-gate verdict, rework enforcement |
| **Orchestrator (main)** | Route tasks, enforce sequential milestones, keep tests green |

## Proof Matrix

| Task Type | Required Proof |
|-----------|----------------|
| **Backend/API** | Static review + task smoke + regression + runtime health + endpoint verification |
| **UI** | Static review + task smoke + regression + runtime + **browser proof** + console check |
| **Delivery/workspace** | Static review + task smoke + regression + runtime + **delivery page proof** + artifact flow |
| **Persistence/state** | Static review + task smoke + regression + **post-refresh proof** + no null/undefined errors |
| **Orchestration/brain** | Static review + role alignment + no circular dependencies |

### Browser proof requirements

**curl-only is INSUFFICIENT for UI acceptance.**

Required for UI tasks:
- Playwright or Puppeteer browser automation
- Real click-flow verification
- Console error checks
- Page runtime error checks
- jsdom fallback ONLY if no browser automation available

### Delivery/artifact proof requirements

Required for delivery tasks:
- Delivery page opens without 404
- All action buttons work (Run Script, Download ZIP, Run History, Open Delivery)
- File preview works
- No `artifactId is not defined` errors
- No `JSON.parse undefined` errors
- Artifact identity correct (`project_artifact_id` canonical for project artifact routes)

## Artifact Lifecycle

Every vertical should move toward:

```
intake → plan → generate → edit/review → run/preview/test → QA → version → restore → delivery → ZIP/export → history/audit
```

Do not create vertical-specific shortcuts that skip:
- versioning
- run/preview output
- history
- delivery
- export

## Current Verticals

### script (implemented)
- editable script.py
- Run Live
- streaming stdout/stderr
- Stop
- stdin/input()
- run history
- versions
- restore
- ZIP export
- client delivery

### telegram_bot (implemented)
- editable bot.py
- dry-run
- transcript
- versions
- restore
- ZIP export
- client delivery
- no real Telegram token in demo

### landing_page (implemented)
- editable index.html
- preview
- versions
- restore
- ZIP export
- client delivery
- no unsafe HTML execution

### Planned verticals (not implemented)
- web_app
- backend_service
- Android
- iOS

## Safety Rules

Never:
- expose secrets
- commit .env with secrets
- use real Telegram tokens in demo tests
- run arbitrary user shell code
- allow unsafe generated Python imports:
  - os, subprocess, socket, requests, urllib, shutil
  - eval, exec, __import__, system, Popen

Allow safe script imports when needed:
- argparse, sys, csv, json, re, time

Do not block normal string literals, including Russian text and profanity inside print("...").

## Testing Principles

Smokes must be deterministic:
- create fresh artifacts when testing versions
- avoid relying on old artifact library entries
- fail on skipped critical assertions
- catch browser runtime errors for UI tasks

## Known Limitations

The Studio OS:
- **Cannot guarantee metaphysical "perfect code"** — no system can
- **Can greatly raise quality and verification confidence** through layered enforcement
- **Must expand complexity support incrementally and honestly** — cannot magically solve arbitrary complexity
- **Depends on available tooling** — browser automation, test frameworks, runtime access
- **Cannot bypass environmental blockers** — must report honestly when blocked

## Quality Governor Verdict Format

Every final milestone report must include:

```markdown
QUALITY GOVERNOR VERDICT:
- ACCEPTED / CONDITIONALLY ACCEPTED / REJECTED / BLOCKED

WHY:
- concise explanation

EVIDENCE:
- list of proofs
- tests PASS/FAIL
- browser proof (if required)
- runtime proof
- commit hash
- push status

REMAINING LIMITATIONS:
- explicit remaining limitations

NEXT SAFE STEP:
- next milestone recommendation
```

## Related Docs

- docs/webstudio-quality-governor.md — Quality Governor specification
- docs/webstudio-acceptance-checklist-template.md — Reusable checklist template
- docs/webstudio-multi-agent-orchestration.md — Multi-agent patterns
- docs/webstudio-state-and-retrieval-policy.md — State substrate policy
- docs/webstudio-universal-artifact-lifecycle.md — Universal lifecycle
