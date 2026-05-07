# officebot release pipeline design

## 1. Current tracked Build/ model
`Build/` WebGL artifacts are tracked in git and likely consumed by `index.html`, GitHub Pages, or direct demo hosting.

## 2. Why it works now
A fresh checkout has ready-to-serve WebGL assets without needing Unity build tooling, license secrets, or CI artifacts.

## 3. Why it is risky long-term
Large generated binary artifacts inflate git history, create noisy diffs, and make source/release boundaries unclear.

## 4. Option A: keep tracked Build/ short-term
Lowest immediate risk. Recommended until release/deploy migration is proven.

## 5. Option B: GitHub Actions build artifact
CI builds WebGL and stores artifacts per run. Requires Unity licensing and reliable runner setup.

## 6. Option C: GitHub Release assets
Attach versioned WebGL bundles to releases. Requires release creation/upload approval.

## 7. Option D: Pages deploy from build output
Build or download artifact then deploy to Pages. Requires explicit `pages`/`id-token` permissions and Pages settings.

## 8. Option E: external CDN/object storage
Best for large stable assets, but introduces external credentials, cache invalidation, and operational ownership.

## 9. Recommended sequence
Keep tracked Build now → approve release/deploy design → add diagnostics/build artifact dry-run → add deploy path → verify demo → only then approve Build untrack.

## 10. Owner decisions
Select deploy source of truth, allowed secrets/settings, release cadence, rollback expectations, and artifact retention.

## 11. Secrets/settings required
Unity license settings if building, GitHub Pages settings if deploying, release token/permissions if uploading releases. Do not print values.

## 12. Rollback plan
Revert workflow/release PR and continue using tracked Build artifacts from main.

## 13. Acceptance criteria
Fresh checkout loads demo, CI artifact exists, Pages/release URL works, rollback verified, no raw secrets in logs.

## 14. PR sequence
PR30 design approval → PR31 diagnostics/build dry-run → PR35 release migration → later Build untrack only after exact approval.
