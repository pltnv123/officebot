#!/bin/bash
set -euo pipefail
lockfile=/tmp/manual_tick.lock
if ! mkdir "$lockfile" 2>/dev/null; then
  echo "another manual tick is running" >&2
  exit 1
fi
trap 'rmdir "$lockfile"' EXIT
next_step=runtime/state/next-step.json
blockers=runtime/state/blockers.json
if [[ ! -s $next_step ]]; then
  echo "next-step missing or empty" >&2
  exit 1
fi
if [[ -f $blockers ]]; then
  if jq -e 'type=="array" and length>0' "$blockers" >/dev/null 2>&1; then
    echo "blockers present, abort" >&2
    exit 1
  fi
fi
role=$(jq -r '.assignedRole' "$next_step")
case "$role" in
  technical-director|release-manager|qa-lead|devops-engineer|lead-programmer)
    ;;
  *)
    echo "invalid role $role" >&2
    exit 1
    ;;
esac
cat "$next_step" > runtime/state/current-objective.json
tmp=$(mktemp)
jq '.status="completed"' runtime/state/current-objective.json > "$tmp" && mv "$tmp" runtime/state/current-objective.json
now=$(date --iso-8601=seconds)
jq -c --arg now "$now" '. + {completedAt: $now}' "$next_step" >> runtime/state/completed.jsonl
plan=$(jq -r '.[0] // empty' runtime/state/backlog.json)
if [[ -n "$plan" ]]; then
  jq '.[1:]' runtime/state/backlog.json > "$tmp" && mv "$tmp" runtime/state/backlog.json
  jq -c '.title as $title | .description as $desc | .role as $role | {title: $title, description: $desc, assignedRole: $role, status: "queued"}' <<<"$plan" > "$next_step"
else
  echo '{"title":"planner required","description":"No queued tasks","assignedRole":"technical-director","status":"pending"}' > "$next_step"
fi
