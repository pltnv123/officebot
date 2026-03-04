#!/usr/bin/env bash
set -euo pipefail

TOKEN=$(cat ~/.openclaw/secrets/github_token)
REPO="${REPO:-pltnv123/officebot}"
THRESHOLD_MIN="${THRESHOLD_MIN:-35}"
PER_PAGE="${PER_PAGE:-30}"
TMP_JSON=$(mktemp)
trap 'rm -f "$TMP_JSON"' EXIT

curl -s -H "Authorization: token $TOKEN" -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/actions/runs?per_page=$PER_PAGE" > "$TMP_JSON"

python3 - "$THRESHOLD_MIN" "$TOKEN" "$REPO" "$TMP_JSON" <<'PY'
import sys, json, datetime, subprocess
threshold, token, repo, path = int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
now = datetime.datetime.now(datetime.timezone.utc)

with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

runs = data.get('workflow_runs', [])
old = []
for r in runs:
    if r.get('status') != 'in_progress':
        continue
    created = r.get('created_at')
    try:
        dt = datetime.datetime.strptime(created, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=datetime.timezone.utc)
    except Exception:
        continue
    age = int((now - dt).total_seconds() // 60)
    if age > threshold:
        old.append((r['id'], age))

if not old:
    print('No stuck builds found.')
    sys.exit(0)

for run_id, age in old:
    print(f'Build {run_id} stuck for {age}min — cancelling')
    cmd = [
        'curl','-s','-X','POST',
        '-H',f'Authorization: token {token}',
        '-H','Accept: application/vnd.github.v3+json',
        f'https://api.github.com/repos/{repo}/actions/runs/{run_id}/cancel'
    ]
    subprocess.check_output(cmd, text=True)
    print(f'Cancel requested: {run_id}')
PY
