#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/home/antonbot/.openclaw/workspace/office"
NODE_BIN="/home/antonbot/.nvm/versions/node/v22.22.0/bin/node"
LOG_DIR="$BASE_DIR/logs"
LOG_FILE="$LOG_DIR/cron_monitor_ws.log"
mkdir -p "$LOG_DIR"
cd "$BASE_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[$TIMESTAMP] Starting verify_ws" >> "$LOG_FILE"
if "$NODE_BIN" scripts/verify_ws.js; then
  echo "[$TIMESTAMP] verify_ws PASS" >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] verify_ws FAIL" >> "$LOG_FILE"
  echo "[$TIMESTAMP] ws.service journal snippet:" >> "$LOG_FILE"
  journalctl -u ws.service -n 20 --no-pager >> "$LOG_FILE"
  exit 1
fi
