# WebStudio Error Regression Registry

This document tracks known error patterns and their prevention measures to avoid regressions.

---

## ERR-001: Execute Script MVP returns 500 for non-demo scenarios

**Symptom:** Clicking "Execute Script MVP" returns HTTP 500 with error message about unsupported scenario.

**Root Cause:** Backend validates script scenarios against a whitelist of safe demo patterns.

**Prevention:**
- Smoke test `webstudio-script-quality-smoke.js` validates all supported scenarios
- Brief text must match supported patterns: CSV summary, loop print, sum range, text cleaner, JSON extractor

---

## ERR-002: Script smoke timeout on re-execute with loop_print

**Symptom:** Second execution of loop_print script times out in browser smoke test.

**Root Cause:** `runScriptSmoke` ran without `--delay` flag, using default 0.5s pause between iterations.

**Fix:** Added `args.push('--delay', '0')` in `runScriptSmoke()` in `webStudioScriptExecutionService.js`.

**Prevention:**
- Smoke test `webstudio-browser-script-reexecute-same-scenario-timeout-smoke.js`
- Backend smoke must use `--delay 0` for fast execution

---

## ERR-003: Undefined artifact_id in run-live URLs

**Symptom:** Run Live URLs contain `undefined` causing 404 errors.

**Root Cause:** `project_artifact_id` not always populated in artifact object.

**Fix:** Added 3-level fallback: `project_artifact_id || artifact_id || id || ''` in `webStudioLiveRunService.js`.

**Prevention:**
- Smoke test `webstudio-browser-script-reexecute-regression-smoke.js`
- Always normalize artifact ID before using in URLs

---

## ERR-004: Null DOM errors in Script Playground UI

**Symptom:** Browser console shows "Cannot read properties of null (reading 'addEventListener')" after clicking Run Live.

**Root Cause:** New UI elements (script-file-save-btn, script-file-reset-btn, etc.) accessed without null checks.

**Fix:** 
- All DOM access uses optional chaining: `$('id')?.addEventListener(...)`
- Safe helper functions: `safeSetText`, `safeClassToggle`, `$$`

**Prevention:**
- Smoke test `webstudio-browser-script-real-click-regression-smoke.js` asserts no null DOM errors
- Code review checklist: all `$()` calls must use `?.` for potentially null elements

---

## ERR-005: File list shows route keys instead of filenames

**Symptom:** File explorer shows "script", "readme", "sample_input" instead of "script.py", "README.md", etc.

**Root Cause:** `renderScriptFileList()` used `Object.keys(surface.files)` which returns route keys, not display filenames.

**Fix:** Changed to `Object.values(surface.files || {}).filter(f => f)` to get actual filenames.

**Prevention:**
- Smoke test `webstudio-script-file-explorer-editor-smoke.js` asserts file names visible
- File mapping logic documented in `docs/webstudio-script-playground-ux.md`

---

## ERR-006: Run Edited button not working after file editor implemented

**Symptom:** Clicking "Run Edited" does not execute the edited script content.

**Root Cause:** `startLiveRun()` not receiving edited source from editor when called from Run Edited button.

**Fix:** Run Edited button passes `$('script-editor').value` to `startLiveRun(editedSource)`.

**Prevention:**
- Smoke test `webstudio-script-file-explorer-editor-smoke.js` asserts edited output visible
- Manual QA: edit script.py, run edited, verify output contains edited text

---

## ERR-014: Live run starts but SSE events route 404 causes Connection lost

**Symptom:** 
- Run Live or Run Edited starts and prints run ID
- EventSource connects to `/events` endpoint that returns 404
- Terminal shows "Connection lost"
- Frontend may throw "JSON.parse undefined" error

**Root Cause:**
1. Live run process deleted from `liveRuns` Map immediately after completion
2. EventSource may connect slightly after process completes, finding no run
3. Frontend `JSON.parse(e.data)` called without checking if `e.data` exists

**Fix:**
1. Backend: Keep run in memory for 30 seconds after completion:
   ```javascript
   setTimeout(() => {
     liveRuns.delete(runId);
   }, 30000);
   ```
2. Frontend: Guard all `JSON.parse(e.data)` calls:
   ```javascript
   if (!e.data) return;
   let data;
   try { data = JSON.parse(e.data); } catch (err) { return; }
   ```

**Prevention:**
- Smoke test `webstudio-live-run-events-regression-smoke.js` asserts:
  - No /events 404 errors
  - No "Connection lost" message
  - No JSON.parse errors
  - Edited output visible in terminal
- All SSE event handlers must check `e.data` before parsing
- Live runs kept in memory briefly after completion for late subscribers

---

## ERR-019: Delivery page route opens but lacks runnable project workspace

**Symptom:**
- Open Delivery loads static page without code/run workspace
- Run history shows "artifactId is not defined" error
- Run Script button does nothing or fails silently
- File links may be missing or broken

**Root Cause:**
1. Delivery page template did not server-render artifactId into client script
2. Client script referenced `artifactId` variable that was never defined
3. Run history endpoint called with undefined artifact ID

**Fix:**
1. Server-render artifactId into page script:
   ```javascript
   const artifactId = ${JSON.stringify(artifactId)};
   ```
2. Remove reference to undefined `artifactId` in console.log
3. Ensure run history gracefully handles empty state with "No runs yet"

**Prevention:**
- Smoke test `webstudio-script-delivery-page-workspace-smoke.js` asserts:
  - Delivery page opens with HTTP 200
  - Title "Python script package" visible
  - File list visible with script.py
  - script.py preview contains expected content
  - Run Script works and shows correct output
  - Run history loads without "artifactId is not defined" error
  - Download ZIP returns valid PK zipfile
- Artifact ID must be server-rendered into delivery page
- Run history must show placeholder text when no runs exist

---

## Prevention Checklist

Before merging any Script Playground or Live Run changes:

- [ ] Run `webstudio-live-run-events-regression-smoke.js` - must pass
- [ ] Run `webstudio-script-file-explorer-editor-smoke.js` - must pass
- [ ] Run `webstudio-browser-script-reexecute-same-scenario-timeout-smoke.js` - must pass
- [ ] Run `webstudio-browser-script-real-click-regression-smoke.js` - no null DOM errors
- [ ] Run `webstudio-live-script-run-smoke.js` - all checks pass
- [ ] Run `webstudio-live-script-stdin-smoke.js` - stdin works
- [ ] Run `webstudio-script-delivery-page-workspace-smoke.js` - delivery page workspace works
- [ ] Browser console has no "Cannot read properties of null" errors
- [ ] Run Edited streams output without "Connection lost"
- [ ] All DOM access uses optional chaining (`?.`)
- [ ] All `JSON.parse()` calls have try/catch or guards
- [ ] Artifact IDs normalized with fallback chain before URL use

---

## Related Documentation

- `webstudio-script-playground-ux.md` — Script Playground UX specification
- `webstudio-live-run-contract.md` — Live run API contract
- `webstudio-error-guardian-policy.md` — Error handling policy
- `AGENTS.md` — Session operating instructions
