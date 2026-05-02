# WebStudio Universal Artifact Lifecycle

**Version:** universal-artifact-lifecycle-v1  
**Status:** Active  
**Applies to:** All WebStudio project types (script, telegram_bot, landing_page, web_app, backend_service, android_app, ios_app)

---

## Overview

This document defines a universal lifecycle contract for all WebStudio artifacts. Every project type follows the same core stages, enabling consistent UX, API design, and platform capabilities across all verticals.

---

## A. Universal Lifecycle Stages

### 1. Intake
**Purpose:** Capture initial requirements, constraints, and context.

**Inputs:**
- User request / prompt
- Project type selection
- Constraints (safety level, target platform, dependencies)

**Outputs:**
- Intake record with timestamp
- Initial project type classification
- Safety/boundedness level

**API:** `POST /api/demo/webstudio-order/project-artifacts` (intake phase)

---

### 2. Plan
**Purpose:** Break down requirements into executable steps.

**Inputs:**
- Intake record
- Project type capabilities

**Outputs:**
- Task plan / steps
- Estimated duration
- Required tools/dependencies

**UI:** Project Plan Panel (left sidebar)

---

### 3. Generate
**Purpose:** Produce initial artifact(s) from plan.

**Inputs:**
- Approved plan
- Templates / generators for project type

**Outputs:**
- Primary artifact (script.py / bot.py / index.html / etc.)
- Supporting files (README, config, tests)
- Version v0001 (generated)

**API:** Internal generation pipeline

---

### 4. Review/Edit
**Purpose:** Human operator reviews and modifies generated artifact.

**Inputs:**
- Generated artifact source
- Operator edits

**Outputs:**
- Edited source (in editor)
- dirty=true flag when edited source ≠ current version

**UI:** Primary Artifact Editor/Preview Panel

**Contract:**
- Load version into editor: preview only, does NOT change current_version or script.py
- Edit in editor: sets dirty=true, does NOT save until explicit "Save"

---

### 5. Run/Preview/Test
**Purpose:** Execute or preview artifact to verify behavior.

**Inputs:**
- Artifact source (current or edited)
- Optional: test inputs / sample data

**Outputs:**
- Run output (stdout, logs, preview URL)
- Exit code / success flag
- Duration metrics

**API:**
- `POST /api/demo/webstudio-order/project-artifact/:artifactId/run`
- Optional: `edited_source` inline override

**Project-type specifics:**
- script → Python execution in bounded sandbox
- telegram_bot → dry_run simulation
- landing_page → static preview / HTML render
- web_app → dev server preview (planned)
- backend_service → API test harness (planned)
- android_app → emulator build/run (planned)
- ios_app → simulator build/run (planned)

---

### 6. QA
**Purpose:** Automated quality gates before delivery.

**Inputs:**
- Run results
- Artifact source

**Outputs:**
- QA pass/fail status
- Lint / syntax check results
- Security scan results
- Performance metrics (if applicable)

**UI:** QA Panel

**Gates:**
- Syntax valid
- Safety constraints met
- No unsafe imports / patterns
- Run completed successfully (optional, depends on project type)

---

### 7. Version
**Purpose:** Save state as immutable version with metadata.

**Inputs:**
- Edited source
- Version label (optional)

**Outputs:**
- New version record (vXXX)
- Version file (versions/vXXX.py / .json)
- current_version_id updated
- Primary artifact file updated (script.py / etc.)

**API:** `POST /api/demo/webstudio-order/project-artifact/:artifactId/script-version`

**Contract:**
- Save creates new version AND sets it as current
- Save updates primary artifact file (script.py)
- Save sets current_version_id in current_version.json

**Version Record Schema:**
```json
{
  "version_id": "v0001",
  "label": "Generated version",
  "source_type": "generated",
  "created_at": "2026-05-02T19:00:00Z",
  "source_length": 1234
}
```

---

### 8. Deliver
**Purpose:** Package artifact for handoff / deployment.

**Inputs:**
- Current version artifact
- Supporting files

**Outputs:**
- Delivery package (ZIP / tarball)
- Delivery manifest
- Download URL

**API:** `GET /api/webstudio-<project-type>-artifact/:order_id/export`

**Package Contents:**
- Primary artifact (script.py / bot.py / index.html)
- README.md
- Config files
- Sample inputs/outputs (if applicable)
- Version history summary (optional)

---

### 9. History/Audit
**Purpose:** Track all changes, runs, and deliveries for compliance and debugging.

