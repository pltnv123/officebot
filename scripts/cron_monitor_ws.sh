#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/home/antonbot/.openclaw/workspace/office"
NODE_BIN="/home/antonbot/.nvm/versions/node/v22.22.0/bin/node"
LOG_DIR="$BASE_DIR/logs"
LOG_FILE="$LOG_DIR/cron_monitor_ws.log"
STATUS_FILE="$BASE_DIR/engineering_status.json"
mkdir -p "$LOG_DIR"
cd "$BASE_DIR"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "[$TIMESTAMP] Starting verify_ws" >> "$LOG_FILE"
if "$NODE_BIN" scripts/verify_ws.js; then
  echo "[$TIMESTAMP] verify_ws PASS" >> "$LOG_FILE"
else
  echo "[$TIMESTAMP] verify_ws FAIL" >> "$LOG_FILE"
  JOURNAL=$(journalctl -u ws.service -n 20 --no-pager)
  echo "[$TIMESTAMP] ws.service journal snippet:" >> "$LOG_FILE"
  echo "$JOURNAL" >> "$LOG_FILE"
  if [ -f "$STATUS_FILE" ]; then
    python3 - <<PY
import json
from pathlib import Path
path = Path("$STATUS_FILE")
try:
    data = json.loads(path.read_text())
except Exception:
    data = {}
data.setdefault('ws_monitor', {})['lastFailure'] = "$TIMESTAMP"
data['ws_monitor']['journalSnippet'] = r"""$JOURNAL"""
path.write_text(json.dumps(data, indent=2))
PY
  else
    cat <<JSON > "$STATUS_FILE"
{
  "ws_monitor": {
    "lastFailure": "$TIMESTAMP",
    "journalSnippet": "$(echo "$JOURNAL" | sed 's/"/\\"/g')"
  }
}
JSON
  fi
  exit 1
fi
