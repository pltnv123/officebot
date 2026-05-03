# WebStudio Script Delivery Page

## Purpose

The Delivery Page (`/webstudio/delivery/:artifactId`) is a **client-facing** page for reviewing, running, and exporting delivered script packages.

## Difference Between Demo/Studio and Delivery

| Aspect | Demo/Studio (`/webstudio/demo`) | Delivery (`/webstudio/delivery/:artifactId`) |
|--------|--------------------------------|---------------------------------------------|
| **Audience** | Internal/operator | Client/end-user |
| **Purpose** | Generate, edit, iterate | Review, run, download |
| **Editing** | Full editor with live terminal | Read-only file preview |
| **Versioning** | Save/Restore versions | View current delivered version |
| **Workflow** | intake → plan → generate → edit → version | review → run → download → export |

## Current Capabilities

### File/Code Preview
- File list with primary files (script.py, README.md, actual_output.txt, test_run.log, manifest.json, sample_input.*)
- Click file to open in new tab with syntax-highlighted preview
- script.py shown by default
- Read-only viewing (no editing on delivery page)

### Run Script
- Run Script button executes the current artifact
- Shows stdout/stderr in run result panel
- Displays exit code, duration, status
- Same SSE safety as main playground (no /events 404, no JSON.parse undefined)

### Run History
- Lists recent runs with:
  - Status badge (ok/failed)
  - Timestamp
  - Exit code
  - Duration
  - Command
  - stdout/stderr preview
- Shows "No runs yet" if no history exists
- Uses safe artifact ID from server-rendered page

### Download ZIP
- Downloads complete project package
- Returns valid ZIP file with PK magic bytes
- Includes all safe package files

### Project Summary
- Project type chip (script)
- Scenario description
- Status and test status
- Run command hint
- QA checks section ("Что проверено")
- Next steps section ("Что дальше")

## Routes

| Route | Purpose |
|-------|---------|
| `GET /webstudio/delivery/:artifactId` | Delivery page HTML |
| `POST /api/demo/webstudio-order/project-artifact/:artifactId/run` | Run script |
| `GET /api/demo/webstudio-order/project-artifact/:artifactId/run-history` | Get run history |
| `GET /api/demo/webstudio-order/project-artifact/:artifactId/download` | Download ZIP |
| `GET /api/demo/webstudio-order/project-artifact/:artifactId/files/:fileKey` | File content (if implemented) |

## Known Limitations

1. **No editing on delivery page** - Files are read-only preview only
2. **No persistent client sessions** - Run history is local/demo storage
3. **No real-time collaboration** - Single-user view
4. **File routes may open external tabs** - Future: inline preview panel
5. **Run history limited to demo storage** - Not persisted across server restarts unless Supabase enabled

## Manual QA Checklist

- [ ] Delivery page opens with HTTP 200
- [ ] Title shows "Python script package"
- [ ] Artifact ID visible in footer
- [ ] File list shows script.py, README.md, and other files
- [ ] Click script.py opens code preview with expected content
- [ ] Click README.md opens preview
- [ ] Run Script button executes and shows output
- [ ] Output contains expected text (e.g., "DELIVERY OK")
- [ ] Run history loads without "artifactId is not defined" error
- [ ] Download ZIP returns valid PK zipfile
- [ ] No console errors:
  - No "artifactId is not defined"
  - No "/events 404"
  - No "JSON.parse undefined"
  - No "Cannot read properties of null"

## Error Prevention

### ERR-019: Delivery page route opens but lacks runnable project workspace

**Symptom:**
Open Delivery loads static page without code/run workspace or shows "artifactId is not defined" in run history.

**Prevention:**
- Delivery browser smoke must open delivery page
- script.py preview required
- Run Script required
- Run history must not reference undefined artifactId
- Artifact ID must be server-rendered into page script

## Related Docs

- `webstudio-script-playground-ux.md` - Main playground UX
- `webstudio-error-regression-registry.md` - Error registry
- `webstudio-live-run-contract.md` - Live run API contract
