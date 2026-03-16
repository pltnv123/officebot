#!/usr/bin/env bash
# assign_task.sh — Assign a task to a specific agent/robot
# Usage: bash assign_task.sh <robot> <task_title> [priority]
# Robots: chief, planner, worker, reviewer, builder
# Priority: low, normal, high, critical (default: normal)

set -euo pipefail

STATE_FILE="/var/www/office/state.json"
ROBOT="${1:-}"
TASK_TITLE="${2:-}"
PRIORITY="${3:-normal}"

if [ -z "$ROBOT" ] || [ -z "$TASK_TITLE" ]; then
    echo "Usage: assign_task.sh <robot> <task_title> [priority]"
    echo ""
    echo "Robots:"
    echo "  chief    — Orchestrator (gold). Routes tasks, coordinates team."
    echo "  planner  — Product/PM (orange). Planning, prioritization."
    echo "  worker   — Engineering (blue). Code writing, implementation."
    echo "  reviewer — QA/Design (yellow). Code review, testing."
    echo "  builder  — DevOps/Infra (green). CI/CD, deployment."
    echo ""
    echo "Priority: low, normal, high, critical"
    exit 1
fi

# Validate robot
case "$ROBOT" in
    chief|planner|worker|reviewer|builder) ;;
    *)
        echo "❌ Unknown robot: $ROBOT"
        echo "Valid: chief, planner, worker, reviewer, builder"
        exit 1
        ;;
esac

# Generate task ID
TASK_ID="T$(date +%s | tail -c 5)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Determine initial status based on robot
case "$ROBOT" in
    chief) STATUS="INBOX" ;;
    planner) STATUS="QUEUED" ;;
    worker) STATUS="PLANNING" ;;
    reviewer) STATUS="DOING" ;;
    builder) STATUS="REVIEW" ;;
esac

# Build task JSON
TASK_JSON=$(cat <<EOF
{
    "id": "$TASK_ID",
    "title": "$TASK_TITLE",
    "status": "$STATUS",
    "assignee": "$ROBOT",
    "priority": "$PRIORITY",
    "created": "$TIMESTAMP",
    "source": "telegram"
}
EOF
)

echo "📌 **Task Assigned**"
echo ""
echo "🆔 ID: \`$TASK_ID\`"
echo "📋 Title: $TASK_TITLE"
echo "🤖 Robot: **${ROBOT^^}**"
echo "📊 Status: $STATUS"
echo "⚡ Priority: $PRIORITY"
echo "🕐 Created: $TIMESTAMP"
echo ""
echo "Task will appear on the office board at http://5.45.115.12/office/"
echo ""
echo "Task JSON:"
echo "$TASK_JSON"

# If state file exists, append the task
if [ -f "$STATE_FILE" ]; then
    echo ""
    echo "📝 Appending to state file..."
    # Use python to safely modify the JSON
    python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
if 'tasks' not in state:
    state['tasks'] = []
state['tasks'].append($TASK_JSON)
with open('$STATE_FILE', 'w') as f:
    json.dump(state, f, indent=2)
print('✅ Task added to state.json')
" 2>/dev/null || echo "⚠️ Could not update state.json (file may not be valid JSON)"
else
    echo ""
    echo "ℹ️ State file not found. Task registered locally only."
fi
