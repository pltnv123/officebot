# Production Delivery Archives

## Purpose

Delivery archives package simulated client projects for handoff, with manifests, QA summaries, and client-facing READMEs.

## Structure

Each archive under `/output/delivery-archives/<scenario>/` contains:

- `manifest.json` — file list with checksums
- `QA-summary.md` — link to QA scorecard
- `client-facing-README.md` — status and next steps

## Safety

- No external uploads
- No deployment
- Local packaging only
- No real client data
