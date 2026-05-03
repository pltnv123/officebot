# WebStudio Agent Workflow

WebStudio is built around a multi-agent development workflow.

## High-level flow

User → CTO Agent → Orchestrator Agent → Specialist Agents → QA Agent → Delivery

## CTO Agent

Responsibilities:
- understand user intent
- draft/refine PRD
- define acceptance criteria
- split work into bounded milestones
- protect product architecture

## Orchestrator Agent

Responsibilities:
- route work to specialist domains
- sequence milestones
- prevent scope creep
- track status
- ensure GitHub workflow
- require smoke proof

## Specialist Agents

### Backend Agent
- APIs
- persistence
- services
- artifact execution
- ZIP/export

### Frontend Agent
- WebStudio UI
- editor panels
- terminals
- delivery pages
- UX consistency

### Script Agent
- bounded Python generation
- live terminal
- stdin
- script quality
- safety validation

### Telegram Bot Agent
- bounded bot package generation
- dry-run transcript
- versions
- delivery/export
- no real token in demo

### Landing Agent
- landing preview
- HTML editor
- versioning
- delivery/export
- safety validation

### QA Agent
- smoke tests
- browser/runtime tests
- manual-flow tests
- regression checks
- no skipped critical checks

### Future iOS Agent
- planned only
- will build bounded mobile slices
- must follow artifact lifecycle

### Future Android Agent
- planned only
- will build bounded mobile slices
- must follow artifact lifecycle

## Universal artifact lifecycle

Every artifact type must follow:

intake → plan → generate → edit/review → run/preview/test → QA → version → restore → delivery → export → history/audit

## Done definition

A milestone is done only when:
- implementation exists
- tests pass
- server health verified if needed
- commit exists
- push succeeded
- final proof is reported
