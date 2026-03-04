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
  LINE=$(curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/actions/runs?per_page=30" | \
    python3 -c "import sys,json; j=json.load(sys.stdin); s='$SHA_PREFIX';
for r in j.get('workflow_runs',[]):
  if r.get('head_sha','').startswith(s):
    print(r['id'], r['status'], str(r.get('conclusion'))); break")

  if [[ -n "$LINE" ]]; then
    echo "$LINE"
    STATUS=$(awk '{print $2}' <<<"$LINE")
    CONCLUSION=$(awk '{print $3}' <<<"$LINE")
    if [[ "$STATUS" == "completed" ]]; then
      [[ "$CONCLUSION" == "success" ]] && exit 0 || exit 1
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
