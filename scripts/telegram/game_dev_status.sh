#!/usr/bin/env bash
# game_dev_status.sh — Show status of Game Development agents
# Usage:
#   bash game_dev_status.sh --unity    # only Unity agents (4)
#   bash game_dev_status.sh --all      # all 20 game dev agents
#   bash game_dev_status.sh <name>     # specific agent

AGENTS_DIR="/home/antonbot/.openclaw/workspace/office/agents/agency/game-development"

UNITY_AGENTS=(
    "unity/unity-architect"
    "unity/unity-editor-tool-developer"
    "unity/unity-multiplayer-engineer"
    "unity/unity-shader-graph-artist"
)

ALL_AGENTS=(
    "game-audio-engineer"
    "game-designer"
    "level-designer"
    "narrative-designer"
    "technical-artist"
    "blender/blender-addon-engineer"
    "godot/godot-gameplay-scripter"
    "godot/godot-multiplayer-engineer"
    "godot/godot-shader-developer"
    "roblox-studio/roblox-avatar-creator"
    "roblox-studio/roblox-experience-designer"
    "roblox-studio/roblox-systems-scripter"
    "unity/unity-architect"
    "unity/unity-editor-tool-developer"
    "unity/unity-multiplayer-engineer"
    "unity/unity-shader-graph-artist"
    "unreal-engine/unreal-multiplayer-architect"
    "unreal-engine/unreal-systems-engineer"
    "unreal-engine/unreal-technical-artist"
    "unreal-engine/unreal-world-builder"
)

show_agent() {
    local agent_path="$1"
    local agent_file="$AGENTS_DIR/${agent_path}.md"

    if [ ! -f "$agent_file" ]; then
        echo "  ❌ $agent_path — file not found"
        return
    fi

    local name emoji color vibe
    name=$(grep "^name:" "$agent_file" 2>/dev/null | head -1 | sed 's/^name: *//')
    emoji=$(grep "^emoji:" "$agent_file" 2>/dev/null | head -1 | sed 's/^emoji: *//')
    color=$(grep "^color:" "$agent_file" 2>/dev/null | head -1 | sed 's/^color: *//')
    vibe=$(grep "^vibe:" "$agent_file" 2>/dev/null | head -1 | sed 's/^vibe: *//' | head -c 80)

    [ -z "$name" ] && name=$(basename "$agent_path")
    [ -z "$emoji" ] && emoji="🤖"
    [ -z "$color" ] && color="default"

    local agent_basename
    agent_basename=$(basename "$agent_path")

    echo "  $emoji **$name** (\`$agent_basename\`)"
    echo "     Color: $color | Zone: GAME DEV | Robot: WORKER"
    [ -n "$vibe" ] && echo "     _$vibe_"
    echo ""
}

show_section() {
    local section_name="$1"
    shift
    local agents=("$@")

    echo "🎮 **Game Development — $section_name**"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    local count=0
    for agent in "${agents[@]}"; do
        show_agent "$agent"
        count=$((count + 1))
    done

    echo "---"
    echo "📊 Total: $count agents in GAME DEV zone"
    echo "🟣 Zone: GAME DEV (purple) | Robot: WORKER | Escalation: → REVIEWER → CHIEF"
}

if [ -z "$1" ]; then
    echo "📋 Game Development Division Status"
    echo ""
    echo "Usage:"
    echo "  bash game_dev_status.sh --unity    # Unity agents only (4)"
    echo "  bash game_dev_status.sh --all      # All game dev agents (20)"
    echo "  bash game_dev_status.sh <name>     # Specific agent"
    echo ""
    echo "Examples:"
    echo "  bash game_dev_status.sh --unity"
    echo "  bash game_dev_status.sh unity-architect"
    echo "  bash game_dev_status.sh game-designer"
    echo ""
    echo "Engine sub-groups:"
    echo "  🔷 Unity (4) | 🔶 Godot (3) | 🔴 Roblox (3) | ⬛ Unreal (4) | 🟤 Blender (1) | 🎮 Core (5)"
    exit 0
fi

case "$1" in
    --unity)
        show_section "Unity Agents" "${UNITY_AGENTS[@]}"
        ;;
    --all)
        show_section "All Agents (20)" "${ALL_AGENTS[@]}"
        ;;
    *)
        # Single agent lookup — search all subdirs
        agent_name="$1"
        found_file=$(find "$AGENTS_DIR" -name "${agent_name}.md" 2>/dev/null | head -1)

        if [ -z "$found_file" ]; then
            echo "❌ Agent '$agent_name' not found in Game Development"
            echo ""
            echo "Available agents:"
            find "$AGENTS_DIR" -name "*.md" ! -name "INTEGRATION.md" -exec basename {} .md \; | sort
            exit 1
        fi

        # Derive agent_path relative to AGENTS_DIR
        rel_path="${found_file#$AGENTS_DIR/}"
        rel_path="${rel_path%.md}"

        echo "🎮 Game Development Agent"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━"
        show_agent "$rel_path"

        # Show full description
        desc=$(grep "^description:" "$found_file" 2>/dev/null | head -1 | sed 's/^description: *//')
        if [ -n "$desc" ]; then
            echo "📝 Description: $desc"
        fi
        ;;
esac
