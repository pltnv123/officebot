#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)
TASKS_DB="$SCRIPT_DIR/tasks.json"
OUT=/tmp/state.json
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GW_CPU=$(ps -C openclaw-gateway -o %cpu= 2>/dev/null | awk '{s+=$1} END {printf "%.2f", s+0}')
LOAD1=$(awk '{print $1}' /proc/loadavg)
TASK_STATE=$(cat "$TASKS_DB")
cat > "$OUT" <<JSON
{"timestamp":"$TS","gatewayUp":true,"gatewayCpu":$GW_CPU,"recentCmds":0,"load1":$LOAD1,"mode":"working","taskState":$TASK_STATE}
JSON
install -m 644 "$OUT" "$SCRIPT_DIR/state.json"
