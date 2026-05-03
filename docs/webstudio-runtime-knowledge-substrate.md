# WebStudio Runtime and Knowledge Substrate

## OPENCLAW-WORKSPACE-BRAIN-004B

**Canonical policy for state, knowledge, and runtime truth in WebStudio development.**

## Source Priority

When determining truth or making decisions, use this priority order:

1. **Latest user instruction** — Immediate task source
2. **Active workspace instructions** — SOUL.md, AGENTS.md, USER.md, TOOLS.md, HEARTBEAT.md, BOOT.md
3. **Current code, tests, and browser/runtime evidence** — Implementation truth
4. **Supabase durable runtime state** — When applicable
5. **QWD/QMD retrieved knowledge** — Project knowledge layer
6. **lossless-claw memory** — Context continuity layer
7. **Git history/docs** — Committed history
8. **Model recall** — Last resort

## Supabase

**Role:** Durable runtime/project state when applicable.

**Usage:**
- Artifact library
- Run history
- Delivery bundles
- Preview evidence

**Policy:**
- Verify schema before writing
- Never print secrets
- Clearly state local-only fallback if unavailable
- Use for structured runtime state that must survive restarts

**Availability check:**
```bash
env | grep -Ei "SUPABASE" | sed -E 's/=.*/=<redacted>/' || echo "No SUPABASE env vars"
```

## QWD/QMD

**Role:** Retrieval/project knowledge layer.

**Usage:**
- Milestone decisions
- Architecture choices (ADRs)
- Risk register
- Operating agreements
- Stakeholder briefings

**Policy:**
- Use before inventing architecture
- Do not store secrets
- API: `GET/POST /api/state`

**Availability check:**
```bash
curl http://127.0.0.1:8787/api/state 2>/dev/null || echo "QWD/QMD endpoint unavailable"
```

## lossless-claw

**Role:** Memory/context continuity layer.

**Usage:**
- Session history preservation
- Summary health monitoring
- High-confidence recall from compacted history
- Stale milestone prevention

**Policy:**
- Use `lcm_expand_query` for exact details
- Use for session recovery
- Do not trust stale summaries

**Commands:**
```bash
/lossless        # Health check
/lcm             # Alias
/lossless doctor # Diagnostics
```

**Recall tools:**
- `lcm_grep` — Search session history
- `lcm_expand_query` — Deep recall with sub-agent
- `lcm_describe` — Inspect specific summary

## GitHub

**Role:** Committed source/docs history.

**Usage:**
- Source code versioning
- Documentation
- Smoke tests
- Config changes (non-secret)

**Policy:**
- Commit discipline: `<MILESTONE>: <description>`
- Never commit secrets
- Push after each milestone

## Browser/Runtime Proof

**Role:** Authoritative for UI behavior.

**Usage:**
- Manual flow smoke tests
- Browser automation (Playwright/Puppeteer)
- Console error verification

**Policy:**
- Browser UI bugs require browser proof
- Curl/syntax checks are not enough for click-flow bugs
- Fail smoke if console has runtime errors

## Local Demo Storage

**Role:** Bounded demo artifacts when documented.

**Usage:**
- `/tmp/webstudio-demo/` — Server logs and PID
- Workspace memory files
- Temporary build outputs

**Policy:**
- Document local-only storage
- Do not rely on for durable state
- Clear when stale

## Extended Policy

For detailed state source table, retrieval hierarchy, and safety constraints, see:

- `docs/webstudio-state-and-retrieval-policy.md` — Full policy with API contracts and examples

## Multi-Agent Integration

### Shared Substrate Responsibilities

**Planner Agent:**
- Must consult QWD/QMD and docs before inventing architecture
- Use lossless-claw to avoid stale milestone loops

**Backend Agent:**
- Must verify Supabase schema before durable state changes
- Use QWD/QMD for project decisions

**Frontend Agent:**
- Must use browser proof for UI changes
- Verify against current code/tests

**QA Agent:**
- Must include Supabase/QWD/lossless checks when relevant
- Browser proof required for UI bugs

**Memory Agent:**
- Must use lossless-claw for session recovery
- Prevent stale milestone loops

**Orchestrator:**
- Resolve conflicts between:
  - Latest user instruction
  - Workspace policy
  - Current code/tests
  - Supabase state
  - QWD/QMD knowledge
  - lossless-claw memory
  - Git history

## Safety Constraints

1. **Never print secrets:**
   - SERVICE_ROLE keys
   - SUPABASE_KEY values
   - TOKEN= values
   - SECRET= values
   - PASSWORD= values

2. **Never trust stale summaries:**
   - Use `lcm_expand_query` for exact details

3. **Never mix state layers:**
   - Each layer has specific purpose

4. **Always verify with evidence:**
   - Git commit
   - Supabase record
   - QWD/QMD entry
   - Browser proof

## Related Docs

- `docs/webstudio-state-and-retrieval-policy.md` — Extended policy
- `docs/webstudio-multi-agent-orchestration.md` — Multi-agent patterns
- `docs/webstudio-universal-artifact-lifecycle.md` — Artifact lifecycle
- `~/.openclaw/extensions/lossless-claw/skills/lossless-claw/SKILL.md` — lossless-claw skill
