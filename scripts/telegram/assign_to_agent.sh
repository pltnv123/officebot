#!/bin/bash
# assign_to_agent.sh — Assign a task to a specific agency agent
# Usage: assign_to_agent.sh <agent-name> <task-description>
# Example: assign_to_agent.sh engineering-frontend-developer "Fix responsive layout on mobile"
# Example: assign_to_agent.sh design-ui-designer "Review new dashboard mockups"

AGENTS_DIR="/home/antonbot/.openclaw/workspace/office/agents/agency"
TASKS_FILE="/home/antonbot/.openclaw/workspace/office/tasks.json"
STATE_FILE="/var/www/office/state.json"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "📋 Usage: assign_to_agent.sh <agent-name> <task-description>"
    echo ""
    echo "Examples:"
    echo "  assign_to_agent.sh engineering-frontend-developer 'Fix responsive layout'"
    echo "  assign_to_agent.sh design-ui-designer 'Review dashboard mockups'"
    echo "  assign_to_agent.sh testing-performance-benchmarker 'Benchmark WebGL load time'"
    echo ""
    echo "To list all agents: agent_status.sh --all"
    echo "To list divisions: division_list.sh"
    exit 0
fi

AGENT_NAME="$1"
shift
TASK_DESC="$*"

# Find the agent file
found_file=""
found_div=""
for div_dir in "$AGENTS_DIR"/*/; do
    div=$(basename "$div_dir")
    match=$(find "$div_dir" -name "${AGENT_NAME}.md" 2>/dev/null | head -1)
    if [ -n "$match" ]; then
        found_file="$match"
        found_div="$div"
        break
    fi
done

if [ -z "$found_file" ]; then
    echo "❌ Agent '$AGENT_NAME' not found"
    echo "Run: agent_status.sh --all"
    exit 1
fi

# Determine the robot role from integration
ROBOT="worker"  # default
if [ -f "$AGENTS_DIR/$found_div/INTEGRATION.md" ]; then
    robot_line=$(grep "$AGENT_NAME" "$AGENTS_DIR/$found_div/INTEGRATION.md" 2>/dev/null | head -1)
    if echo "$robot_line" | grep -q "CHIEF"; then
        ROBOT="chief"
    elif echo "$robot_line" | grep -q "PLANNER"; then
        ROBOT="planner"
    elif echo "$robot_line" | grep -q "REVIEWER"; then
        ROBOT="reviewer"
    elif echo "$robot_line" | grep -q "BUILDER"; then
        ROBOT="builder"
    elif echo "$robot_line" | grep -q "WORKER"; then
        ROBOT="worker"
    fi
fi

# Get agent display name
AGENT_DISPLAY=$(grep "^name:" "$found_file" 2>/dev/null | head -1 | sed 's/^name: *//')
AGENT_EMOJI=$(grep "^emoji:" "$found_file" 2>/dev/null | head -1 | sed 's/^emoji: *//')
[ -z "$AGENT_DISPLAY" ] && AGENT_DISPLAY="$AGENT_NAME"
[ -z "$AGENT_EMOJI" ] && AGENT_EMOJI="🤖"

# Generate task ID
TASK_ID="AGT-$(date +%s | tail -c 5)"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "📝 ASSIGNING TASK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$AGENT_EMOJI Agent: $AGENT_DISPLAY ($AGENT_NAME)"
echo "📁 Division: $found_div"
echo "🤖 Robot: $ROBOT"
echo "📋 Task: $TASK_DESC"
echo "🆔 ID: $TASK_ID"
echo "🕐 Time: $TIMESTAMP"
echo ""

# Create task entry
TASK_JSON=$(cat <<EOF
{
    "id": "$TASK_ID",
    "title": "$TASK_DESC",
    "assignee": "$ROBOT",
    "agent": "$AGENT_NAME",
    "division": "$found_div",
    "status": "inbox",
    "priority": "normal",
    "created": "$TIMESTAMP",
    "source": "telegram-assign"
}
EOF
)

echo "Task JSON:"
echo "$TASK_JSON" | python3 -m json.tool 2>/dev/null || echo "$TASK_JSON"
echo ""

# Write to tasks file if it exists
if [ -f "$TASKS_FILE" ]; then
    # Add to existing tasks array
    python3 -c "
import json
with open('$TASKS_FILE', 'r') as f:
    data = json.load(f)
if isinstance(data, dict) and 'tasks' in data:
    data['tasks'].append(json.loads('''$TASK_JSON'''))
elif isinstance(data, list):
    data.append(json.loads('''$TASK_JSON'''))
with open('$TASKS_FILE', 'w') as f:
    json.dump(data, f, indent=2)
print('✅ Task added to $TASKS_FILE')
" 2>/dev/null || echo "⚠️  Could not update tasks.json (manual update needed)"
else
    echo "{\"tasks\": [$TASK_JSON]}" > "$TASKS_FILE"
    echo "✅ Created $TASKS_FILE with task"
fi

echo ""
echo "🎯 Next: Task will be picked up by $ROBOT robot on next state poll"
echo "📊 View: http://5.45.115.12/office/"