**Inputs:**
- All lifecycle events

**Outputs:**
- Version history (list of versions with metadata)
- Run history (list of runs with output/duration/exit_code)
- Delivery history (exports/downloads)

**UI:**
- Version History Panel (dropdown + restore)
- Run History Panel (timeline + output inspection)

**API:**
- `GET /api/demo/webstudio-order/project-artifact/:artifactId/versions`
- `GET /api/demo/webstudio-order/project-artifact/:artifactId/runs`

---

### 10. Expand
**Purpose:** Add new capabilities / slices to existing artifact.

**Inputs:**
- Existing artifact
- New requirements / features

**Outputs:**
- New version with expanded capabilities
- Updated plan
- New supporting files (if needed)

**Examples:**
- script → add CLI args, config file, tests
- telegram_bot → add new commands, handlers
- landing_page → add CSS, JS, additional sections
- web_app → add backend API, database (planned)
- android_app → add permissions, services (planned)

---

## B. Universal Schemas

### Universal Project Artifact

```json
{
  "order_id": "ws-order-xxx",
  "project_type": "script|telegram_bot|landing_page|web_app|backend_service|android_app|ios_app",
  "scenario": "general_safe_python|telegram_dry_run|static_landing|...",
  "language": "python|javascript|html|kotlin|swift",
  "safety_level": "bounded_demo|sandboxed|full",
  "artifact_id": "ws-<project_type>-artifact-<order_id>-<scenario>",
  "project_artifact_id": "ws-project-artifact-<project_type>-<order_id>-<scenario>",
  "artifact_root": "/path/to/artifact/root",
  "current_version_id": "v0001",
  "files": {
    "primary": "script.py|bot.py|index.html|MainViewModel.kt|ContentView.swift",
    "readme": "README.md",
    "config": "config.json|package.json|build.gradle|Podfile",
    "tests": "test_script.py|tests/|...",
    "sample_input": "sample_input.txt|null",
    "sample_output": "sample_output.txt|null"
  },
  "created_at": "2026-05-02T19:00:00Z",
  "updated_at": "2026-05-02T19:30:00Z",
  "status": "active|archived"
}
```

---

### Universal Version

```json
{
  "version_id": "v0001",
  "artifact_id": "ws-<project_type>-artifact-<order_id>",
  "label": "Generated version|Edited version 2|Restored v0001",
  "source_type": "generated|operator_edit|restored",
  "created_at": "2026-05-02T19:00:00Z",
  "source_length": 1234,
  "source_hash": "sha256:abc123...",
  "run_id": "ws-run-xxx|null",
  "qa_status": "passed|failed|pending",
  "metadata": {
    "editor": "operator|ai",
    "changes_summary": "Initial generation|Added error handling|..."
  }
}
```

---

### Universal Run

```json
{
  "run_id": "ws-run-<timestamp>-<random>",
  "artifact_id": "ws-<project_type>-artifact-<order_id>",
  "version_id": "v0001|null",
  "command": ["python3", "script.py"],
  "exit_code": 0,
  "stdout": "...",
  "stderr": "...",
  "duration_ms": 123,
  "ok": true,
  "started_at": "2026-05-02T19:00:00Z",
  "completed_at": "2026-05-02T19:00:01Z",
  "run_type": "current|edited_source|specific_version",
  "environment": {
    "runtime": "python3.12|node24|android_emulator|ios_simulator",
    "sandbox": "bounded_demo|sandboxed|full"
  }
}
```

---

### Universal Delivery

```json
{
  "delivery_id": "ws-delivery-<timestamp>-<random>",
  "artifact_id": "ws-<project_type>-artifact-<order_id>",
  "version_id": "v0001",
  "package_format": "zip|tar.gz|apk|ipa",
  "package_path": "/path/to/package.zip",
  "package_size_bytes": 12345,
  "files_included": ["script.py", "README.md", "config.json"],
  "created_at": "2026-05-02T19:00:00Z",
  "download_url": "/api/webstudio-<project_type>-artifact/:order_id/export",
  "checksum_sha256": "abc123..."
}
```

---

## C. Universal UI Contract

Every WebStudio project type surface must include these panels (when applicable):

### 1. Project Plan Panel
- Location: Left sidebar
- Content: Task steps, progress, status
- Actions: Expand/collapse, mark complete

### 2. Primary Artifact Editor/Preview Panel
- Location: Center
- Content: Source code editor or visual preview
- Actions: Edit, save, reset to current, load version

