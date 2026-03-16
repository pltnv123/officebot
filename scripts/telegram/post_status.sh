#!/bin/bash
# Post agent status to its Telegram topic
# Usage: bash post_status.sh <GROUP_ID> <THREAD_ID> <MESSAGE>

BOT_TOKEN="8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
GROUP_ID="${1:?Usage: $0 <GROUP_ID> <THREAD_ID> <MESSAGE>}"
THREAD_ID="${2:?Usage: $0 <GROUP_ID> <THREAD_ID> <MESSAGE>}"
MESSAGE="${3:?Usage: $0 <GROUP_ID> <THREAD_ID> <MESSAGE>}"

# Escape message for JSON
MSG_JSON=$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$MESSAGE")

curl -s "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": ${GROUP_ID},
    \"message_thread_id\": ${THREAD_ID},
    \"text\": ${MSG_JSON},
    \"parse_mode\": \"HTML\"
  }"
