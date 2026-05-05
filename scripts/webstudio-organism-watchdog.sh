#!/usr/bin/env bash
set -u

ROOT="/home/antonbot/.openclaw/workspace/office"
OPENCLAW_BIN="/home/antonbot/.nvm/versions/node/v22.22.0/bin/openclaw"
LOG="/tmp/webstudio-demo/organism-watchdog.log"
STATE="/tmp/webstudio-demo/organism-watchdog.state"
LOCK="/tmp/webstudio-demo/organism-watchdog.lock"
WEBSTUDIO_SERVICE="webstudio-demo.service"
GATEWAY_SERVICE="openclaw-gateway.service"
FAIL_THRESHOLD=3

mkdir -p /tmp/webstudio-demo

exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date -Is) watchdog already running; skip" >> "$LOG"
  exit 0
fi

cd "$ROOT" || exit 1

ts() { date -Is; }

load_state() {
  web_fail=0
  gateway_fail=0
  [ -f "$STATE" ] && source "$STATE" 2>/dev/null || true
}

save_state() {
  {
    echo "web_fail=$web_fail"
    echo "gateway_fail=$gateway_fail"
  } > "$STATE"
}

retry() {
  local attempts="$1"
  local delay="$2"
  shift 2

  local i
  for i in $(seq 1 "$attempts"); do
    if "$@"; then
      return 0
    fi
    sleep "$delay"
  done

  return 1
}

check_api_state() {
  curl -sS --max-time 8 http://127.0.0.1:8787/api/state \
    | node -e '
let s="";
process.stdin.on("data", c => s += c);
process.stdin.on("end", () => {
  try {
    const j = JSON.parse(s);
    const ok =
      j.ok === true &&
      j.supabase?.restProbeOk === true &&
      j.qmd?.status === "enabled_as_openclaw_memory_backend" &&
      j.qmd?.memorySearchProven === true &&
      j.lossless_claw?.memorySearchProven === true;
    process.exit(ok ? 0 : 1);
  } catch {
    process.exit(1);
  }
});
'
}

check_smoke() {
  node scripts/webstudio-organism-memory-smoke.js >/tmp/webstudio-demo/watchdog-smoke.out 2>&1
}

check_gateway() {
  systemctl --user is-active --quiet "$GATEWAY_SERVICE" &&
    timeout 35 "$OPENCLAW_BIN" gateway status --deep --require-rpc >/tmp/webstudio-demo/watchdog-gateway.out 2>&1
}

check_memory() {
  timeout 60 "$OPENCLAW_BIN" memory search "WebStudio Supabase QMD lossless organism" >/tmp/webstudio-demo/watchdog-memory.out 2>&1
}

# WEBSTUDIO-RUNTIME-OWNER-GUARD: Check that port 8787 is owned by systemd service
check_runtime_owner() {
  # Get service MainPID
  SERVICE_PID=$(systemctl --user show "$WEBSTUDIO_SERVICE" -p MainPID --value 2>/dev/null || echo "")
  
  if [ -z "$SERVICE_PID" ] || [ "$SERVICE_PID" = "" ]; then
    echo "$(ts) SERVICE_PID not found" >> "$LOG"
    return 1
  fi
  
  # Get port 8787 owner PID
  PORT_OWNER_PID=$(ss -ltnp 2>/dev/null | grep ':8787' | sed -n 's/.*users:(("node",pid=\([0-9]*\).*/\1/p' | head -1)
  
  if [ -z "$PORT_OWNER_PID" ]; then
    echo "$(ts) Port 8787 owner not found" >> "$LOG"
    return 1
  fi
  
  # Compare PIDs
  if [ "$SERVICE_PID" != "$PORT_OWNER_PID" ]; then
    echo "$(ts) RUNTIME OWNER MISMATCH: service PID=$SERVICE_PID, port owner PID=$PORT_OWNER_PID" >> "$LOG"
    
    # Kill stale process
    echo "$(ts) Killing stale process $PORT_OWNER_PID" >> "$LOG"
    kill "$PORT_OWNER_PID" 2>/dev/null || true
    sleep 2
    
    # Restart service
    echo "$(ts) Restarting $WEBSTUDIO_SERVICE" >> "$LOG"
    systemctl --user restart "$WEBSTUDIO_SERVICE" >> "$LOG" 2>&1 || true
    sleep 3
    
    # Verify new owner
    NEW_PORT_OWNER=$(ss -ltnp 2>/dev/null | grep ':8787' | sed -n 's/.*users:(("node",pid=\([0-9]*\).*/\1/p' | head -1)
    NEW_SERVICE_PID=$(systemctl --user show "$WEBSTUDIO_SERVICE" -p MainPID --value 2>/dev/null || echo "")
    
    if [ "$NEW_SERVICE_PID" = "$NEW_PORT_OWNER" ]; then
      echo "$(ts) Runtime owner restored: PID=$NEW_SERVICE_PID" >> "$LOG"
      return 0
    else
      echo "$(ts) Runtime owner still mismatched after restart" >> "$LOG"
      return 1
    fi
  fi
  
  echo "$(ts) Runtime owner OK: PID=$SERVICE_PID" >> "$LOG"
  return 0
}

echo "$(ts) watchdog start" >> "$LOG"

load_state

api_ok=false
smoke_ok=false
gateway_ok=false
memory_ok=false
runtime_owner_ok=false

if retry 2 3 check_api_state; then api_ok=true; fi
if retry 2 3 check_smoke; then smoke_ok=true; fi
if retry 3 5 check_gateway; then gateway_ok=true; fi
if retry 2 5 check_memory; then memory_ok=true; fi
if retry 2 3 check_runtime_owner; then runtime_owner_ok=true; fi

if [ "$api_ok" = "true" ] && [ "$smoke_ok" = "true" ] && [ "$runtime_owner_ok" = "true" ]; then
  web_fail=0
else
  web_fail=$((web_fail + 1))
fi

if [ "$gateway_ok" = "true" ] && [ "$memory_ok" = "true" ]; then
  gateway_fail=0
else
  gateway_fail=$((gateway_fail + 1))
fi

echo "$(ts) api=$api_ok smoke=$smoke_ok gateway=$gateway_ok memory=$memory_ok runtime_owner=$runtime_owner_ok web_fail=$web_fail gateway_fail=$gateway_fail" >> "$LOG"

if [ "$web_fail" -ge "$FAIL_THRESHOLD" ]; then
  echo "$(ts) restarting $WEBSTUDIO_SERVICE after $web_fail consecutive failures" >> "$LOG"
  systemctl --user restart "$WEBSTUDIO_SERVICE" >> "$LOG" 2>&1 || true
  web_fail=0
fi

if [ "$gateway_fail" -ge "$FAIL_THRESHOLD" ]; then
  echo "$(ts) restarting $GATEWAY_SERVICE after $gateway_fail consecutive failures" >> "$LOG"
  systemctl --user restart "$GATEWAY_SERVICE" >> "$LOG" 2>&1 || true
  gateway_fail=0
fi

save_state

echo "$(ts) watchdog end" >> "$LOG"
