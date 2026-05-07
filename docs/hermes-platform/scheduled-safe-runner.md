# Hermes Scheduled Safe Runner

## Overview

The scheduled autonomy runner executes safe autonomous cycles periodically.

## Installation

Run on host:
```bash
sudo bash /output/install-hermes-autonomy-runner.sh
```

This creates a cron job that runs every 30 minutes.

## Schedule

- **Frequency**: Every 30 minutes
- **Delivery**: Telegram home channel
- **Model**: openai-codex (gpt-5.5)

## What Each Cycle Does

1. Load backlog from `/workspace/autonomy/backlog/backlog.yaml`
2. Select next safe task (pending, low/medium risk, no approval required)
3. Create run directory: `/workspace/autonomy/runs/YYYYMMDD-HHMMSS-<task-id>/`
4. Run safe diagnostics: hwhere, hfallback, hcapabilities, qmd --version
5. Execute task or create ready-for-agent packet
6. Run `qmd update` (safe mode)
7. Run `hfinalize`
8. Update backlog status
9. Deliver report to Telegram

## Run Outputs

- Run report: `/output/autonomy-runs/hautonomy-YYYYMMDD-HHMMSS-<task-id>.md`
- Finalizer report: `/output/finalizer/hfinalize-*.md`
- Updated backlog files

## Disabling

To disable the scheduled runner:
```bash
hermes cron remove --name hermes-autonomy-safe-runner
```

Or edit crontab manually.

## Monitoring

Check recent runs:
- `/output/autonomy-recent-runs.md`
- `/workspace/autonomy/runs/`
- `/output/autonomy-runs/`

Check cron status:
```bash
hermes cron list
```

## Safety

The scheduled runner:
- Only executes safe tasks from backlog
- Never performs forbidden actions
- Always runs hfinalize
- Reports status to Telegram
- Respects approval boundaries
