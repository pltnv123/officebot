#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HEALTH="$ROOT/scripts/ops/office_healthcheck.sh"
TOKEN_FILE="${TOKEN_FILE:-$HOME/.openclaw/secrets/github_token}"
REPO="${REPO:-pltnv123/officebot}"

TOKEN=$(cat "$TOKEN_FILE")

echo "[status] health"
OUTPUT_JSON=1 "$HEALTH" | tail -n 1

echo "[status] latest-runs"
curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=5" | \
  python3 -c "import sys,json; j=json.load(sys.stdin); [print(r['id'], r['status'], r.get('conclusion'), r['head_sha'][:7]) for r in j.get('workflow_runs',[])[:5]]"
