# AGENTS.md — Agent Roles & Scene Conditions
Last updated: 2026-03-10

## Identity
Autonomous AI developer for OfficeBot WebGL project.
Goal: build a premium Pixar-quality functional hub, then implement live features.
Work independently. Fix own mistakes. Escalate only when truly stuck.

## Current Phase: PHASE 2 — Functionality
Phase 1 (Visual) is COMPLETE as of commit d200c44.
Do NOT regress visual quality while implementing functionality.

## Agent Roles

### CHIEF (gold) — pos(0.5, 0, 2.5)
- Role: orchestrates all agents, owns backlog priority
- Behavior: stays at main desk, faces camera

### PLANNER (blue) — pos(-1.5, 0, 2.5)
- Role: breaks tasks into steps, writes plans
- Behavior: near main desk, faces camera

### WORKER (green) — pos(-4, 0, 4)
- Role: executes code changes, commits, deploys
- Behavior: at dispatch zone left side

### TESTER (light green) — pos(4, 0, 4)
- Role: verifies output, runs quality gates
- Behavior: at monitoring zone right side

## Scene Success Conditions (Phase 2)
Check at start of every cycle:
1. All 4 agents visible on screen simultaneously
2. Ambient warm orange Color(1.0, 0.88, 0.65) — no cold/gray lighting
3. Task board visible with 6 columns (INBOX/QUEUE/PLAN/WORK/REVIEW/DONE)
4. Dispatch zone visible left side with orange glow
5. Monitoring zone visible right side with green glow
6. Room 2 door visible top-right with orange frame
7. Navigation paths visible on floor

IF any condition FALSE → fix visual before any functional work.

## Scene Architecture (current, do not revert)
- SetupCamera(): pos(0,13,-9) rot(47,0,0) FOV=63
- BuildRoom(): floor, walls, ceiling, back wall
- BuildZones(): dispatch left, monitoring right, main desk center, task board back
- BuildAgents(): CHIEF, PLANNER, WORKER, TESTER with idle bob animation

## Phase 2 Task Rules
FUNC-001 (live task cards):
- Backend API already exists — connect board cards to it
- Cards update without page reload
- Each card shows: task ID, title, assignee color dot

FUNC-002 (robot animation):
- Idle bob already exists — enhance with subtle rotation
- Working state: faster bob + eye glow pulse
- Moving state: smooth lerp to target position

FUNC-003 (Room 2):
- Accessible via door top-right
- Contains: secondary workspace, 2 agents
- Orange glow frame matches reference

FUNC-004 (NavMesh pathfinding):
- Agents move to task zone when assigned work
- Smooth path following, no clipping through objects
- Return to idle position when task complete

## Quality Standard: Premium
Every feature must feel polished:
- Smooth animations (no snapping)
- Consistent warm color palette
- No z-fighting or visual glitches
- Performance: stable 60fps in WebGL

## Self-Check Before Every Commit
Ask: "Does this change make the product better and more premium?"
YES → commit with correct prefix
NO → rethink approach
