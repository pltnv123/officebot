# WebStudio Error Guardian Policy

## OPENCLAW-ERROR-GUARDIAN-001

**Purpose:** Prevent WebStudio from repeating the same errors by maintaining institutional memory and automatic error matching.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Error Guardian Agent                       │
│  (workspace-memory SOUL.md)                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              /home/antonbot/.shared/LESSONS.md               │
│              Canonical Error Memory                          │
│                                                              │
│  LESSON-001: Never trust stale summaries                     │
│  LESSON-002: Browser UI bugs require browser proof           │
│  LESSON-003: Never report milestone complete without push    │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Apply fix → Verify → Report                     │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

### Step 1: Read LESSONS.md

```bash
cat /home/antonbot/.shared/LESSONS.md
```

### Step 2: Match Error

Search for symptom patterns:
- `Cannot read properties of null` → LESSON-005
- `artifact not found` → LESSON-004
- `session file locked` → Check LESSONS.md
- Browser console errors → LESSON-002

### Step 3: Apply Fix

Use prescribed fix from lesson:
- Optional chaining for null elements
- Correct artifact ID format
- Server restart command
- Browser automation for UI bugs

### Step 4: Verify

Run relevant verification:
- Smoke test
- Browser proof
- Server health check
- Git push status

### Step 5: Report

Report in Russian:
- Error matched: LESSON-XXX
- Fix applied
- Verification proof
- Or: Novel error → new lesson added

## Lesson Format

```markdown
## LESSON-XXX: <Title>

**SYMPTOM:** <What the error looks like>

**CAUSE:** <Root cause>

**FIX:** <Exact fix command or code change>

**PREVENTION:** <How to avoid in future>
```

## Current Lessons

| Number | Title | Category |
|--------|-------|----------|
| 001 | Never trust stale summaries | lossless-claw |
| 002 | Browser UI bugs require browser proof | QA |
| 003 | Never report milestone complete without push | Milestone discipline |
| 004 | Use project_artifact_id, not order_id | Live run contract |
| 005 | addEventListener on null elements | UI bugs |
| 006 | Live terminal panel visibility | UI bugs |
| 007 | Unsafe code detection false positives | Safety validator |
| 008 | Never skip smoke tests | QA |
| 009 | Server restart after UI/backend changes | Server lifecycle |
| 010 | Do not repeat old milestone reports | Milestone discipline |
| 011 | Manual QA blockers outrank features | Priority |
| 012 | Never print secrets | Safety |
| 013 | State substrate priority | Knowledge layer |

## Adding New Lessons

When a novel error occurs:

1. **Document immediately:**
   - SYMPTOM: What happened
   - CAUSE: Why it happened
   - FIX: What fixed it
   - PREVENTION: How to avoid

2. **Assign sequential number:**
   - Check last LESSON-XXX in file
   - Increment by 1

3. **Append to LESSONS.md:**
   - Never overwrite existing lessons
   - Keep format consistent

4. **Update MEMORY.md:**
   - Add to key rules summary

5. **Verify lesson works:**
   - Next time same error occurs → lesson should match

## Integration with Multi-Agent Workflow

### Planner Agent
- Check LESSONS.md before planning milestones
- Avoid known error patterns

### Backend Agent
- Apply LESSON-004 (artifact IDs)
- Apply LESSON-009 (server restart)
- Apply LESSON-012 (no secrets)

### Frontend Agent
- Apply LESSON-002 (browser proof)
- Apply LESSON-005 (optional chaining)
- Apply LESSON-006 (terminal visibility)

### QA Agent
- Apply LESSON-008 (no skipped smokes)
- Apply LESSON-002 (browser proof)
- Verify fixes match lessons

### Memory Agent (Error Guardian)
- Primary responsibility: maintain LESSONS.md
- Match errors to lessons
- Add new lessons
- Verify fixes

### Orchestrator
- Route errors to Memory Agent
- Ensure lessons are applied
- Prevent scope creep on error fixes

## State Substrate

| Layer | Role | Location |
|-------|------|----------|
| **LESSONS.md** | Canonical error memory | `/home/antonbot/.shared/LESSONS.md` |
| **MEMORY.md** | Quick reference | `/home/antonbot/.openclaw/workspace-memory/MEMORY.md` |
| **SOUL.md** | Agent identity | `/home/antonbot/.openclaw/workspace-memory/SOUL.md` |
| **lossless-claw** | Session context | `~/.openclaw/extensions/lossless-claw/` |
| **Git history** | Fix commits | `office/` repo |

## Safety Constraints

1. **Never overwrite LESSONS.md** — Append only
2. **Never claim fix without verification** — Smoke/browser proof required
3. **Never skip smoke tests** — Smokes are definition of done
4. **Never print secrets** — Redact SERVICE_ROLE, SUPABASE_KEY, etc.
5. **Never trust stale summaries** — Use `lcm_expand_query` for exact details

## Verification Commands

### Check LESSONS.md exists
```bash
cat /home/antonbot/.shared/LESSONS.md
```

### Check workspace-memory config
```bash
ls -la /home/antonbot/.openclaw/workspace-memory/
cat /home/antonbot/.openclaw/workspace-memory/SOUL.md
cat /home/antonbot/.openclaw/workspace-memory/MEMORY.md
```

### Run smoke tests
```bash
cd /home/antonbot/.openclaw/workspace/office
node scripts/webstudio-browser-script-manual-flow-smoke.js
node scripts/webstudio-demo-page-js-syntax-smoke.js
```

## Related Docs

- `docs/webstudio-runtime-knowledge-substrate.md` — State priority policy
- `docs/webstudio-multi-agent-orchestration.md` — Agent responsibilities
- `~/.openclaw/workspace/SOUL.md` — Core behavior rules
- `~/.openclaw/extensions/lossless-claw/skills/lossless-claw/SKILL.md` — Memory recall

## Future Enhancements

1. **Automated lesson matching:**
   - Error pattern → lesson suggestion
   - NLP-based symptom matching

2. **Lesson effectiveness tracking:**
   - Count how often each lesson is applied
   - Retire lessons that haven't matched in N months

3. **Cross-agent lesson sync:**
   - All agents read relevant lessons at session startup
   - Lesson reminders in AGENTS.md

4. **Lesson-based smoke generation:**
   - Auto-generate regression smoke from LESSON-XXX
   - Prevent recurrence automatically
