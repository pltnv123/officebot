# OpenClaw 24x7 Plan

- Bounded execution windows: break work into short steps with explicit triggers.
- File-backed state is the source of truth; every decision is logged under docs/ops.
- Supervisor/recovery flows review state after timeouts, replaying minimal actions.
- Role routing: map requests to imported families (CCGS leadership, agency-engineering, etc.).
- Telegram is control-only; execution engine reads state files and acts without direct chat prompts.
