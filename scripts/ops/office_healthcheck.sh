#!/usr/bin/env bash
set -euo pipefail

STATE_URL="${STATE_URL:-http://5.45.115.12:8787/api/state}"
BUILD_DIR="${BUILD_DIR:-/var/www/office/Build}"

TASKS=-1
API_OK=0
if RAW=$(curl -sS --max-time 10 "$STATE_URL" 2>/dev/null); then
  if TASKS_PARSED=$(printf '%s' "$RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tasks'); ts=(d.get('taskState') or {}).get('tasks');
arr=t if isinstance(t,list) else (ts if isinstance(ts,list) else []); print(len(arr))" 2>/dev/null); then
    TASKS="$TASKS_PARSED"
    API_OK=1
  fi
fi

if [[ "$API_OK" == "1" ]]; then
  echo "tasks: $TASKS"
else
  echo "tasks: unknown (API_UNREACHABLE)"
fi

if [[ -f "$BUILD_DIR/WebGL.wasm" ]]; then
  ls -la "$BUILD_DIR/WebGL.wasm"
elif [[ -f "$BUILD_DIR/WebGL.wasm.gz" ]]; then
  ls -la "$BUILD_DIR/WebGL.wasm.gz"
else
  echo "ERROR: WebGL.wasm(.gz) missing in $BUILD_DIR" >&2
  exit 2
fi

MAX_AGE_MIN="${MAX_AGE_MIN:-120}"
OUTPUT_JSON="${OUTPUT_JSON:-0}"

pick_artifact() {
  if [[ -f "$BUILD_DIR/WebGL.wasm.gz" ]]; then
    echo "$BUILD_DIR/WebGL.wasm.gz"
  elif [[ -f "$BUILD_DIR/WebGL.wasm" ]]; then
    echo "$BUILD_DIR/WebGL.wasm"
  else
    return 1
  fi
}

ARTIFACT=$(pick_artifact)
ART_MTIME=$(stat -c %Y "$ARTIFACT")
NOW=$(date +%s)
AGE_MIN=$(( (NOW - ART_MTIME) / 60 ))

if (( AGE_MIN > MAX_AGE_MIN )); then
  STATUS="STALE"
  echo "BUILD STALE (${AGE_MIN}min > ${MAX_AGE_MIN}min): $ARTIFACT"
else
  STATUS="FRESH"
  echo "BUILD FRESH (${AGE_MIN}min <= ${MAX_AGE_MIN}min): $ARTIFACT"
fi

if [[ "$OUTPUT_JSON" == "1" ]]; then
  python3 - <<JSON
import json
print(json.dumps({"tasks": int("$TASKS"), "api_ok": int("$API_OK"), "status": "$STATUS", "age_min": int("$AGE_MIN"), "max_age_min": int("$MAX_AGE_MIN"), "artifact": "$ARTIFACT"}))
JSON
fi
