#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/home/antonbot/.openclaw/workspace/office"
NODE_BIN="/home/antonbot/.nvm/versions/node/v22.22.0/bin/node"
LOG_DIR="$BASE_DIR/logs"
LOG_FILE="$LOG_DIR/cron_monitor_ws.log"
STATUS_FILE="$BASE_DIR/engineering_status.json"
LOG_ROTATE_LIMIT=200000
mkdir -p "$LOG_DIR"
cd "$BASE_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
log(){
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
}
rotate_log(){
  if [ -f "$LOG_FILE" ]; then
    size=$(stat -c %s "$LOG_FILE")
    if [ "$size" -ge "$LOG_ROTATE_LIMIT" ]; then
      mv "$LOG_FILE" "$LOG_FILE.$TIMESTAMP"
      touch "$LOG_FILE"
      echo "[$TIMESTAMP] log rotated" >> "$LOG_FILE"
    fi
  fi
}
rotate_log
log "Starting verify_ws"
if "$NODE_BIN" scripts/verify_ws.js; then
  log "verify_ws PASS"
  WATCHDOG_OUT=$("$NODE_BIN" scripts/task_watchdog.js || true)
  if [ -n "$WATCHDOG_OUT" ]; then
    log "watchdog: $WATCHDOG_OUT"
  fi
  HEALTH_OUT=$("$NODE_BIN" scripts/queue_health.js 2>&1)
  PENDING=$(echo "$HEALTH_OUT" | awk '/pendingCount/ {gsub(/,/, "", $2); print $2}')
  if [ -n "$PENDING" ] && [ "$PENDING" -gt 0 ]; then
    OLDEST=$(echo "$HEALTH_OUT" | awk '/oldestPendingSeconds/ {gsub(/,/, "", $2); print $2}')
    log "queue health pending=${PENDING} oldest=${OLDEST}s"
  fi
else
  log "verify_ws FAIL"
  JOURNAL=$(journalctl -u ws.service -n 20 --no-pager)
  log "ws.service journal snippet"
  printf "%s\n" "$JOURNAL" >> "$LOG_FILE"
  exit 1
fi
