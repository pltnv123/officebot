#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)
PIDFILE="$SCRIPT_DIR/.state_sync_daemon.pid"
LOGFILE="$SCRIPT_DIR/state_sync_daemon.log"

echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT

while true; do
  bash "$SCRIPT_DIR/update_state.sh" >>"$LOGFILE" 2>&1 || true
  sleep 1
done
