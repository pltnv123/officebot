#!/bin/bash
set -euo pipefail
bridge=runtime/state/next-step.json
if [[ ! -f "$bridge" ]]; then
  echo "missing next-step" >&2
  exit 1
fi
step=$(cat "$bridge")
role=$(jq -r '.assignedRole' <<<"$step")
case "$role" in
  technical-director|release-manager|qa-lead|devops-engineer|lead-programmer)
    ;;
  *)
    echo "invalid role $role" >&2
    exit 1
    ;;
esac
echo "$step" > runtime/state/current-objective.json
tmpfile=$(mktemp)
jq '.status="completed"' runtime/state/current-objective.json > "$tmpfile" && mv "$tmpfile" runtime/state/current-objective.json
now=$(date --iso-8601=seconds)
jq -c --arg now "$now" '. + {completedAt: $now}' <<<"$step" >> runtime/state/completed.jsonl
echo '{}' > runtime/state/next-step.json
