# WebStudio Template Generator Skill

## Status

APR-005 approved and completed in safe scope.

## Purpose

The `webstudio-template-generator` local skill supports repeatable generation of landing page and web studio template packs for safe client-facing web work.

## Capabilities

- Landing page intake and brief generation.
- Page section maps, wireframe notes, and copy blocks.
- Responsive HTML shell and mobile-first CSS patterns.
- Reusable component snippets for hero, proof, FAQ, and CTA sections.
- Export checklist for safe `/output` and `/workspace/templates` delivery.
- Guardrail fields for industry risk, proof type, forbidden claims, dependency owner, and acceptance threshold.
- Fictional sample package generation for validation.

## Approved Boundaries

Allowed:

- Write deliverables under `/output/`.
- Write reusable templates under `/workspace/templates/`.
- Maintain local skill support files.
- Create docs-only updates.

Forbidden without separate explicit approval:

- Real client project changes.
- Officebot app/backend source changes.
- Workflow changes.
- Runtime, VPS, Supabase, deployment, or package/dependency changes.
- Secrets, tokens, `.env`, credential output, or private infrastructure details.
- Heavy QMD commands: `qmd query`, `qmd vsearch`, `qmd embed`.

## Generated Local Artifacts

- `/output/webstudio-template-skill-015-report.md`
- `/output/test-template/index.html`
- `/output/test-template/styles.css`
- `/output/test-template/brief.md`
- `/output/test-template/qa-checklist.md`
- `/workspace/templates/webstudio/html-landing-page-shell.template.html`
- `/workspace/templates/webstudio/css-responsive-patterns.template.css`
- `/workspace/templates/webstudio/component-snippets.template.md`
- `/workspace/templates/webstudio/export-checklist.template.md`
- `/workspace/templates/webstudio/landing-page-package-prompt.template.md`

## Verification

- `happrovals list` no longer shows APR-005 pending.
- Backlog task `webstudio-template-generator-skill-015` is marked completed.
- Skill was patched with support file references and generated via local `skill_manage`.
- No app source, workflow, runtime, VPS, Supabase, deployment, or package changes were made.
