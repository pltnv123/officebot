# officebot architecture map

## 1. System purpose
Officebot appears to be a Unity/WebGL demo with agent/control-plane automation, runtime state files, scripts, and GitHub-based documentation/ops workflows. Current engineering work is focused on making repo hygiene, build/release, runtime state, CI/CD, and evidence handling production-safe.

## 2. Major components
| component | paths | purpose | dependencies | risk_level |
| --- | --- | --- | --- | --- |
| Frontend/Web entry | index.html + Build/ | Loads WebGL build artifacts and browser demo shell | Build artifacts, browser, Pages/deploy | HIGH |
| Unity project | Assets/, ProjectSettings/, Packages/ | Unity scene/source/settings for office robot demo | Unity editor/build pipeline, Build/ output | MEDIUM-HIGH |
| WebGL build artifacts | Build/ | Tracked deploy/demo output | index.html/deploy/docs | HIGH |
| Backend/control-plane | backend/ | Control-plane scripts/logs/server-side helpers | runtime state, scripts, env expectations | MEDIUM-HIGH |
| Runtime state | state/tasks/runtime files | Operational and generated state persistence | backend/scripts/agents | HIGH |
| Scripts/ops | scripts/ and shell files | Automation, diagnostics, sync, testing helpers | runtime/backend/build/docs | MEDIUM-HIGH |
| Agents/skills | agents/, skills/ | Autonomous agent instructions/workflows | runtime/docs/tasks | MEDIUM |
| CI/CD | .github/workflows/ | Build/test/deploy automation | secrets, Build, Pages, branch assumptions | HIGH |
| Docs/roadmaps | docs/ and root md | Architecture, ADRs, hygiene, plans | owner decisions/future PRs | LOW |

## 3. Runtime data flow
Runtime state candidates include 11 tracked files. References found in 48 files. State is read by scripts/backend/agent flows and should not be untracked before default/init behavior exists.

## 4. Backend/control-plane flow
Backend files: 770. Scripts/ops files: 251. Backend/control-plane dependencies are mostly file/state/log oriented; explicit API boundaries and test harness need hardening.

## 5. Unity/WebGL build/deploy flow
Unity-related tracked files: 58. Build files: 4. Build references found in 25 files. `Build/` remains deploy/demo critical until release/deploy replacement is approved.

## 6. Agent/skills flow
Agent/skill files: 327. These encode automation behavior and should be versioned carefully, separate from generated runtime artifacts.

## 7. GitHub Actions/deploy flow
Workflow files: 2. Workflows should be audited for branch, secrets, Pages, Unity license, and Build assumptions before changes.

## 8. State persistence assumptions
- Root and runtime state files may be bootstrapping data, generated runtime state, or examples.
- Direct untracking is risky until fresh checkout behavior is validated.
- Logs and evidence should be separated by policy before cleanup.

## 9. Mermaid diagrams
See `/output/officebot-architecture-dependency-graph.md`.

## 10. Top architectural risks
- Build artifacts are tracked and likely deploy-critical.
- Runtime state/data is mixed with source/docs.
- CI/CD may depend on secrets, Pages, Unity license, or tracked build outputs.
- Logs/evidence may contain noisy generated artifacts.
- Test coverage and safe smoke checks need formalization.

## 11. Unknowns requiring owner answers
- Which demo/deploy path is authoritative?
- Which runtime files are required defaults vs generated data?
- Which evidence artifacts must remain reviewable in git?
- What secrets/settings are available to CI?
- What is acceptable clone size and release asset strategy?
