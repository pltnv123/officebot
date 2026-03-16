#!/bin/bash
# agent_status.sh — Show status of any agency agent
# Usage: agent_status.sh <agent-name> or agent_status.sh --all
# Example: agent_status.sh engineering-frontend-developer

AGENTS_DIR="/home/antonbot/.openclaw/workspace/office/agents/agency"

if [ -z "$1" ]; then
    echo "📋 Usage: agent_status.sh <agent-name>"
    echo "   or: agent_status.sh --all"
    echo "   or: agent_status.sh --division <division>"
    echo ""
    echo "Divisions: academic, design, engineering, game-development,"
    echo "           marketing, paid-media, product, project-management,"
    echo "           sales, testing"
    exit 0
fi

if [ "$1" = "--all" ]; then
    echo "📊 ALL AGENCY AGENTS STATUS (117 agents)"
    echo "========================================="
    for div_dir in "$AGENTS_DIR"/*/; do
        div=$(basename "$div_dir")
        [ "$div" = "MAPPING.md" ] && continue
        [ -f "$div_dir/INTEGRATION.md" ] || continue
        count=$(find "$div_dir" -name "*.md" ! -name "INTEGRATION.md" ! -name "MAPPING.md" | wc -l)
        echo ""
        echo "🏢 $div ($count agents)"
        echo "---"
        find "$div_dir" -name "*.md" ! -name "INTEGRATION.md" ! -name "MAPPING.md" -exec basename {} .md \; | sort | while read agent; do
            # Extract role from first line or filename
            role=$(echo "$agent" | sed "s/^$div-//" | tr '-' ' ')
            echo "  🤖 $agent → $role"
        done
    done
    exit 0
fi

if [ "$1" = "--division" ]; then
    div="$2"
    if [ -z "$div" ]; then
        echo "❌ Please specify division name"
        exit 1
    fi
    div_dir="$AGENTS_DIR/$div"
    if [ ! -d "$div_dir" ]; then
        echo "❌ Division '$div' not found"
        exit 1
    fi
    echo "📊 Division: $div"
    echo "=================="
    if [ -f "$div_dir/INTEGRATION.md" ]; then
        head -10 "$div_dir/INTEGRATION.md"
    fi
    echo ""
    echo "Agents:"
    find "$div_dir" -name "*.md" ! -name "INTEGRATION.md" ! -name "MAPPING.md" | sort | while read f; do
        agent=$(basename "$f" .md)
        # Get first few lines of the agent file
        name=$(grep "^name:" "$f" 2>/dev/null | head -1 | sed 's/^name: *//')
        emoji=$(grep "^emoji:" "$f" 2>/dev/null | head -1 | sed 's/^emoji: *//')
        echo "  $emoji $agent — $name"
    done
    exit 0
fi

# Single agent lookup
agent_name="$1"
found_file=""
for div_dir in "$AGENTS_DIR"/*/; do
    match=$(find "$div_dir" -name "${agent_name}.md" 2>/dev/null | head -1)
    if [ -n "$match" ]; then
        found_file="$match"
        break
    fi
done

if [ -z "$found_file" ]; then
    echo "❌ Agent '$agent_name' not found"
    echo "Try: agent_status.sh --all"
    exit 1
fi

div=$(basename "$(dirname "$found_file")")
echo "🤖 Agent: $agent_name"
echo "📁 Division: $div"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Extract key fields
name=$(grep "^name:" "$found_file" 2>/dev/null | head -1 | sed 's/^name: *//')
desc=$(grep "^description:" "$found_file" 2>/dev/null | head -1 | sed 's/^description: *//')
color=$(grep "^color:" "$found_file" 2>/dev/null | head -1 | sed 's/^color: *//')
emoji=$(grep "^emoji:" "$found_file" 2>/dev/null | head -1 | sed 's/^emoji: *//')
vibe=$(grep "^vibe:" "$found_file" 2>/dev/null | head -1 | sed 's/^vibe: *//')

echo "Name: $name"
echo "Emoji: $emoji"
echo "Color: $color"
echo "Vibe: $vibe"
echo "Description: $desc"
echo ""

# Show integration info if available
integration="$AGENTS_DIR/$div/INTEGRATION.md"
if [ -f "$integration" ]; then
    robot=$(grep "$agent_name" "$integration" 2>/dev/null | head -1 | awk -F'|' '{print $4}' | xargs)
    triggers=$(grep "$agent_name" "$integration" 2>/dev/null | head -1 | awk -F'|' '{print $6}' | xargs)
    echo "OfficeBot Role: $robot"
    echo "Triggers: $triggers"
fi
