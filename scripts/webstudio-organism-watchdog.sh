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

echo "$(ts) watchdog start" >> "$LOG"

load_state

api_ok=false
smoke_ok=false
gateway_ok=false
memory_ok=false

if retry 2 3 check_api_state; then api_ok=true; fi
if retry 2 3 check_smoke; then smoke_ok=true; fi
if retry 3 5 check_gateway; then gateway_ok=true; fi
if retry 2 5 check_memory; then memory_ok=true; fi

if [ "$api_ok" = "true" ] && [ "$smoke_ok" = "true" ]; then
  web_fail=0
else
  web_fail=$((web_fail + 1))
fi

if [ "$gateway_ok" = "true" ] && [ "$memory_ok" = "true" ]; then
  gateway_fail=0
else
  gateway_fail=$((gateway_fail + 1))
fi

echo "$(ts) api=$api_ok smoke=$smoke_ok gateway=$gateway_ok memory=$memory_ok web_fail=$web_fail gateway_fail=$gateway_fail" >> "$LOG"

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
