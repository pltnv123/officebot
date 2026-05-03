# WebStudio Error Regression Registry

**Purpose:** Track known UI/backend regressions and their prevention measures.

**Location:** `/home/antonbot/.openclaw/workspace/office/docs/webstudio-error-regression-registry.md`

---

## ERR-001: addEventListener on null DOM elements

**Symptom:** `TypeError: Cannot read properties of null (reading 'addEventListener')`

**Root cause:** JS attaches event listeners to elements that don't exist in current UI state.

**Fixed elements:**
- `run-script-btn`
- `run-script-again-btn`

**Fix:** Use optional chaining: `$('run-script-btn')?.addEventListener(...)`

**Prevention:**
- Always check element exists before addEventListener
- Use `safeOnClick()` helper
- Browser smoke must verify no console errors

---

## ERR-002: Live Terminal panel hidden after Execute Script

**Symptom:** Live Terminal panel not visible after script execution

**Root cause:** `syncProjectVisibility` was toggling `script-live-terminal-panel` separately from `script-program-panel`, but terminal is inside program panel.

**Fix:** Removed separate terminal panel toggle from `syncProjectVisibility`.

**Prevention:**
- Do not manage child elements separately from parent visibility
- Browser smoke checks terminal visibility

---

## ERR-003: setLiveRunStatus textContent on null

**Symptom:** `Cannot set properties of null (setting 'textContent')` when clicking Run Live

**Root cause:** `setLiveRunStatus` tried to set `live-run-status` element which doesn't exist in HTML.

**Fix:** Removed reference to non-existent `live-run-status` element.

**Prevention:**
- Use `safeSetText()` helper for all textContent operations
- Verify all referenced element IDs exist in base HTML

---

## ERR-004: loadScriptVersions innerHTML on null

**Symptom:** `Cannot set properties of null (setting 'innerHTML')` when loading versions

**Root cause:** `loadScriptVersions` used `$()` without null checks.

**Fix:** 
- Added `safeSetHtml()` helper
- Use `$$()` for optional element lookup
- Check element exists before innerHTML assignment

**Prevention:**
- Always use safe helpers for DOM manipulation
- Versions UI must handle missing elements gracefully

---

## ERR-005: renderScriptSurface unsafe DOM operations

**Symptom:** Multiple null errors when rendering script surface

**Root cause:** `renderScriptSurface` used direct `$()` calls without checks.

**Fix:**
- Replaced all `$().textContent` with `safeSetText()`
- Replaced all `$().innerHTML` with `safeSetHtml()`
- Replaced all `$().classList` with `safeClassToggle()`

**Prevention:**
- Use safe helpers consistently
- Browser smoke must test full Analyze → Execute → Run Live flow

---

## ERR-006: syncProjectVisibility unsafe DOM operations

**Symptom:** classList errors when switching project types

**Root cause:** `syncProjectVisibility` used direct `$()` calls.

**Fix:**
- Replaced all `classList.toggle` with `safeClassToggle()`
- Used `$$()` for optional element lookup

**Prevention:**
- Use safe helpers in all visibility sync functions

---

## ERR-007: script_surface null after plan causes UI crash

**Symptom:** After Analyze Brief, plan exists but script_surface is null. UI crashes when trying to render script artifact.

**Root cause:** UI called `renderScriptSurface`/`loadScriptVersions` as if script artifact exists when only plan is available.

**Fix:**
- Separate plan state from script artifact state
- Only call `loadScriptVersions()` after `project_artifact_id` exists
- Program panel shows safe empty state when no artifact loaded

**Prevention:**
- Check `state.currentScriptProjectArtifactId` before loading versions
- Browser smoke tests Analyze → Execute → Run Live flow

---

## Prevention Checklist

For all future UI changes:

1. **Safe DOM helpers:**
   - Use `safeSetText()` for textContent
   - Use `safeSetHtml()` for innerHTML
   - Use `safeClassToggle()` for classList
   - Use `$$()` for optional element lookup

2. **Browser smoke tests:**
   - `webstudio-browser-script-real-click-regression-smoke.js` — full click flow
   - `webstudio-browser-script-manual-flow-smoke.js` — manual flow
   - Both must pass with `no_console_null_dom_errors: true`

3. **State validation:**
   - Check `project_artifact_id` exists before loading artifact-specific UI
   - Handle null/empty states gracefully
   - Never assume DOM elements exist

4. **Server restart:**
   - Always restart server after UI/backend changes
   - Verify `/webstudio/demo` health with curl

5. **Error Guardian:**
   - Read `/home/antonbot/.shared/LESSONS.md` before fixing
   - Add new lessons to registry when new error patterns found

---

## Test Coverage

| Test | Purpose | Status |
|------|---------|--------|
| `webstudio-browser-script-real-click-regression-smoke.js` | Full Analyze → Execute → Run Live flow | ✅ Required |
| `webstudio-browser-script-manual-flow-smoke.js` | Manual script flow | ✅ Required |
| `webstudio-live-script-run-smoke.js` | Live terminal contract | ✅ Required |
| `webstudio-editable-script-smoke.js` | Editable script playground | ✅ Required |
| `webstudio-script-quality-smoke.js` | Generated script quality | ✅ Required |
| `webstudio-demo-page-js-syntax-smoke.js` | JS syntax validation | ✅ Required |

---

## Related Docs

- `/home/antonbot/.shared/LESSONS.md` — Error Guardian lessons
- `docs/webstudio-error-guardian-policy.md` — Error handling policy
- `docs/webstudio-live-run-contract.md` — Live terminal contract
- `scripts/webstudio-error-registry-smoke.js` — Registry validation (TODO)
