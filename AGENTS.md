
## Telegram Reporting Rules
- Every 30 minutes send a status update in Telegram.
- Status format is mandatory: 1) Сделано 2) В работе 3) Следующий шаг 4) ETA (база+буфер+итог+дедлайн UTC).
- If deadline risk appears, warn proactively before deadline.

## Agent Usage Rule
- Use specialized agents/plans for every non-trivial task and keep task ownership visible in the task board.

## SYSTEM UPDATE: Task Execution Rules (Mandatory)

### RULE 1 — ONE TASK AT A TIME
- Never start a new task until current task status = "done".
- "done" means: code written + tested + deployed + visible result confirmed.
- If stuck more than 15 min on same task — try alternative approach, do not skip.

### RULE 2 — SELF-HEALING LOOP
When any step fails:
1. Read the error message carefully.
2. Try fix #1 (most obvious solution).
3. If fails — try fix #2 (alternative approach).
4. If fails — try fix #3 (simplified/fallback version).
5. Only after 3 failed attempts — report blocker to Anton.

Never report "done" without verifying the result actually works.

### RULE 3 — VERIFY BEFORE MARKING DONE
Before marking any task done:
- Run the relevant test or check.
- Open the page and confirm visual result.
- Check logs for errors.
- Only then set status = done.

### RULE 4 — ERROR DETECTION
Every 10 minutes run:
- Check nginx/server logs for errors.
- Check if Unity process is running.
- Check if tasks.json is valid JSON.
- Check if page loads correctly.

If any check fails — fix immediately and report in next update.

### RULE 5 — PROGRESS REPORTING
Every 30 min Telegram report must include:
- Current task name and % complete.
- Last action taken.
- Next action planned.
- Any errors found and how fixed.
- Proof of completion (URL, log line, or screenshot description).
