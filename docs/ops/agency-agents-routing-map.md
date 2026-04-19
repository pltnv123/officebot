# Agency Agents Routing Map

Imports are mapped into a staged routing model so we can document and later wire specific roles without mass activation.
- Total imported entries: 204
- Default stage: 0 (dormant).

## Division coverage

| Division | Imported entries |
|---|---|
| .gitattributes | 1 |
| .github | 5 |
| .gitignore | 1 |
| CONTRIBUTING.md | 1 |
| LICENSE | 1 |
| README.md | 1 |
| academic | 5 |
| design | 8 |
| engineering | 23 |
| examples | 6 |
| game-development | 20 |
| integrations | 13 |
| marketing | 27 |
| paid-media | 7 |
| product | 5 |
| project-management | 6 |
| sales | 8 |
| scripts | 3 |
| spatial-computing | 6 |
| specialized | 27 |
| strategy | 16 |
| support | 6 |
| testing | 8 |

## Sample canonical routing (stage 0)

| Canonical Role Key | Division | Source Path | Type | Stage |
|---|---|---|---|---|
| README.md:README | README.md | third_party/agency-agents/README.md | agent | 0 |
| CONTRIBUTING.md:CONTRIBUTING | CONTRIBUTING.md | third_party/agency-agents/CONTRIBUTING.md | agent | 0 |
| LICENSE:LICENSE | LICENSE | third_party/agency-agents/LICENSE | other | 0 |
| .gitattributes:.gitattributes | .gitattributes | third_party/agency-agents/.gitattributes | other | 0 |
| .gitignore:.gitignore | .gitignore | third_party/agency-agents/.gitignore | other | 0 |
| strategy:nexus-strategy | strategy | third_party/agency-agents/strategy/nexus-strategy.md | strategy | 0 |
| strategy:EXECUTIVE-BRIEF | strategy | third_party/agency-agents/strategy/EXECUTIVE-BRIEF.md | strategy | 0 |
| strategy:QUICKSTART | strategy | third_party/agency-agents/strategy/QUICKSTART.md | strategy | 0 |
| strategy:phase-0-discovery | strategy | third_party/agency-agents/strategy/playbooks/phase-0-discovery.md | strategy | 0 |
| strategy:phase-3-build | strategy | third_party/agency-agents/strategy/playbooks/phase-3-build.md | strategy | 0 |
| strategy:phase-5-launch | strategy | third_party/agency-agents/strategy/playbooks/phase-5-launch.md | strategy | 0 |
| strategy:phase-2-foundation | strategy | third_party/agency-agents/strategy/playbooks/phase-2-foundation.md | strategy | 0 |
| strategy:phase-4-hardening | strategy | third_party/agency-agents/strategy/playbooks/phase-4-hardening.md | strategy | 0 |
| strategy:phase-1-strategy | strategy | third_party/agency-agents/strategy/playbooks/phase-1-strategy.md | strategy | 0 |
| strategy:phase-6-operate | strategy | third_party/agency-agents/strategy/playbooks/phase-6-operate.md | strategy | 0 |

## Activation notes

- Entries remain dormant (stage 0) until explicitly moved to higher stages defined below.
- Use `runtime/agency-agents-registry.json` as the single source of truth for canonical keys.
- Stage transitions should be recorded in `docs/ops/agency-agents-activation-stages.md`.
