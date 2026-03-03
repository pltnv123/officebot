#!/bin/bash
LOG="/home/antonbot/.openclaw/workspace/office/watchdog.log"
TASKS="/home/antonbot/.openclaw/workspace/office/tasks.json"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
echo "=== $TIMESTAMP ===" >> $LOG
# Check 1: nginx running
if ! systemctl is-active --quiet nginx; then
  echo "ERROR: nginx down - restarting" >> $LOG
  sudo systemctl restart nginx
fi
# Check 2: tasks.json valid
if ! python3 -c "import json; json.load(open('$TASKS'))" 2>/dev/null; then
  echo "ERROR: tasks.json corrupted" >> $LOG
fi
# Check 3: page responds
HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://5.45.115.12/office/)
if [ "$HTTP" != "200" ]; then
  echo "ERROR: page returned $HTTP" >> $LOG
fi
# Check 4: active task stuck detection
ACTIVE=$(python3 -c "
import json,time
tasks=json.load(open('$TASKS'))
for t in tasks.get('tasks',[]):
  if t.get('status')=='doing':
    started=t.get('started_at',0)
    if started and (time.time()-started)>2700:
      print(t.get('id','unknown'))
" 2>/dev/null)
if [ -n "$ACTIVE" ]; then
  echo "WARNING: task $ACTIVE stuck >45min" >> $LOG
fi
echo "OK: watchdog complete" >> $LOG
