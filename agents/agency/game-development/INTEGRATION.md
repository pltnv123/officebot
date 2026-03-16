# Game Development Division — OfficeBot Integration

## Division Overview
- **Source**: `agents/agency/game-development/**/*.md`
- **Total Agents**: 20 (across Blender, Godot, Roblox, Unity, Unreal subdirectories)
- **Primary Robot**: WORKER
- **Zone**: Engineering Zone (blue) — shared with Engineering
- **Telegram Topic**: `game-dev`
- **Escalation**: WORKER → REVIEWER → CHIEF

## Agent Mapping

### Core Game Dev (top-level)

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 1 | `game-audio-engineer` | WORKER/audio | WORKER | Game audio, sound design, middleware | `audio`, `sound`, `fmod`, `wwise` |
| 2 | `game-designer` | WORKER/gamedesign | WORKER | Game mechanics, systems design | `gamedesign`, `mechanics`, `balance` |
| 3 | `level-designer` | WORKER/level | WORKER | Level design, world building | `level`, `map`, `world` |
| 4 | `narrative-designer` | WORKER/narrative | WORKER | Game narrative, dialog systems | `gamenarrative`, `dialog`, `quest` |
| 5 | `technical-artist` | WORKER/techart | WORKER | Shaders, VFX, rendering pipelines | `techart`, `shader`, `vfx` |

### Blender Subdirectory

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 6 | `blender-addon-engineer` | WORKER/blender | WORKER | Blender addons, 3D tools | `blender`, `3d`, `addon` |

### Godot Subdirectory

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 7 | `godot-gameplay-scripter` | WORKER/godot | WORKER | Godot GDScript, gameplay | `godot`, `gdscript` |
| 8 | `godot-multiplayer-engineer` | WORKER/godot-mp | WORKER | Godot networking, multiplayer | `godot-multiplayer`, `netcode` |
| 9 | `godot-shader-developer` | WORKER/godot-shader | WORKER | Godot shaders, visual effects | `godot-shader`, `gds-shader` |

### Roblox Studio Subdirectory

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 10 | `roblox-avatar-creator` | WORKER/roblox-avatar | WORKER | Roblox avatar systems | `roblox-avatar`, `character` |
| 11 | `roblox-experience-designer` | WORKER/roblox-exp | WORKER | Roblox experience design | `roblox-experience`, `obby` |
| 12 | `roblox-systems-scripter` | WORKER/roblox-sys | WORKER | Roblox Luau scripting | `roblox`, `luau`, `script` |

### Unity Subdirectory

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 13 | `unity-architect` | WORKER/unity-arch | WORKER | Unity architecture, project structure | `unity-arch`, `project-structure` |
| 14 | `unity-editor-tool-developer` | WORKER/unity-tool | WORKER | Unity editor extensions, tools | `unity-tool`, `editor-script` |
| 15 | `unity-multiplayer-engineer` | WORKER/unity-mp | WORKER | Unity Netcode, multiplayer | `unity-netcode`, `multiplayer` |
| 16 | `unity-shader-graph-artist` | WORKER/unity-shader | WORKER | Unity Shader Graph, visual effects | `unity-shader`, `shader-graph` |

### Unreal Engine Subdirectory

| # | Agency Agent | OfficeBot Role | Robot | Specialization | Triggers |
|---|-------------|---------------|-------|----------------|----------|
| 17 | `unreal-multiplayer-architect` | WORKER/ue-mp | WORKER | Unreal networking, multiplayer | `unreal-netcode`, `ue-multiplayer` |
| 18 | `unreal-systems-engineer` | WORKER/ue-sys | WORKER | Unreal C++, gameplay systems | `unreal`, `ue-cpp`, `blueprint` |
| 19 | `unreal-technical-artist` | WORKER/ue-techart | WORKER | Unreal materials, Niagara VFX | `ue-material`, `niagara`, `vfx` |
| 20 | `unreal-world-builder` | WORKER/ue-world | WORKER | Unreal world building, landscapes | `ue-world`, `landscape`, `level` |

## Integration Notes
- All game dev agents map to WORKER — they build game content
- Uses shared Engineering Zone (blue) with ENGINEERING label
- Unity agents are most relevant for OfficeBot (Unity WebGL project)
- Technical Artist and Shader agents help with scene visuals

## Telegram Commands
- `/gamedev_status` — show game dev agents status
- `/gamedev_unity [task]` — assign to Unity specialist
- `/gamedev_shader [task]` — shader/vfx task
- `/gamedev_level [task]` — level design task

## Workflows
1. **Unity Feature** → CHIEF → WORKER (unity-arch) → implement → REVIEWER → BUILDER → deploy
2. **Shader Work** → WORKER (unity-shader-graph) → create → REVIEWER (visual) → integrate
3. **Game Design** → PLANNER → WORKER (game-designer) → spec → WORKER implement
