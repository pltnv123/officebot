# OFFICE COZY/THRILLER — Detailed Execution Plan

## Goal
Bring the same office scene to premium indie quality with two atmosphere presets (Cozy / Thriller) without moving scene layout.

## Phase 1 — Rendering Foundation (Done)
1. Lock fixed camera composition.
2. Switch to orthographic camera (isometric look, no perspective distortion).
3. Pixel stability defaults:
   - nearest-like rendering behavior
   - antialias OFF
   - pixel ratio 1
4. Keep same room/object layout.

## Phase 2 — Dual Atmosphere System (Done)
1. Two artistic modes in one scene:
   - Cozy: warm, soft, safe
   - Thriller: cold, contrast, tense
2. Smooth transitions between modes (~0.9s blend).
3. Mode-driven controls:
   - key/fill/ambient intensity
   - fog density/color
   - exposure
   - vignette strength

## Phase 3 — Lighting and Depth (Done)
1. Key/fill balancing for both moods.
2. Ceiling office lights for room readability.
3. Contact shadows + AO-like depth strengthening by mode.
4. Screen emissive flicker integrated with mood.

## Phase 4 — Window Realism + Time of Day (Done)
1. Dynamic external view rendered in window texture.
2. Day/night auto-switch by local time:
   - daylight gradient + sun arc
   - night gradient + moon + stars + lit skyline windows
3. Window glass tuned for each mood.

## Phase 5 — Material and Prop Polish (Done)
1. Sofa rebuilt into layered parts:
   - base, seat, back, armrests
   - extra seam shadow for volume
2. Controlled imperfection props:
   - papers, mug, cable
3. Material separation improved (wood, fabric, glass, metal).

## Phase 6 — Diegetic UI Board (Done)
1. Board frame + glass layer.
2. Thriller alert light + pulsing red indicator.
3. Board emissive behavior linked to mode.

## Phase 7 — Character/Assistant Activity (Done)
1. Three assistants with explicit roles:
   - Планирует
   - Делает
   - Проверяет
2. Idle animation and checker attention toward task board.

## Phase 8 — Task UX Rules (Done)
1. Completed items moved to "Последние".
2. Active list cleaned from finished items.

## Remaining Optional Upgrades (Next)
1. Audio layer:
   - Cozy room tone + soft clicks
   - Thriller low hum + sharper UI ticks
2. Additional VFX:
   - Cozy dust beam refinement
   - Thriller subtle scanline/glitch pass
3. Final color matching pass vs approved reference screenshots.

## Acceptance Criteria
- Same geometry/composition in both modes.
- Clear emotional shift between Cozy and Thriller.
- Window reflects real time day/night.
- Sofa no longer reads as a single block.
- Board behaves as diegetic world object.
- Stable pixel presentation with fixed isometric camera.
