#!/bin/bash
# Create forum topics in an existing Telegram supergroup
# Usage: bash create_topics.sh <GROUP_ID>

BOT_TOKEN="8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
GROUP_ID="${1:?Usage: $0 <GROUP_ID>}"

create_topic() {
  local name="$1"
  local icon_color="$2"
  local result=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\": ${GROUP_ID}, \"name\": \"${name}\", \"icon_color\": ${icon_color}}")
  local ok=$(echo "$result" | python3 -c "import json,sys; print(json.load(sys.stdin).get('ok', False))")
  local thread_id=$(echo "$result" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('result',{}).get('message_thread_id','FAIL'))" 2>/dev/null)
  echo "${name}: ok=${ok} thread_id=${thread_id}"
}

echo "Creating topics in group ${GROUP_ID}..."
create_topic "🏠 Главный" 7322109
create_topic "📋 Planner" 13332209
create_topic "🔧 Worker" 16766552
create_topic "🔍 Reviewer" 16755275
create_topic "🏗️ Builder" 9221512
create_topic "👁️ VReviewer" 6162076

echo "Done. Save thread IDs for automation."
