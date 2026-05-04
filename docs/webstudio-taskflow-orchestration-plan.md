# WebStudio TaskFlow Orchestration Plan

## Overview

WebStudio uses OpenClaw TaskFlow for durable, multi-step task orchestration with waits, child tasks, and state tracking.

## TaskFlow Patterns

### Pattern 1: Inbox Triage

Route incoming requests to appropriate specialist:

```
User Request → Triage → Route to Specialist → Wait for Response → Summarize
```

**Implementation:** `workspace-taskflow-inbox-triage/SKILL.md`

### Pattern 2: Multi-Step Milestone

Coordinate specialist workflow:

```
Task Contract → Requirements → Architecture → Build → Test → Review → Quality Gate
```

**Implementation:** Spawn subagents for each specialist, wait for completion, chain outputs.

### Pattern 3: Wait for User Reply

Pause execution until user responds:

```
Agent Question → Wait → User Reply → Continue
```

**Implementation:** Use TaskFlow wait state, resume on user message.

### Pattern 4: Parallel Specialist Tasks

Run independent tasks in parallel:

```
        → Security Audit →
Request → UX Review      → Merge Results → Quality Gate
        → Test Strategy →
```

**Implementation:** Spawn multiple subagents, wait for all, merge results.

## Subagent Orchestration

### Spawn Isolated Subagent

```bash
sessions_spawn(
  task="<specialist instruction>",
  label="<workspace-name>",
  runtime="subagent",
  context="isolated"  # or "fork" if transcript needed
)
```

### Wait for Completion

Subagents are push-based — they auto-announce when done.

Use `sessions_yield` to receive results.

### Steer/Kill Subagents

```bash
subagents(action="list")    # Check status
subagents(action="steer", target="<id>", message="<instruction>")
subagents(action="kill", target="<id>")
```

## State Management

### TaskFlow State

| State | Meaning |
|-------|---------|
| PENDING | Task queued, not started |
| RUNNING | Task in progress |
| WAITING | Waiting for external event (user reply, etc.) |
| DONE | Task completed successfully |
| FAILED | Task failed with error |
| CANCELLED | Task cancelled by user |

### State Persistence

- TaskFlow state persisted in OpenClaw runtime
- Use `openclaw tasks` to view active tasks
- Use lossless-claw for session continuity

## Specialist Handoff Protocol

### Handoff Message Format

```markdown
## Handoff from <Specialist A> to <Specialist B>

**Task:** <task name>

**Completed:**
- <item 1>
- <item 2>

**Output:**
- <document/location>

**Next Action Required:**
- <what Specialist B should do>

**Constraints:**
- <any limitations>
```

### Example: Requirements → Architecture

```markdown
## Handoff from Requirements Analyst to Solution Architect

**Task:** Delivery Page UX Stage 1

**Completed:**
- PRD with acceptance criteria
- Scope defined (visual only, no editing)
- Risks documented (no regression)

**Output:**
- `docs/requirements/delivery-ux-stage-1-prd.md`

**Next Action Required:**
- Design component architecture
- Specify data flow
- Identify integration points

**Constraints:**
- No breaking changes to existing API
- Must support 60fps rendering
```

## Error Handling

### Subagent Failure

If subagent fails:
1. Check error message
2. Retry once with clearer instruction
3. If still fails, escalate to user
4. Document failure in MEMORY.md

### Timeout

If subagent times out:
1. Continue with manual verification
2. Mark limitation in report
3. Do not block entire milestone

### Infinite Loop

If subagent appears stuck:
1. Check subagent status
2. Send steer message with explicit stop condition
3. If no response, kill and report

## Quality Governor Integration

Quality Governor runs after all specialist tasks complete:

```
All Specialists Done → Quality Governor 6-Layer Verify → Verdict
```

Quality Governor can reject and route back to specific specialist.

## See Also

- `skills/taskflow/SKILL.md` — TaskFlow skill
- `skills/taskflow-inbox-triage/SKILL.md` — Inbox triage pattern
- `docs/webstudio-quality-loop-protocol.md` — Quality loop stages
