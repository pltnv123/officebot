#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/antonbot/.openclaw/workspace/office"
ENV_FILE="/home/antonbot/.openclaw/secrets/webstudio-supabase.env"
PID_FILE="/tmp/webstudio-demo/server-8787.pid"
LOG_FILE="/tmp/webstudio-demo/server-8787.log"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing organism env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p /tmp/webstudio-demo

OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
if [ -n "$OLD_PID" ]; then
  kill "$OLD_PID" 2>/dev/null || true
fi

set -a
source "$ENV_FILE"
set +a

cd "$ROOT"

nohup env \
  PORT="${PORT:-8787}" \
  SUPABASE_URL="$SUPABASE_URL" \
  SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  node backend/webStudioDemoServer.js \
  > "$LOG_FILE" 2>&1 &

echo $! > "$PID_FILE"
sleep 2

echo "webstudio_demo_pid=$(cat "$PID_FILE")"
echo "log=$LOG_FILE"
echo "health=http://127.0.0.1:${PORT:-8787}/webstudio/demo"
echo "state=http://127.0.0.1:${PORT:-8787}/api/state"
