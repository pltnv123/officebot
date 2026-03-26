#!/usr/bin/env bash
set -euo pipefail
BOT_TOKEN="8642936151:AAFvKt0MY3XAlYst6SP6ek5REaul8D_JgUs"
CHAT_ID="-1003780060338"
THREAD_ID="3"
PHOTO_PATH="${1:-/tmp/office_verify.png}"
CAPTION="Live office screenshot"
if [ ! -f "$PHOTO_PATH" ]; then
  echo "missing screenshot: $PHOTO_PATH" >&2
  exit 1
fi
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto" \
  -F "chat_id=${CHAT_ID}" \
  -F "message_thread_id=${THREAD_ID}" \
  -F "caption=${CAPTION}" \
  -F "photo=@${PHOTO_PATH}"
