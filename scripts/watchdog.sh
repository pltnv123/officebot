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

# Telegram alert function
send_telegram() {
  BOT_TOKEN=$(node -e "const d=require('/home/antonbot/.openclaw/openclaw.json');console.log(d.channels.telegram.botToken)" 2>/dev/null)
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=6540715349&text=$1" > /dev/null
}

# Alert on errors
if ! systemctl is-active --quiet nginx; then
  send_telegram "🔴 WATCHDOG: nginx упал, перезапускаю"
fi
if [ "$HTTP" != "200" ]; then
  send_telegram "🔴 WATCHDOG: сайт вернул HTTP $HTTP"
fi
if [ -n "$ACTIVE" ]; then
  send_telegram "⚠️ WATCHDOG: задача $ACTIVE зависла больше 45 минут"
fi
