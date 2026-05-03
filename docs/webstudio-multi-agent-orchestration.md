# WebStudio Multi-Agent Orchestration

## OPENCLAW-MULTIAGENT-WEBSTUDIO-001

**Goal:** Enable controlled multi-agent execution workflow for WebStudio development using OpenClaw sub-agent capabilities.

## Current State

**Main Agent:** `/home/antonbot/.openclaw/workspace/`
- Role: Orchestrator + full-stack development
- Capabilities: Backend, Frontend, Script, Telegram Bot, Landing, QA

**Sub-Agent Workspaces (6):**
| Workspace | Role | Location |
|-----------|------|----------|
| workspace-builder | Deploy & verify | `~/.openclaw/workspace-builder/` |
| workspace-planner | Task breakdown | `~/.openclaw/workspace-planner/` |
| workspace-reviewer | Code review | `~/.openclaw/workspace-reviewer/` |
| workspace-vreviewer | Visual/UX review | `~/.openclaw/workspace-vreviewer/` |
| workspace-worker | Implementation | `~/.openclaw/workspace-worker/` |
| workspace-memory | Error handling | `~/.openclaw/workspace-memory/` |

All sub-agents updated (OPENCLAW-WORKSPACE-BRAIN-003) to reference WebStudio mission.

## OpenClaw Sub-Agent Capabilities

### sessions_spawn

Spawn isolated sub-agent sessions:

```bash
openclaw sessions spawn --task "<task description>" --label "<label>"
```

**Options:**
- `--task`: Task description (required)
- `--label`: Human-readable label for the session
- `--agent`: Agent ID override
- `--model`: Model override
- `--cwd`: Working directory (defaults to parent workspace)

**Programmatic API (in agent code):**
```javascript
await sessions_spawn({
  task: "Review code changes in backend/webStudioDemoPage.js",
  label: "review-webstudio-demo-page",
  runtime: "subagent",
  context: "isolated", // or "fork" for transcript sharing
  cwd: "/home/antonbot/.openclaw/workspace/office",
  timeoutSeconds: 300
});
```

### sessions_send

Send message to existing session:

```bash
openclaw sessions send --session-key "<key>" --message "<message>"
```

### sessions_list

List active sessions:

```bash
openclaw sessions list --active 60  # last 60 minutes
openclaw sessions list --all-agents
```

### subagents (in-agent tool)

Manage spawned sub-agents from within a session:

```javascript
await subagents({ action: "list" });
await subagents({ action: "steer", target: "<session-id>", message: "<instruction>" });
await subagents({ action: "kill", target: "<session-id>" });
```

## WebStudio Multi-Agent Workflow

### Pattern 1: Orchestrator + Specialist

```
User → Main Agent (Orchestrator)
         ↓
         ├→ workspace-planner (break down task)
         ├→ workspace-worker (implement)
         ├→ workspace-reviewer (review)
         ├→ workspace-builder (deploy)
         └→ workspace-vreviewer (visual QA)
```

**Example:**
```javascript
// Main agent spawns planner
const plan = await sessions_spawn({
  task: "Break down WEBSTUDIO-033: Add script input support into milestones",
  label: "plan-script-input",
  cwd: "/home/antonbot/.openclaw/workspace/office"
});

// Wait for plan
await sessions_yield();

// Spawn worker for first milestone
await sessions_spawn({
  task: "Implement script input support: stdin endpoint + UI panel",
  label: "implement-script-input",
  cwd: "/home/antonbot/.openclaw/workspace/office"
});
```

### Pattern 2: Parallel QA

```
Main Agent
    ↓
    ├→ workspace-reviewer (code review)
    ├→ workspace-vreviewer (visual review)
    └→ smoke tests (automated)
```

**Example:**
```javascript
// Spawn parallel reviews
await Promise.all([
  sessions_spawn({
    task: "Review code quality for script input feature",
    label: "code-review-input",
    cwd: "/home/antonbot/.openclaw/workspace/office"
  }),
  sessions_spawn({
    task: "Review UI/UX for script input panel",
    label: "visual-review-input",
    cwd: "/home/antonbot/.openclaw/workspace/office"
  })
]);

// Run smoke tests
await exec("node scripts/webstudio-live-script-stdin-smoke.js");
```

### Pattern 3: Background Deployment

```
Main Agent (coding)
    ↓
workspace-builder (deploy in background)
    ↓
Telegram notification when done
```

**Example:**
```javascript
// Start background deployment
await sessions_spawn({
  task: "Deploy WebStudio server and verify health",
  label: "deploy-webstudio",
  cwd: "/home/antonbot/.openclaw/workspace/office"
});

// Continue coding while deployment runs
// ...

// Check deployment status later
const status = await sessions_history({ sessionKey: "deploy-webstudio" });
```

### Pattern 4: Error Recovery

```
Main Agent
    ↓
Error detected
    ↓
workspace-memory (diagnose + fix)
    ↓
Main Agent (retry operation)
```

