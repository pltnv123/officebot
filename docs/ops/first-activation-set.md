# First Activation Set

## Phase 1 Families
- technical-director
- release-manager
- qa-lead
- devops-engineer
- lead-programmer

## Why Phase 1
These five families provide oversight, release control, quality verification, infrastructure reliability, and implementation leadership—exactly the foundation we need before enabling more specialized agents.

## Allowed Activities
- Technical governance, release gating, verification planning, pipeline automation, and code strategy for their respective domains.
- Coordinating with supervisors, logging decisions in docs/ops, and keeping telemetry updated.

## Not Allowed Yet
- Unity specialist work, team expansion (Unity/addressables/shader) and wide-reaching agent orchestration remain paused.
- Global runtime changes or unbounded automation that would touch queue/watchdog/cron systems are deferred until later phases.

## Why Unity Specialists Wait
Unity-focused families require shared art/engine assets and runtime hooks that should only be activated after Phase 1 proves stable; delaying them keeps the platform manageable.

## Rule
All other imported agents remain vendor/reference only until their designated activation windows arrive.
