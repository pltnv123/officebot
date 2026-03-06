#!/usr/bin/env bash
set -euo pipefail

STATE_URL="${STATE_URL:-http://5.45.115.12:8787/api/state}"
ALT_STATE_URL="${ALT_STATE_URL:-http://5.45.115.12:8787/api/ops/health}"
BUILD_DIR="${BUILD_DIR:-/var/www/office/Build}"

TASKS=-1
API_OK=0
API_SOURCE="none"
API_NOTE=""
if RAW=$(curl -sS --max-time 10 "$STATE_URL" 2>/dev/null); then
  if TASKS_PARSED=$(printf '%s' "$RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tasks'); ts=(d.get('taskState') or {}).get('tasks');
arr=t if isinstance(t,list) else (ts if isinstance(ts,list) else []); print(len(arr))" 2>/dev/null); then
    TASKS="$TASKS_PARSED"
    API_OK=1
    API_SOURCE="state"
  fi
fi

if [[ "$API_OK" != "1" ]]; then
  API_NOTE="state_unreachable"
  if RAW2=$(curl -sS --max-time 10 "$ALT_STATE_URL" 2>/dev/null); then
    if TASKS_PARSED2=$(printf '%s' "$RAW2" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tasks',{}); print(int(t.get('total',-1)))" 2>/dev/null); then
      TASKS="$TASKS_PARSED2"
      API_OK=1
      API_SOURCE="ops_health"
      API_NOTE=""
    else
      API_NOTE="ops_health_parse_failed"
    fi
  else
    API_NOTE="ops_health_unreachable"
  fi
fi

if [[ "$API_OK" == "1" ]]; then
  echo "tasks: $TASKS (source:$API_SOURCE)"
else
  echo "tasks: unknown (API_UNREACHABLE${API_NOTE:+:$API_NOTE})"
fi

HOSTNAME_VAL="$(hostname 2>/dev/null || echo unknown)"

echo "state_url: $STATE_URL"
echo "alt_state_url: $ALT_STATE_URL"
echo "host: $HOSTNAME_VAL"
echo "checked_at_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

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

AGE_SEC=$(( NOW - ART_MTIME ))

if (( AGE_MIN > MAX_AGE_MIN )); then
  STATUS="STALE"
  echo "BUILD STALE (${AGE_MIN}min / ${AGE_SEC}s > ${MAX_AGE_MIN}min): $ARTIFACT"
else
  STATUS="FRESH"
  echo "BUILD FRESH (${AGE_MIN}min / ${AGE_SEC}s <= ${MAX_AGE_MIN}min): $ARTIFACT"
fi

if [[ "$OUTPUT_JSON" == "1" ]]; then
  python3 - <<JSON
import json
print(json.dumps({"tasks": int("$TASKS"), "api_ok": int("$API_OK"), "api_source": "$API_SOURCE", "api_note": "$API_NOTE", "state_url": "$STATE_URL", "alt_state_url": "$ALT_STATE_URL", "host": "$HOSTNAME_VAL", "status": "$STATUS", "age_min": int("$AGE_MIN"), "age_sec": int("$AGE_SEC"), "max_age_min": int("$MAX_AGE_MIN"), "build_dir": "$BUILD_DIR", "artifact": "$ARTIFACT", "artifact_mtime": int("$ART_MTIME"), "checked_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}))
JSON
fi
