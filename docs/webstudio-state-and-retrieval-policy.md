# WebStudio State and Retrieval Policy

## OPENCLAW-WORKSPACE-BRAIN-004

**Goal:** Document QWD/QMD, lossless-claw, and Supabase usage policy for WebStudio development.

## State Sources

WebStudio development uses multiple state sources with different purposes:

| Source | Purpose | Access | Source of Truth For |
|--------|---------|--------|---------------------|
| **QWD/QMD** | Durable state, project memory | `GET/POST /api/state` | Project metadata, decisions, milestones |
| **lossless-claw** | Session history, summary health | `lcm_*` tools, `/lossless` | Conversation history, recall |
| **Supabase** | Runtime persistence, artifacts | Direct DB or API | Artifact library, run history, delivery |
| **Git** | Code versioning | `git` commands | Source code, docs, configs |
| **Workspace files** | Agent instructions | File system | Agent behavior, workflows |

## QWD/QMD (Quantum Workspace Document / Memory)

### What it is

QWD/QMD is a durable state layer for WebStudio project metadata:
- Milestone decisions
- Architecture choices
- Risk register
- Operating agreements
- Stakeholder briefings

### API Contract

**Read state:**
```bash
curl http://127.0.0.1:8787/api/state
```

**Write state:**
```bash
curl -X POST http://127.0.0.1:8787/api/state \
  -H "Content-Type: application/json" \
  -d '{"key": "current_milestone", "value": "WEBSTUDIO-033"}'
```

### Usage Policy

**Use QWD/QMD for:**
- Recording milestone completion
- Documenting architecture decisions (ADRs)
- Tracking risk register updates
- Storing operating agreements
- Preserving stakeholder briefings

**Do NOT use QWD/QMD for:**
- Temporary scratch data
- Large binary artifacts (use Supabase)
- Session transcripts (use lossless-claw)
- Code snapshots (use Git)

### Example Flow

```javascript
// Record milestone decision
await fetch('/api/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'milestone_webstudio_033',
    value: {
      name: 'Script Input Support',
      status: 'completed',
      commit: 'abc123',
      date: '2026-05-03'
    }
  })
});
```

## lossless-claw

### What it is

lossless-claw is an OpenClaw plugin for:
- Session history preservation
- Summary health monitoring
- High-confidence recall from compacted history

### Commands

**Health check:**
```bash
/lossless
# or
/lcm
```

**Diagnostics:**
```bash
/lossless doctor
```

**Cleanup guidance:**
```bash
/lossless doctor clean
```

### Recall Tools

**lcm_grep:** Search session history
```javascript
lcm_grep(query: "database migration", mode: "full_text", sort: "relevance")
```

**lcm_expand_query:** Deep recall with sub-agent
```javascript
lcm_expand_query(
  query: "live terminal",
  prompt: "What SSE event sequence was decided?"
)
```

**lcm_describe:** Inspect specific summary
```javascript
lcm_describe(summaryId: "sum_xxx")
```

### Usage Policy

**Use lossless-claw for:**
- Recalling conversation details
- Verifying exact commands/SHAs/paths
- Diagnosing summary corruption
- Session lifecycle management (`/new`, `/reset`)

**Do NOT use lossless-claw for:**
- Project state persistence (use QWD/QMD)
- Artifact storage (use Supabase)
- Code versioning (use Git)

### Integration with WebStudio

lossless-claw operates at the OpenClaw layer, not WebStudio application layer. It is used by the development agent, not by WebStudio end users.

## Supabase

### What it is

Supabase is the runtime persistence layer for WebStudio:
- Artifact library
- Run history
- Delivery bundles
- Preview evidence

### Usage Policy

**Use Supabase for:**
- Storing generated artifacts (script.py, bot.py, index.html)
- Recording run results (stdout, stderr, exit_code)
- Persisting delivery bundles (ZIP exports)
- Capturing QA evidence (screenshots, console logs)

**Do NOT use Supabase for:**
- Agent instructions (use workspace files)
- Conversation history (use lossless-claw)
- Project decisions (use QWD/QMD)
- Source code versioning (use Git)

### Schema Overview

**Tables:**
- `webstudio_orders` — Order metadata
- `webstudio_artifacts` — Generated artifacts
- `webstudio_runs` — Execution history
- `webstudio_previews` — Preview evidence
- `webstudio_delivery_bundles` — Export packages

### Example Query

```sql
-- Get latest run for artifact
SELECT * FROM webstudio_runs
WHERE artifact_id = 'ws-project-artifact-script-123'
ORDER BY run_number DESC
LIMIT 1;
```

## Git

### What it is

Git is the source code versioning system:
- Backend code
- Frontend code
- Smoke tests
- Documentation
- Configuration

### Usage Policy

**Use Git for:**
- Source code changes
- Documentation updates
- Config changes (non-secret)
- Smoke test additions

**Do NOT use Git for:**
- Secrets (.env files)
- Large binary artifacts
- Temporary build outputs
- Session transcripts

### Commit Discipline

**Commit message format:**
```
<MILESTONE>: <short description>

- <detail 1>
- <detail 2>
```

**Example:**
```
WEBSTUDIO-033: Add script input support

- POST /api/demo/webstudio-order/project-artifact/:artifactId/run-live/:runId/stdin
- UI panel for stdin input
- Smoke test for stdin flow
```

## Workspace Files

### What it is

Workspace files are agent instructions:
- SOUL.md — Agent identity and mission
- AGENTS.md — Operating instructions
- USER.md — User expectations
- TOOLS.md — Tooling reference
- HEARTBEAT.md — Status check guidance
- BOOT.md — Startup checklist
- MEMORY.md — Persistent memory

### Usage Policy

**Use workspace files for:**
- Agent behavior configuration
- Workflow documentation
- Tooling reference
- Startup/checklist guidance

**Do NOT use workspace files for:**
- Runtime state (use QWD/QMD/Supabase)
- Secrets (use .env with gitignore)
- Large data (use Supabase)

## Retrieval Hierarchy

When answering questions, use this retrieval order:

1. **Current session context** — Most recent, highest confidence
2. **lossless-claw recall** — For compacted conversation history
3. **QWD/QMD** — For project decisions and milestones
4. **Git history** — For code changes and commits
5. **Supabase** — For runtime artifacts and run history
6. **Workspace files** — For agent instructions

### Example Retrieval Flow

**Question:** "What SSE event sequence was decided for live terminal?"

1. Check current session context
2. If not found, use `lcm_expand_query(query: "live terminal", prompt: "What SSE event sequence was decided?")`
3. If still unclear, check QWD/QMD for architecture decisions
4. Verify against actual implementation in Git

**Question:** "What is the current milestone?"

1. Check QWD/QMD: `GET /api/state?key=current_milestone`
2. Verify against Git: `git log --oneline -1`
3. Cross-reference with USER.md latest message

## Safety Constraints

1. **Never trust stale summaries** — Use lossless-claw recall for exact details
2. **Never store secrets in QWD/QMD** — Use environment variables
3. **Never mix state layers** — Each layer has specific purpose
4. **Always verify with evidence** — Git commit, Supabase record, or QWD/QMD entry

## Related Docs

- OPENCLAW-WORKSPACE-BRAIN-001: Main workspace update
- OPENCLAW-WORKSPACE-BRAIN-003: Sub-agent workspace alignment
- `~/.openclaw/extensions/lossless-claw/skills/lossless-claw/SKILL.md`
- `docs/webstudio-multi-agent-orchestration.md`
- `docs/webstudio-universal-artifact-lifecycle.md`
