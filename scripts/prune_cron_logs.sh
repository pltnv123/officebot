#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="/home/antonbot/.openclaw/workspace/office"
LOG_DIR="$BASE_DIR/logs"
PREFIX="cron_monitor_ws.log"
RETENTION=3
cd "$LOG_DIR"
ls -1t ${PREFIX}.* 2>/dev/null | tail -n +$((RETENTION+1)) | xargs -r rm -f