**Example:**
```javascript
try {
  await runSmokeTest();
} catch (error) {
  // Spawn memory agent to diagnose
  const diagnosis = await sessions_spawn({
    task: `Diagnose error: ${error.message}. Check LESSONS.md and suggest fix.`,
    label: "error-diagnosis",
    cwd: "/home/antonbot/.openclaw/workspace"
  });
  
  await sessions_yield();
  // Apply fix and retry
}
```

## Configuration Proposal

### Option A: Agent Routing Config

Add `~/.openclaw/agents.json`:

```json
{
  "agents": {
    "defaults": {
      "model": "ollama/qwen3.5:cloud",
      "workingDirectory": "/home/antonbot/.openclaw/workspace/office"
    },
    "specialists": {
      "planner": {
        "workspace": "/home/antonbot/.openclaw/workspace-planner",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 8000
      },
      "worker": {
        "workspace": "/home/antonbot/.openclaw/workspace-worker",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 16000
      },
      "reviewer": {
        "workspace": "/home/antonbot/.openclaw/workspace-reviewer",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 8000
      },
      "vreviewer": {
        "workspace": "/home/antonbot/.openclaw/workspace-vreviewer",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 8000
      },
      "builder": {
        "workspace": "/home/antonbot/.openclaw/workspace-builder",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 4000
      },
      "memory": {
        "workspace": "/home/antonbot/.openclaw/workspace-memory",
        "model": "ollama/qwen3.5:cloud",
        "maxTokens": 8000
      }
    }
  }
}
```

### Option B: Main Workspace Routing

Add routing logic to main workspace AGENTS.md:

```markdown
## Sub-Agent Routing

For multi-agent tasks, use sessions_spawn with appropriate workspace:

- Planning tasks → workspace-planner
- Implementation → workspace-worker
- Code review → workspace-reviewer
- Visual review → workspace-vreviewer
- Deployment → workspace-builder
- Error diagnosis → workspace-memory

Example:
await sessions_spawn({
  task: "...",
  label: "...",
  cwd: "/home/antonbot/.openclaw/workspace-worker"
});
```

## Safety Constraints

1. **Isolation:** Sub-agents start isolated by default. Use `context: "fork"` only when transcript sharing is required.

2. **Bounded Scope:** Each sub-agent has narrow specialization. Do not ask worker to plan or planner to code.

3. **Timeout:** Set `timeoutSeconds` to prevent runaway sessions (default: 300s).

4. **Workspace:** Sub-agents inherit parent workspace directory. Override with `cwd` if needed.

5. **Cleanup:** Use `cleanup: "delete"` for one-shot tasks, `cleanup: "keep"` for persistent sessions.

## Testing Multi-Agent Workflows

### Smoke Test: Spawn + Yield

```javascript
// scripts/webstudio-multi-agent-smoke.js
const { sessions_spawn, sessions_yield, sessions_history } = require('openclaw-tools');

async function main() {
  console.log("Spawning planner agent...");
  await sessions_spawn({
    task: "List 3 milestones for adding script input support",
    label: "test-planner-spawn",
    cwd: "/home/antonbot/.openclaw/workspace/office"
  });
  
  console.log("Waiting for planner...");
  await sessions_yield();
  
  console.log("Checking planner output...");
  const history = await sessions_history({ sessionKey: "test-planner-spawn" });
  const lastMessage = history.messages[history.messages.length - 1];
  
  if (lastMessage.content.includes("milestone")) {
    console.log("✅ Planner spawned and responded correctly");
    return { ok: true };
  } else {
    console.log("❌ Planner response missing milestones");
    return { ok: false };
  }
}

main();
```

## Current Limitations

1. **No Auto-Scaling:** OpenClaw does not auto-scale sub-agents based on load. Manual spawn required.

2. **No Shared State:** Sub-agents do not share memory/state except via workspace files.

3. **No Built-In Queue:** Tasks are not queued. Concurrent spawns run in parallel.

4. **Session Management:** Long-running sessions must be managed manually (list/kill/steer).

## Shared substrate responsibilities

- **Planner** must consult QWD/QMD and docs before inventing architecture.
- **Backend agent** must verify Supabase schema before durable state changes.
- **Frontend agent** must use browser proof for UI changes.
- **QA agent** must include Supabase/QWD/lossless checks when relevant.
- **Memory agent** must use lossless-claw to avoid stale milestone loops.
- **Orchestrator** must resolve conflicts between latest user instruction, workspace policy, current code/tests, Supabase, QWD/QMD, lossless memory, and git history.

## Next Steps

1. **Document routing patterns** in main AGENTS.md
2. **Create smoke tests** for multi-agent workflows
3. **Test parallel QA pattern** with reviewer + vreviewer
4. **Evaluate agent config** (agents.json vs inline routing)
5. **Measure performance** vs single-agent workflow

## Related Docs

- OPENCLAW-WORKSPACE-BRAIN-001: Main workspace update
- OPENCLAW-WORKSPACE-BRAIN-003: Sub-agent workspace alignment
- docs/webstudio-agent-workflow.md: Agent workflow model
- https://docs.openclaw.ai/sessions: OpenClaw session management
