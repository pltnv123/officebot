#!/usr/bin/env bash
set -u

ROOT="/home/antonbot/.openclaw/workspace/office"
LOG="/tmp/webstudio-demo/organism-watchdog.log"

mkdir -p /tmp/webstudio-demo
cd "$ROOT" || exit 1

ts() { date -Is; }

echo "$(ts) watchdog start" >> "$LOG"

api_ok=false
smoke_ok=false
gateway_ok=false
memory_ok=false

if curl -sS --max-time 8 http://127.0.0.1:8787/api/state \
  | node -e '
let s="";
process.stdin.on("data",c=>s+=c);
process.stdin.on("end",()=>{
  try {
    const j=JSON.parse(s);
    process.exit(j.ok && j.supabase?.restProbeOk && j.qmd?.memorySearchProven ? 0 : 1);
  } catch { process.exit(1); }
});
' ; then
  api_ok=true
fi

if node scripts/webstudio-organism-memory-smoke.js >/tmp/webstudio-demo/watchdog-smoke.out 2>&1; then
  smoke_ok=true
fi

if openclaw gateway status --deep --require-rpc >/tmp/webstudio-demo/watchdog-gateway.out 2>&1; then
  gateway_ok=true
fi

if openclaw memory search "WebStudio Supabase QMD lossless organism" >/tmp/webstudio-demo/watchdog-memory.out 2>&1; then
  memory_ok=true
fi

echo "$(ts) api=$api_ok smoke=$smoke_ok gateway=$gateway_ok memory=$memory_ok" >> "$LOG"

if [ "$api_ok" != "true" ] || [ "$smoke_ok" != "true" ]; then
  echo "$(ts) restarting webstudio-demo.service" >> "$LOG"
  systemctl --user restart webstudio-demo.service >> "$LOG" 2>&1 || true
fi

if [ "$gateway_ok" != "true" ] || [ "$memory_ok" != "true" ]; then
  echo "$(ts) restarting openclaw-gateway.service" >> "$LOG"
  systemctl --user restart openclaw-gateway.service >> "$LOG" 2>&1 || true
fi

echo "$(ts) watchdog end" >> "$LOG"
