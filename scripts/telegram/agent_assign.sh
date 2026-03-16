#!/bin/bash
# Assign task to specific agent
# Usage: bash agent_assign.sh <agent-name> <task>
# Example: bash agent_assign.sh "Frontend Developer" "сделать адаптивную кнопку"

BOT_TOKEN="8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
GROUP_ID="-1003780060338"

AGENT="${1:?Usage: $0 <agent-name> <task>}"
TASK="${2:?Usage: $0 <agent-name> <task>}"

# Map robot to thread_id
ROBOT=$(grep "| $AGENT |" /home/antonbot/.openclaw/workspace/office/agents/agency/ALL_AGENTS.md | head -1 | awk -F'|' '{print $5}' | xargs)

case "$ROBOT" in
  CHIEF)    THREAD=3 ;;
  PLANNER)  THREAD=4 ;;
  WORKER)   THREAD=5 ;;
  REVIEWER) THREAD=6 ;;
  BUILDER)  THREAD=7 ;;
  *)        THREAD=3 ;;
esac

TIMESTAMP=$(date -u "+%H:%M UTC")
MSG="[${TIMESTAMP}] 📋 Назначено: ${AGENT}\nЗадача: ${TASK}"

MSG_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$MSG")

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": ${GROUP_ID},
    \"message_thread_id\": ${THREAD},
    \"text\": ${MSG_JSON},
    \"parse_mode\": \"HTML\"
  }" > /dev/null

echo "✅ Задача назначена: $AGENT → топик $THREAD"
