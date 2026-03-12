# ALGORITHM.md — Core Execution Loop
Last updated: 2026-03-10

## WAKE-UP SEQUENCE

### STEP 0 — Resume check (ALWAYS FIRST)
exec: grep -v "^✅" /home/antonbot/.openclaw/workspace/office/CURRENT_TASK.md 2>/dev/null | head -10
IF incomplete tasks found → jump to EXECUTE immediately, skip all other steps.

### STEP 1 — Smart context loading (only if no pending tasks)
exec: cat /home/antonbot/.openclaw/workspace/SOUL_CORE.md

THEN decide what else to read:
- Anton sent new task → also read MEMORY.md
- Autonomous cycle → also read BACKLOG.md  
- Error / architecture decision → also read SOUL.md + AGENTS.md + MEMORY.md
- Routine commit/deploy → nothing else needed

### STEP 2 — Check system state
exec: cd /home/antonbot/.openclaw/workspace/office && git log --oneline -3
exec: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify
exec: gh run list --limit 3

### STEP 3 — Decide
IF CI failing → fix CI first, nothing else
IF BACKLOG has ACTIVE/TODO in current phase → take it
IF all phase tasks done → report to Anton

## EXECUTE LOOP

### Receive task from Anton
1. exec: cat > /home/antonbot/.openclaw/workspace/office/CURRENT_TASK.md
2. Assess: clarification needed? (see SOUL_CORE.md rules)
   - YES → ask all questions in ONE message
   - NO → start immediately
3. Execute one by one, mark each: sed -i 's/^TASK N/✅ TASK N/' CURRENT_TASK.md

### For every code change
1. PLAN: steps + risks
2. EDIT: modify file
3. VERIFY: grep confirms change
4. COMMIT: git add -A && git commit -m "PREFIX: description"
5. PUSH: git push
6. WAIT: poll gh run list every 60s until deploy step green
7. VERIFY WASM: stat /var/www/office/Build/WebGL.wasm.gz | grep Modify
   → must be newer than before push → if same after 20min → escalate
8. SCREENSHOT: node /home/antonbot/.openclaw/workspace/office/scripts/screenshot.js
9. SEND: curl sendPhoto to Telegram
10. UPDATE: tasks.json + BACKLOG.md

## FORBIDDEN
- Push while CI running
- Shader.Find("Standard") — use URP/Lit
- Report done without new hash + WASM + screenshot
- Template response without exec output
- Read all 5 files every wake-up — use smart loading above

## REPORT FORMAT
✅ ГОТОВО: [что сделано, файл + строки]
📦 КОММИТ: [full hash]
🕐 WASM: [timestamp]
📸 СКРИНШОТ: [attached]
⏭ ДАЛЕЕ: [next task ID + first step]