### 3. Run/Preview Output Panel
- Location: Below editor or right sidebar
- Content: Run output, logs, preview URL, exit code
- Actions: Run, stop, clear output

### 4. QA Panel
- Location: Right sidebar or below run panel
- Content: Lint results, security scan, syntax check
- Actions: Re-run QA, view details

### 5. Version History Panel
- Location: Right sidebar or modal
- Content: Version list (v0001, v0002, ...), labels, timestamps
- Actions: Load into editor, restore, compare

### 6. Run History Panel
- Location: Below run panel or modal
- Content: Run timeline, exit codes, durations, output snippets
- Actions: Re-run, view full output, filter

### 7. Supporting Files Panel
- Location: Right sidebar or collapsible section
- Content: README, config, tests, sample inputs/outputs
- Actions: View, edit, download

### 8. Delivery/Export Panel
- Location: Top-right or modal
- Content: Export button, package info, download link
- Actions: Export, download, share link

---

## D. Capability Matrix

| Project Type | Edit | Run | Preview/Build | Delivery Package | Versioning | History/Audit | Status |
|--------------|------|-----|---------------|------------------|------------|---------------|--------|
| script | ✅ bounded editable | ✅ Python sandbox | ✅ stdout/logs | ✅ ZIP | ✅ | ✅ | **Available** |
| telegram_bot | ✅ bounded editable | ✅ dry_run sim | ✅ dry_run output | ✅ ZIP | ✅ | ✅ | **Available** |
| landing_page | ✅ bounded editable | ✅ static preview | ✅ HTML render | ✅ ZIP | ✅ | ✅ | **Available** |
| web_app | 📋 planned | 📋 planned | 📋 dev server | 📋 planned | 📋 planned | 📋 planned | **Planned** |
| backend_service | 📋 planned | 📋 planned | 📋 API harness | 📋 planned | 📋 planned | 📋 planned | **Planned** |
| android_app | 📋 planned | 📋 planned | 📋 emulator build | 📋 APK | 📋 planned | 📋 planned | **Planned** |
| ios_app | 📋 planned | 📋 planned | 📋 simulator build | 📋 IPA | 📋 planned | 📋 planned | **Planned** |

**Notes:**
- ✅ = Implemented and available in WebStudio demo
- 📋 = Planned, not implemented
- android_app requires Android SDK, emulator, build runner
- ios_app requires macOS runner, Xcode, simulator/build environment
- web_app requires dev server, bundler, hot-reload infrastructure
- backend_service requires API test harness, database mocks, service discovery

---

## E. Platform-Specific Notes

### script (Python)
- Runtime: Python 3.12+
- Sandbox: Bounded demo (no os/sys/subprocess)
- Primary file: script.py
- Run command: `python3 script.py`

### telegram_bot (Python)
- Runtime: Python 3.12+
- Sandbox: Bounded dry_run (no real Telegram API calls)
- Primary file: bot.py
- Run command: `python3 dry_run_test.py`

### landing_page (HTML/CSS/JS)
- Runtime: Static file server
- Sandbox: Static content only (no server-side execution)
- Primary file: index.html
- Preview: HTTP GET / static render

### web_app (Planned)
- Runtime: Node.js / React / Vue / etc.
- Build: Bundler (webpack/vite)
- Preview: Dev server with hot-reload
- Primary file: src/App.tsx or similar

### backend_service (Planned)
- Runtime: Node.js / Python / Go / etc.
- Test: API harness with mocked dependencies
- Primary file: server.js / main.py / main.go

### android_app (Planned)
- Runtime: Android SDK / Gradle
- Build: APK via Gradle
- Preview: Android emulator
- Primary file: MainActivity.kt / MainViewModel.kt
- Requirements: Android SDK, emulator, build runner

### ios_app (Planned)
- Runtime: Xcode / Swift
- Build: IPA via Xcodebuild
- Preview: iOS Simulator
- Primary file: ContentView.swift / AppDelegate.swift
- Requirements: macOS runner, Xcode, simulator

---

## F. Future Extensions

This lifecycle is designed to be extensible. New project types can be added by:

1. Adding project type to capability matrix
2. Implementing project-type-specific run/preview logic
3. Defining primary file name and build commands
4. Adding to platform registry service
5. Updating UI to show new type in library

All project types inherit the same:
- Versioning system
- Run history tracking
- Delivery packaging
- QA gates
- Editor UX

---

**End of Document**
