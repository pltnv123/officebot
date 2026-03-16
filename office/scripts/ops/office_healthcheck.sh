#!/usr/bin/env bash
set -euo pipefail

STATE_URL="${STATE_URL:-http://5.45.115.12:8787/api/state}"
ALT_STATE_URL="${ALT_STATE_URL:-http://5.45.115.12:8787/api/ops/health}"
CURL_TIMEOUT_SEC="${CURL_TIMEOUT_SEC:-10}"
CURL_RETRIES="${CURL_RETRIES:-1}"
CURL_CONNECT_TIMEOUT_SEC="${CURL_CONNECT_TIMEOUT_SEC:-3}"
BUILD_DIR="${BUILD_DIR:-/var/www/office/Build}"

TASKS=-1
API_OK=0
API_SOURCE="none"
API_NOTE=""
API_ERR=""
STATE_CURL_RC=0
OPS_CURL_RC=0
if RAW=$(curl -sS --retry "$CURL_RETRIES" --retry-delay 1 --connect-timeout "$CURL_CONNECT_TIMEOUT_SEC" --max-time "$CURL_TIMEOUT_SEC" "$STATE_URL" 2>/dev/null); then
  if TASKS_PARSED=$(printf '%s' "$RAW" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tasks'); ts=(d.get('taskState') or {}).get('tasks');
arr=t if isinstance(t,list) else (ts if isinstance(ts,list) else []); print(len(arr))" 2>/dev/null); then
    TASKS="$TASKS_PARSED"
    API_OK=1
    API_SOURCE="state"
  else
    API_NOTE="state_parse_failed"
    API_ERR="state_parse_failed"
  fi
else
  STATE_CURL_RC=$?
  API_NOTE="state_unreachable"
  API_ERR="state_fetch_failed(rc:${STATE_CURL_RC})"
fi

if [[ "$API_OK" != "1" ]]; then
  if RAW2=$(curl -sS --retry "$CURL_RETRIES" --retry-delay 1 --connect-timeout "$CURL_CONNECT_TIMEOUT_SEC" --max-time "$CURL_TIMEOUT_SEC" "$ALT_STATE_URL" 2>/dev/null); then
    if TASKS_PARSED2=$(printf '%s' "$RAW2" | python3 -c "import sys,json; d=json.load(sys.stdin); t=d.get('tasks',{}); print(int(t.get('total',-1)))" 2>/dev/null); then
      TASKS="$TASKS_PARSED2"
      API_OK=1
      API_SOURCE="ops_health"
      API_NOTE=""
      API_ERR=""
    else
      API_NOTE="ops_health_parse_failed"
      API_ERR="ops_health_parse_failed"
    fi
  else
    OPS_CURL_RC=$?
    API_NOTE="ops_health_unreachable"
    API_ERR="ops_health_fetch_failed(rc:${OPS_CURL_RC})"
  fi
fi

if [[ "$API_OK" == "1" ]]; then
  echo "tasks: $TASKS (source:$API_SOURCE)"
else
  echo "tasks: unknown (API_UNREACHABLE${API_NOTE:+:$API_NOTE})"
fi

HOSTNAME_VAL="$(hostname 2>/dev/null || echo unknown)"
SCRIPT_VERSION="2026-03-06.1"

echo "state_url: $STATE_URL"
echo "alt_state_url: $ALT_STATE_URL"
echo "api_error: ${API_ERR:-none}"
echo "curl_timeout_sec: $CURL_TIMEOUT_SEC"
echo "curl_connect_timeout_sec: $CURL_CONNECT_TIMEOUT_SEC"
echo "curl_retries: $CURL_RETRIES"
echo "host: $HOSTNAME_VAL"
echo "script_version: $SCRIPT_VERSION"
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
print(json.dumps({"tasks": int("$TASKS"), "api_ok": int("$API_OK"), "api_source": "$API_SOURCE", "api_note": "$API_NOTE", "api_error": "${API_ERR:-}", "state_url": "$STATE_URL", "alt_state_url": "$ALT_STATE_URL", "curl_timeout_sec": int("$CURL_TIMEOUT_SEC"), "curl_connect_timeout_sec": int("$CURL_CONNECT_TIMEOUT_SEC"), "curl_retries": int("$CURL_RETRIES"), "host": "$HOSTNAME_VAL", "script_version": "$SCRIPT_VERSION", "status": "$STATUS", "age_min": int("$AGE_MIN"), "age_sec": int("$AGE_SEC"), "max_age_min": int("$MAX_AGE_MIN"), "build_dir": "$BUILD_DIR", "artifact": "$ARTIFACT", "artifact_mtime": int("$ART_MTIME"), "checked_at_utc": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}))
JSON
fi
