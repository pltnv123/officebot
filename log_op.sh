#!/usr/bin/env bash
set -euo pipefail
# Usage: ./log_op.sh level title details status
# level: now|queue|done|error
SCRIPT_DIR=$(cd -- "$(dirname "$0")" >/dev/null 2>&1 && pwd)
LEVEL="${1:-now}"
TITLE="${2:-step}"
DETAILS="${3:-}"
STATUS="${4:-running}"
TS=$(date -u +%s)
ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ)
python3 - <<PY >> "$SCRIPT_DIR/.live_ops.jsonl"
import json
print(json.dumps({
  'ts': $TS,
  'iso': '$ISO',
  'level': '$LEVEL',
  'title': '$TITLE',
  'details': '$DETAILS',
  'status': '$STATUS'
}, ensure_ascii=False))
PY
# keep file small
tail -n 300 "$SCRIPT_DIR/.live_ops.jsonl" > "$SCRIPT_DIR/.live_ops.jsonl.tmp" || true
mv "$SCRIPT_DIR/.live_ops.jsonl.tmp" "$SCRIPT_DIR/.live_ops.jsonl" || true
bash "$SCRIPT_DIR/update_state.sh" >/dev/null 2>&1 || true
