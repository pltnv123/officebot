#!/bin/bash
# division_list.sh — List all divisions and their agents
# Usage: division_list.sh [--verbose]

AGENTS_DIR="/home/antonbot/.openclaw/workspace/office/agents/agency"
VERBOSE="${1:-}"

echo "🏢 OFFICEBOT AGENCY DIVISIONS"
echo "=============================="
echo ""

total=0
for div_dir in "$AGENTS_DIR"/*/; do
    div=$(basename "$div_dir")
    [ -f "$div_dir" ] && continue  # skip files like MAPPING.md

    count=$(find "$div_dir" -name "*.md" ! -name "INTEGRATION.md" ! -name "MAPPING.md" 2>/dev/null | wc -l)
    [ "$count" -eq 0 ] && continue
    total=$((total + count))

    # Read integration info
    primary_robot="N/A"
    zone="N/A"
    if [ -f "$div_dir/INTEGRATION.md" ]; then
        primary_robot=$(grep "Primary Robot" "$div_dir/INTEGRATION.md" 2>/dev/null | head -1 | sed 's/.*: //')
        zone=$(grep "Zone:" "$div_dir/INTEGRATION.md" 2>/dev/null | head -1 | sed 's/.*: //')
    fi

    echo "📁 $div ($count agents)"
    echo "   Robot: $primary_robot | Zone: $zone"

    if [ "$VERBOSE" = "--verbose" ]; then
        find "$div_dir" -name "*.md" ! -name "INTEGRATION.md" ! -name "MAPPING.md" -exec basename {} .md \; 2>/dev/null | sort | while read agent; do
            emoji="🤖"
            name="$agent"
            f="$div_dir/$(basename "$div_dir")-${agent#*-}.md"
            # Try to find the actual file
            actual=$(find "$div_dir" -name "${agent}.md" 2>/dev/null | head -1)
            if [ -n "$actual" ]; then
                e=$(grep "^emoji:" "$actual" 2>/dev/null | head -1 | sed 's/^emoji: *//')
                n=$(grep "^name:" "$actual" 2>/dev/null | head -1 | sed 's/^name: *//')
                [ -n "$e" ] && emoji="$e"
                [ -n "$n" ] && name="$n"
            fi
            echo "   $emoji $agent — $name"
        done
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Total: $total agents across $(ls -d "$AGENTS_DIR"/*/ 2>/dev/null | wc -l) divisions"
echo ""
echo "OfficeBot Robots:"
echo "  ⚪ CHIEF    — Orchestrator (white/gold)"
echo "  🟠 PLANNER  — Product + PM + Marketing (white/orange)"
echo "  🔵 WORKER   — Engineering + Game Dev (white/blue)"
echo "  🟡 REVIEWER — Design + Testing (white/yellow)"
echo "  🟢 BUILDER  — DevOps + CI/CD (white/green)"
