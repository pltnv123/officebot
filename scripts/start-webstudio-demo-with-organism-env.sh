#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/antonbot/.openclaw/workspace/office"
ENV_FILE="/home/antonbot/.openclaw/secrets/webstudio-supabase.env"
PID_FILE="/tmp/webstudio-demo/server-8787.pid"
LOG_FILE="/tmp/webstudio-demo/server-8787.log"
WEBSTUDIO_SERVICE="webstudio-demo.service"

# WEBSTUDIO-RUNTIME-OWNER-GUARD: Prefer systemd service over raw nohup
if systemctl --user list-unit-files "$WEBSTUDIO_SERVICE" >/dev/null 2>&1; then
  echo "Systemd service found: $WEBSTUDIO_SERVICE"
  echo "Restarting via systemd..."
  systemctl --user restart "$WEBSTUDIO_SERVICE"
  sleep 3
  
  # Verify /api/state
  echo "Verifying /api/state..."
  STATE_RESPONSE=$(curl -sS --max-time 10 http://127.0.0.1:8787/api/state || echo "FAILED")
  
  if echo "$STATE_RESPONSE" | python3 -c '
import sys, json
try:
  d = json.load(sys.stdin)
  ok = d.get("ok") == True and d.get("supabase", {}).get("restProbeOk") == True
  sys.exit(0 if ok else 1)
except:
  sys.exit(1)
' 2>/dev/null; then
    echo "✅ /api/state OK"
    echo "✅ supabase.restProbeOk=true"
  else
    echo "❌ /api/state verification failed"
    echo "Response: $STATE_RESPONSE"
    exit 1
  fi
  
  # Run organism smoke
  echo "Running organism smoke..."
  cd "$ROOT"
  if node scripts/webstudio-organism-memory-smoke.js; then
    echo "✅ Organism smoke passed"
  else
    echo "❌ Organism smoke failed"
    exit 1
  fi
  
  SERVICE_PID=$(systemctl --user show "$WEBSTUDIO_SERVICE" -p MainPID --value)
  echo "✅ Service PID: $SERVICE_PID"
  echo "✅ Runtime owner: systemd ($WEBSTUDIO_SERVICE)"
  exit 0
fi

# Fallback: raw nohup start (only if systemd service not available)
echo "⚠️ Systemd service not found, using fallback raw start..."

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
