#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-pltnv123/officebot}"
TOKEN_FILE="${TOKEN_FILE:-$HOME/.openclaw/secrets/github_token}"
SHA_PREFIX="${1:-${SHA_PREFIX:-}}"
TIMEOUT_SEC="${TIMEOUT_SEC:-1800}"
SLEEP_SEC="${SLEEP_SEC:-20}"

if [[ -z "$SHA_PREFIX" ]]; then
  echo "Usage: $0 <sha-prefix>" >&2
  exit 2
fi

TOKEN=$(cat "$TOKEN_FILE")
START=$(date +%s)

while true; do
  RESP=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/actions/runs?per_page=100" || true)

  LINE=$(printf '%s' "$RESP" | python3 -c "import sys,json
s='$SHA_PREFIX'
raw=sys.stdin.read().strip()
if not raw:
  print('')
  raise SystemExit(0)
try:
  j=json.loads(raw)
except Exception:
  print('')
  raise SystemExit(0)
if isinstance(j, dict) and j.get('message'):
  print('')
  raise SystemExit(0)
runs = j.get('workflow_runs',[]) if isinstance(j, dict) else []
# pick newest matching run for this sha prefix
for r in runs:
  if str(r.get('head_sha','')).startswith(s):
    print(r['id'], r.get('status'), str(r.get('conclusion')), r.get('html_url',''))
    break")

  if [[ -n "$LINE" ]]; then
    echo "$LINE"
    STATUS=$(awk '{print $2}' <<<"$LINE")
    CONCLUSION=$(awk '{print $3}' <<<"$LINE")
    if [[ "$STATUS" == "completed" ]]; then
      if [[ "$CONCLUSION" == "success" ]]; then
        exit 0
      elif [[ "$CONCLUSION" == "cancelled" ]]; then
        # superseded run; keep waiting for the next run on same SHA prefix
        echo "run cancelled for $SHA_PREFIX; waiting for next run" >&2
      else
        exit 1
      fi
    fi
  else
    echo "no-run-yet for $SHA_PREFIX"
  fi

  NOW=$(date +%s)
  if (( NOW - START > TIMEOUT_SEC )); then
    echo "timeout waiting for green: $SHA_PREFIX" >&2
    exit 124
  fi
  sleep "$SLEEP_SEC"
done
