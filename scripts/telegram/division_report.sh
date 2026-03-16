#!/usr/bin/env bash
# division_report.sh — Get status report from a division
# Usage: bash division_report.sh <division> [format]
# Format: summary, full, json (default: summary)

set -euo pipefail

AGENCY_DIR="$(dirname "$0")/../../agents/agency"
STATE_FILE="/var/www/office/state.json"
DIVISION="${1:-}"
FORMAT="${2:-summary}"

DIVISIONS="academic design engineering game-development marketing paid-media product project-management sales testing"

show_usage() {
    echo "Usage: division_report.sh <division> [format]"
    echo ""
    echo "Divisions:"
    for d in $DIVISIONS; do
        case $d in
            academic) emoji="🎓" ;;
            design) emoji="🎨" ;;
            engineering) emoji="⚙️" ;;
            game-development) emoji="🎮" ;;
            marketing) emoji="📣" ;;
            paid-media) emoji="💰" ;;
            product) emoji="📦" ;;
            project-management) emoji="📋" ;;
            sales) emoji="💼" ;;
            testing) emoji="🧪" ;;
            *) emoji="📁" ;;
        esac
        count=$(find "$AGENCY_DIR/$d" -name "*.md" -not -name "MAPPING.md" 2>/dev/null | wc -l)
        echo "  $emoji $d ($count agents)"
    done
    echo ""
    echo "Formats: summary, full, json"
    exit 1
}

if [ -z "$DIVISION" ]; then
    show_usage
fi

DIV_DIR="$AGENCY_DIR/$DIVISION"
if [ ! -d "$DIV_DIR" ]; then
    echo "❌ Division '$DIVISION' not found."
    show_usage
fi

case $DIVISION in
    academic) emoji="🎓"; robot="PLANNER" ;;
    design) emoji="🎨"; robot="REVIEWER" ;;
    engineering) emoji="⚙️"; robot="WORKER" ;;
    game-development) emoji="🎮"; robot="WORKER" ;;
    marketing) emoji="📣"; robot="PLANNER" ;;
    paid-media) emoji="💰"; robot="BUILDER" ;;
    product) emoji="📦"; robot="PLANNER" ;;
    project-management) emoji="📋"; robot="PLANNER" ;;
    sales) emoji="💼"; robot="CHIEF" ;;
    testing) emoji="🧪"; robot="REVIEWER" ;;
    *) emoji="📁"; robot="PLANNER" ;;
esac

agent_count=$(find "$DIV_DIR" -name "*.md" -not -name "MAPPING.md" | wc -l)

echo "$emoji **${DIVISION^^} DIVISION REPORT**"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🤖 Assigned Robot: **$robot**"
echo "👥 Total Agents: $agent_count"
echo ""

if [ "$FORMAT" = "json" ]; then
    echo "{"
    echo "  \"division\": \"$DIVISION\","
    echo "  \"robot\": \"$robot\","
    echo "  \"agent_count\": $agent_count,"
    echo "  \"agents\": ["
    first=true
    for f in "$DIV_DIR"/*.md "$DIV_DIR"/**/*.md 2>/dev/null; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .md)
        agent_name=$(head -5 "$f" | grep "^name:" | sed 's/^name: *//')
        [ -z "$agent_name" ] && agent_name="$name"
        
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        echo -n "    {\"id\": \"$name\", \"name\": \"$agent_name\"}"
    done
    echo ""
    echo "  ]"
    echo "}"
elif [ "$FORMAT" = "full" ]; then
    echo "📋 **Agent Details:**"
    echo ""
    for f in "$DIV_DIR"/*.md "$DIV_DIR"/**/*.md 2>/dev/null; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .md)
        agent_name=$(head -5 "$f" | grep "^name:" | sed 's/^name: *//')
        emoji_a=$(head -10 "$f" | grep "^emoji:" | sed 's/^emoji: *//')
        vibe=$(head -10 "$f" | grep "^vibe:" | sed 's/^vibe: *//' | head -c 80)
        desc=$(head -10 "$f" | grep "^description:" | sed 's/^description: *//' | head -c 100)
        
        [ -z "$agent_name" ] && agent_name="$name"
        [ -z "$emoji_a" ] && emoji_a="🤖"
        
        echo "$emoji_a **$agent_name**"
        [ -n "$desc" ] && echo "   $desc"
        [ -n "$vibe" ] && echo "   _Vibe: ${vibe}_"
        echo "   📁 \`$name.md\`"
        echo ""
    done
else
    # Summary format — list agent names only
    echo "📋 **Agents:**"
    echo ""
    for f in "$DIV_DIR"/*.md "$DIV_DIR"/**/*.md 2>/dev/null; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .md)
        agent_name=$(head -5 "$f" | grep "^name:" | sed 's/^name: *//')
        emoji_a=$(head -10 "$f" | grep "^emoji:" | sed 's/^emoji: *//')
        
        [ -z "$agent_name" ] && agent_name="$name"
        [ -z "$emoji_a" ] && emoji_a="🤖"
        
        echo "  $emoji_a $agent_name"
    done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check state file for active tasks if available
if [ -f "$STATE_FILE" ]; then
    active_tasks=$(python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    state = json.load(f)
tasks = state.get('tasks', [])
active = [t for t in tasks if t.get('assignee','').lower() == '$robot'.lower() and t.get('status','').upper() != 'DONE']
print(len(active))
" 2>/dev/null || echo "0")
    echo "⚡ Active Tasks: $active_tasks"
fi

echo "🕐 Report generated: $(date -u +'%Y-%m-%d %H:%M UTC')"
