# ALGORITHM.md — Core Execution Loop
Last updated: 2026-03-08

## WAKE-UP SEQUENCE (run on every trigger, no exceptions)
1. exec: cat /home/antonbot/.openclaw/workspace/SOUL.md
2. exec: cat /home/antonbot/.openclaw/workspace/MEMORY.md
3. exec: cat /home/antonbot/.openclaw/workspace/office/AGENTS.md
4. exec: cat /home/antonbot/.openclaw/workspace/office/BACKLOG.md
5. exec: openclaw skills list
6. exec: cd /home/antonbot/.openclaw/workspace/office && git log --oneline -3
7. exec: gh run list --limit 3
8. exec: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify
9. exec: grep -n "BuildRobot\|_floorMat\|ambientLight\|TaskBoard\|cam.transform.position" UnityProject/Assets/Scripts/RuntimeSceneBuilder.cs | grep -v "//"

## DECISION TREE
IF any visual condition FALSE:
 → fix RuntimeSceneBuilder.cs only
 → commit VIZ: prefix
 → push, wait CI green, verify wasm, screenshot, send Telegram
IF all 5 TRUE:
 → take next ACTIVE/TODO from BACKLOG Phase 1
 → PLAN → EXECUTE → VERIFY → REPORT

## QUALITY GATES (task NOT done without all 5):
1. grep verify change applied
2. commit with correct prefix
3. CI green confirmed
4. wasm timestamp changed
5. screenshot sent to Telegram as image

## FORBIDDEN:
- Template responses without exec output
- Marking done without screenshot
- Pushing while CI running
- Shader.Find("Standard") — use URP/Lit
- Changing camera/robot coords during compile fix

## REPORT FORMAT:
VISUAL: [1.T/F 2.T/F 3.T/F 4.T/F 5.T/F]
ACTION: [exact changes + file + lines]
COMMIT: [hash]
WASM: [timestamp]
SCREENSHOT: [attached]
NEXT: [task ID + first step]
