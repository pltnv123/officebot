# Premium Office Scene — Execution Plan (Cozy + Night-Thriller)

## 0) Rule of implementation
Одна сцена, одна геометрия, один набор ассетов и материалов.
Разница между режимами только через `LookProfile` (palette/LUT/light/VFX/audio/post).

## 1) Architecture (data-first)
- `LookProfile`:
  - `paletteSubsetId`
  - `lutId`
  - `light`: key/fill/bounce/emissive/AO params
  - `post`: bloom/grain/vignette/contrast
  - `vfx`: dust/fog/flicker
  - `audio`: room tone + cues
- Profiles:
  - `cozy`
  - `thriller`
- Runtime:
  - blend switching (time-based or manual override)
  - no scene duplication

## 2) Pixel-perfect contract
- `R_ref`: 320x180 or 384x216
- integer upscale `X`
- nearest filtering for pixel assets
- no TAA; test MSAA only if stable
- regression test: pixel stability pan (X/Y/diag)

## 3) Art pipeline
1. Blockout + fixed camera
2. Materials (PBR-lite + stepped shading)
3. Master palette 64
4. Subsets: Cozy (32-40), Thriller (24-32)
5. Optional final quantization + dithering masks (2x2/4x4)

## 4) Lighting model
- Layers: key/fill/emissive/bounce/AO
- Cozy: warm key, soft fill, soft AO
- Thriller: low-key, minimal fill, stronger contrast, colder emissive

## 5) Diegetic board/UI
- Physical board (frame + glass + emissive)
- board affects nearby lighting
- status readability in both profiles

## 6) Required test scenes
1. Pixel Stability Test
2. Material Board
3. Lighting Board
4. Diegetic UI Test
5. LOD/Noise Test

## 7) Acceptance criteria
- Right wall removed, left wall has door+window+board
- Active/Done task UI reflects real statuses
- Cozy/Thriller switch is perceptually strong but on same geometry
- No blur/shimmer in pixel contract
- QA scenes reproducible with fixed metadata

## 8) Current sprint order (execution now)
1. Stabilize live scene parity (`/var/www` == workspace)
2. Finalize room layout constraints (walls/door/window/board)
3. Implement `LookProfile` structure in code
4. Add pixel contract toggles and validation notes
5. Add QA scene toggles/checklist and freeze baseline screenshots metadata
