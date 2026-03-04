#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HEALTH="$ROOT/scripts/ops/office_healthcheck.sh"
CANCEL="$HOME/.openclaw/cancel_stuck_builds.sh"

echo "[autoloop_once] healthcheck"
OUTPUT_JSON=1 "$HEALTH"

echo "[autoloop_once] cancel-stuck-builds"
"$CANCEL"

echo "[autoloop_once] done"
