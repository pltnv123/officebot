#!/usr/bin/env bash
# agents_list.sh — List all agency-agents and their mapped roles
# Usage: bash agents_list.sh [division]
# Example: bash agents_list.sh engineering

AGENCY_DIR="$(dirname "$0")/../../agents/agency"
DIVISION="${1:-}"

if [ -n "$DIVISION" ]; then
    # Show agents for specific division
    DIV_DIR="$AGENCY_DIR/$DIVISION"
    if [ ! -d "$DIV_DIR" ]; then
        echo "❌ Division '$DIVISION' not found."
        echo "Available: design engineering game-development marketing paid-media product project-management sales testing"
        exit 1
    fi
    
    echo "📋 **${DIVISION^^} Division Agents:**"
    echo ""
    
    count=0
    for f in "$DIV_DIR"/*.md "$DIV_DIR"/**/*.md 2>/dev/null; do
        [ -f "$f" ] || continue
        name=$(basename "$f" .md)
        # Extract name from frontmatter
        agent_name=$(head -5 "$f" | grep "^name:" | sed 's/^name: *//')
        emoji=$(head -10 "$f" | grep "^emoji:" | sed 's/^emoji: *//')
        vibe=$(head -10 "$f" | grep "^vibe:" | sed 's/^vibe: *//' | head -c 60)
        
        [ -z "$agent_name" ] && agent_name="$name"
        [ -z "$emoji" ] && emoji="🤖"
        
        echo "$emoji **$agent_name**"
        [ -n "$vibe" ] && echo "   _$vibe_"
        echo ""
        count=$((count + 1))
    done
    
    echo "---"
    echo "Total: $count agents in ${DIVISION^^}"
else
    # Show summary of all divisions
    echo "🏢 **OfficeBot Agency — All Divisions**"
    echo ""
    
    total=0
    for div in design engineering game-development marketing paid-media product project-management sales testing; do
        DIV_DIR="$AGENCY_DIR/$div"
        [ -d "$DIV_DIR" ] || continue
        
        count=$(find "$DIV_DIR" -name "*.md" -not -name "MAPPING.md" | wc -l)
        total=$((total + count))
        
        case $div in
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
        
        echo "$emoji **${div^^}** — $count agents"
    done
    
    echo ""
    echo "---"
    echo "🤖 **Total: $total agents** across 9 divisions"
    echo ""
    echo "Use: \`agents_list.sh <division>\` for details"
    echo "Divisions: design | engineering | game-development | marketing | paid-media | product | project-management | sales | testing"
fi
