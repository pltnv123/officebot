# MEMORY_TECH.md — Technical Reference (read only when needed)
Last updated: 2026-03-10

## Scene Architecture
- SetupCamera(): pos(0,13,-9) rot(47,0,0) FOV=63 bg(0.08,0.07,0.06)
- BuildRoom(): floor, walls, ceiling, back wall
- BuildZones(): dispatch left, monitoring right, main desk center, task board back
- BuildAgents(): CHIEF, PLANNER, WORKER, TESTER + idle bob + head sway + working state

## Agent Positions
- CHIEF: (0.5, 0, 2.5) rotY=0 gold
- PLANNER: (-1.5, 0, 2.5) rotY=20 blue
- WORKER: (-4, 0, 4) rotY=45 green
- TESTER: (4, 0, 4) rotY=-45 light green

## How to Verify Deploy
exec: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify

## How to Send Screenshot to Telegram
node /home/antonbot/.openclaw/workspace/office/scripts/screenshot.js
BOT_TOKEN=$(node -e "const d=require('/home/antonbot/.openclaw/openclaw.json');console.log(d.channels.telegram.botToken)")
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto" \
  -F "chat_id=6540715349" \
  -F "caption=DEPLOY: [task] COMMIT: [hash] WASM: [timestamp]" \
  -F "photo=@/tmp/scene_screenshot.png"

## Scripts
- scripts/ops/ci_wait_green.sh — wait for CI deploy
- scripts/ops/cancel_stuck_builds.sh — cancel stuck builds
- scripts/screenshot.js — take scene screenshot

## Critical Technical Rules
1. NEVER Shader.Find("Standard") — null in URP WebGL
2. ALWAYS Shader.Find("Universal Render Pipeline/Lit")
3. NEVER push while CI running
4. ALWAYS wait for deploy step, not just build-unity
5. gh CLI — always cd into repo first
6. Telegram breaks Python indentation — use node.js
