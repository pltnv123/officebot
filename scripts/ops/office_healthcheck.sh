#!/usr/bin/env bash
set -euo pipefail

STATE_URL="${STATE_URL:-http://5.45.115.12:8787/api/state}"
BUILD_DIR="${BUILD_DIR:-/var/www/office/Build}"

curl -s "$STATE_URL" | python3 -c "import sys,json; d=json.load(sys.stdin); print('tasks:', len(d.get('tasks',[])))"

if [[ -f "$BUILD_DIR/WebGL.wasm" ]]; then
  ls -la "$BUILD_DIR/WebGL.wasm"
elif [[ -f "$BUILD_DIR/WebGL.wasm.gz" ]]; then
  ls -la "$BUILD_DIR/WebGL.wasm.gz"
else
  echo "ERROR: WebGL.wasm(.gz) missing in $BUILD_DIR" >&2
  exit 2
fi

if find "$BUILD_DIR" -name "*.wasm" -mmin +120 | grep -q .; then
  echo "BUILD STALE (.wasm)"
elif find "$BUILD_DIR" -name "*.wasm.gz" -mmin +120 | grep -q .; then
  echo "BUILD STALE (.wasm.gz)"
else
  echo "BUILD FRESH"
fi
