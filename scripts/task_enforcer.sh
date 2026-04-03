#!/bin/bash
TASKS="/home/antonbot/.openclaw/workspace/office/tasks.json"
LOG="/home/antonbot/.openclaw/workspace/office/watchdog.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
echo "=== ENFORCER $TIMESTAMP ===" >> $LOG
# Find all doing tasks
DOING=$(python3 -c "
import json,time
tasks=json.load(open('$TASKS'))
for t in tasks.get('tasks',[]):
  if t.get('status')=='doing':
    progress=t.get('progress',0)
    print(f\"{t['id']}|{progress}|{t.get('title','')}\")
" 2>/dev/null)
if [ -z "$DOING" ]; then
  echo "ENFORCER: no active tasks - picking next todo" >> $LOG
  # Auto-start next todo task
  python3 -c "
import json
data=json.load(open('$TASKS'))
for t in data.get('tasks',[]):
  if t.get('status')=='todo':
    t['status']='doing'
    import time; t['started_at']=int(time.time())
    break
with open('$TASKS','w') as f: json.dump(data,f,indent=2)
print('Started next task')
" 2>/dev/null >> $LOG
fi
echo "$DOING" | while IFS='|' read -r id progress title; do
  if [ -n "$id" ]; then
    echo "ENFORCER: active=$id progress=$progress% title=$title" >> $LOG
    if [ "$progress" -ge 100 ] 2>/dev/null; then
      echo "ENFORCER: $id at 100% - marking done" >> $LOG
      python3 -c "
import json,time
data=json.load(open('$TASKS'))
for t in data.get('tasks',[]):
  if t['id']=='$id':
    t['status']='done'
    t['completed_at']=int(time.time())
with open('$TASKS','w') as f: json.dump(data,f,indent=2)
" 2>/dev/null
    fi
  fi
done
echo "ENFORCER: complete" >> $LOG

if [[ -f "$LOG" ]]; then
  echo "ENFORCER: guarded manual tick hook" >> "$LOG"
else
  echo "ENFORCER: guarded manual tick hook"
fi

if bash scripts/manual_tick.sh >> "$LOG" 2>&1; then
  echo "ENFORCER: manual tick executed" >> "$LOG"
else
  echo "ENFORCER: manual tick skipped or blocked" >> "$LOG"
fi
