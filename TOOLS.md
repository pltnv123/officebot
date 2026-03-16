# TOOLS.md — Available Tools & Resources

## Project URLs
- Scene: http://5.45.115.12/office/
- Logs: /var/www/office/state.json
- GitHub: https://github.com/pltnv123/officebot

## Key Files
- Scene code: /home/antonbot/.openclaw/workspace/office/UnityProject/Assets/Scripts/RuntimeSceneBuilder.cs
- Tasks: /home/antonbot/.openclaw/workspace/office/tasks.json
- Backlog: /home/antonbot/.openclaw/workspace/office/BACKLOG.md
- Algorithm: /home/antonbot/.openclaw/workspace/office/ALGORITHM.md

## Available Scripts
- screenshot: node /home/antonbot/.openclaw/workspace/office/scripts/screenshot.js
- ci_wait: bash /home/antonbot/.openclaw/workspace/office/scripts/ops/ci_wait_green.sh
- healthcheck: bash /home/antonbot/.openclaw/workspace/office/scripts/ops/office_healthcheck.sh
- cancel_stuck: bash /home/antonbot/.openclaw/workspace/office/scripts/ops/cancel_stuck_builds.sh

## How to Send Screenshot to Telegram
node /home/antonbot/.openclaw/workspace/office/scripts/screenshot.js
BOT_TOKEN=$(node -e "const d=require('/home/antonbot/.openclaw/openclaw.json');console.log(d.channels.telegram.botToken)")
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto" \
  -F "chat_id=6540715349" \
  -F "caption=DEPLOY: [task] | COMMIT: [hash] | WASM: [timestamp]" \
  -F "photo=@/tmp/scene_screenshot.png"

## How to Verify Deploy
exec: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify
Timestamp must change after every push + CI green.

## How to Check CI
exec: cd /home/antonbot/.openclaw/workspace/office && gh run list --limit 3

## OpenClaw Resources
- Docs: https://docs.openclaw.ai
- Skills: openclaw skills list
- Ready skills: gh-issues, github, healthcheck, skill-creator, tmux, weather

## Agent Roles
- PLANNER: breaks down tasks into steps, identifies risks
- WORKER: writes code, edits files, commits
- REVIEWER: verifies output with grep + screenshot before marking done
