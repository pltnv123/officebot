#!/bin/bash
# Agent reports status to its Telegram topic
# Usage: bash agent_report.sh <agent_name> <status_message>
# Example: bash agent_report.sh worker "✅ Коммит abc123: добавил OfficeStateSnapshot.cs"

BOT_TOKEN="8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
GROUP_ID="-1003780060338"

AGENT="${1:?Usage: $0 <agent_name> <message>}"
MESSAGE="${2:?Usage: $0 <agent_name> <message>}"

# Map agent names to thread IDs
case "$AGENT" in
  main|chief|glavny)    THREAD_ID=3 ;;
  planner)              THREAD_ID=4 ;;
  worker)               THREAD_ID=5 ;;
  reviewer)             THREAD_ID=6 ;;
  builder)              THREAD_ID=7 ;;
  vreviewer)            THREAD_ID=8 ;;
  *)                    THREAD_ID=3 ;;  # default to main
esac

# Add timestamp
TIMESTAMP=$(date -u "+%H:%M UTC")
FULL_MSG="[${TIMESTAMP}] ${MESSAGE}"

# Escape for JSON
MSG_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$FULL_MSG")

# Send to agent's own topic
RESULT=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": ${GROUP_ID},
    \"message_thread_id\": ${THREAD_ID},
    \"text\": ${MSG_JSON},
    \"parse_mode\": \"HTML\"
  }")

OK=$(echo "$RESULT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok', False))" 2>/dev/null)

# ALWAYS also send to Главный (thread_id=3) if not already going there
if [ "$THREAD_ID" != "3" ]; then
  MAIN_MSG="[${TIMESTAMP}] ${AGENT}: ${MESSAGE}"
  MAIN_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$MAIN_MSG")
  curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{
      \"chat_id\": ${GROUP_ID},
      \"message_thread_id\": 3,
      \"text\": ${MAIN_JSON},
      \"parse_mode\": \"HTML\"
    }" > /dev/null
fi

echo "agent=$AGENT thread=$THREAD_ID sent=$OK"
