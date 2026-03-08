# SCENE REBUILD TASK

## Goal
Full scene rebuild. Delete old scene code. Build functional Pixar/WALL-E hub.

## Style
Warm cozy workshop. Orange/amber lighting. NOT sci-fi neon. Pixar/WALL-E.

## Room dimensions
Width: 20 units (X: -10 to +10)
Depth: 14 units (Z: -4 to +10)
Wall height: 5 units

## Zone 1: TASK BOARD (back wall)
Position: X=0, Y=2.5, Z=9, Size: 14x3
6 columns: INBOX/QUEUE/PLAN/WORK/REVIEW/DONE
Colors: gray/yellow/blue/orange/purple/green
3 card slots per column

## Zone 2: ROOM 2 DOOR (top-right)
Position: X=8, Y=0, Z=8
Archway: 2 wide, 3 tall
Label "ROOM 2", glowing frame Color(1.0f, 0.6f, 0.1f)

## Zone 3: DISPATCH ZONE (left)
Position: X=-7, Z=3
Small desk Color(0.6f, 0.4f, 0.2f)
Label "DISPATCH", glowing incoming indicator

## Zone 4: CENTRAL DESK (center)
Position: X=0, Z=1, Size: 3x0.8x2
Color(0.55f, 0.35f, 0.15f)
Desk lamp (warm yellow), papers on desk

## Zone 5: MONITORING ZONE (right)
Position: X=7, Z=3
3 monitors with green screen emission
Label "MONITORING"

## Floor
Color(0.35f, 0.30f, 0.25f)
Navigation corridors slightly lighter:
- Center: X=-1 to X=1
- Left: X=-6 to X=-4
- Right: X=4 to X=6

## Walls
Color(0.25f, 0.22f, 0.18f)
Shelves on left wall with small boxes

## Lighting
Ambient: Color(1.0f, 0.85f, 0.7f)
Directional: angle(35,-30,0) intensity 1.2
Dispatch point light: X=-7,Z=3 Color(1.0f,0.6f,0.1f) range=5
Monitoring point light: X=7,Z=3 Color(0.3f,1.0f,0.5f) range=4
Desk lamp: X=0,Z=1,Y=1.5 Color(1.0f,0.9f,0.6f) range=3

## Hero Agents (4 robots)
Chief: X=0, Z=-0.5, rotY=0
Planner: X=-1.8, Z=0.5, rotY=20
Worker: X=-6.5, Z=2.5, rotY=45
Tester: X=6.5, Z=2.5, rotY=-45
Style: head scale(0.65,0.60,0.58), body Color(0.85,0.85,0.88)
Labels: CHIEF/PLANNER/WORKER/TESTER billboard toward camera

## Camera
Position: (0, 8, -7)
Rotation: (42, 0, 0)
FOV: 50

## Rules
- NEVER Shader.Find("Standard") — use Universal Render Pipeline/Lit
- Delete ALL old BuildRobot/BuildDesk/BuildBoard code
- New methods: BuildRoom(), BuildBoard(), BuildZones(), BuildAgents()
- Keep PollTaskState coroutine for right panel
