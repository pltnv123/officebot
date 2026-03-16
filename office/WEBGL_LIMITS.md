# WebGL Limits for Unity

## Memory
- Hard limit: **2GB** total
- Target: **<500MB** for mobile compatibility

## Triangles/Polygons
- Scene total: **~1-2 million** triangles max
- Per robot character: **5,000-15,000** triangles (game-ready)
- Low-poly cute: **2,000-5,000** triangles

## Textures
- Max size: **2048x2048** (mobile), **4096x4096** (desktop)
- Target: **1024x1024** per character
- Use compression: ASTC/ETC2

## Draw Calls
- Target: **<100** draw calls for scene
- Use GPU instancing for repeated objects (robots)

## Shadows
- Soft shadows: expensive
- Use blob shadows or baked lightmaps

## Sources for 3D Models
1. **Sketchfab** (free, some CC0) - https://sketchfab.com/search?type=models&q=robot+cute
2. **CGTrader** (free section) - https://www.cgtrader.com/3d-models/robot
3. **Free3D** - https://free3d.com/3d-models/robot
4. **Poly Haven** (CC0) - https://polyhaven.com/models
5. **Kenney** (CC0, game assets) - https://www.kenney.nl/assets

## Recommended Style
- Pixar-like: rounded edges, soft materials
- Wall-E style: detailed mechanical parts, expressive eyes
- Robots movie: varied designs, colorful
- Use: Toon shader, rim lighting, soft shadows
