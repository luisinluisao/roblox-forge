---
name: visual-direction
description: Art direction and technical-art standards for making Roblox worlds look professional, never blocky, flat or default - palette, shape language, lighting and atmosphere recipes, materials, terrain, set dressing, composition, scale, and a screenshot critique method. Use whenever building or judging any environment, map, scene, lighting, props or visuals in Roblox Studio, or when the user says it looks ugly, boring, blocky, flat or amateur.
---

# Visual direction

Why Roblox games look amateur: default grey Plastic, uniform colours, perfect boxes, empty space, flat default lighting, no depth, no focal point. This skill is the antidote.

## 1. Define the look first (put it in the GDD)
- **Palette**: 5–7 hex colours, 60% dominant (environment base) / 30% secondary (structures) / 10% accent (interactables, rewards, danger). Saturation reserved for what matters.
- **Shape language**: pick one and stick to it: chunky-rounded (friendly), angular (aggressive/sci-fi), organic (nature), or a deliberate mix (e.g. rounded hero props, angular enemies).
- **Lighting recipe** (time of day, mood, light colours), **material set** (max 5–6), **detail density**, **VFX style**.

## 2. Value & composition (check before any detail)
- **Squint/greyscale test**: the path of play and key objects must read by value contrast alone.
- One **focal point** per view; leading lines (paths, rails, lights) pull to it; 3 depth layers (foreground frame, midground play space, background landmark); negative space is intentional, not leftover.
- **Light the path**: brightest, warmest light where the player should go; interactives get accent colour or rim emission.
- Silhouettes must be distinct at a distance: vary height, break skylines, add landmarks players can navigate by.

## 3. Anti-blocky toolkit
- Never ship raw default boxes: use generated/procedural models (see `asset-pipeline`), `Shape` cylinders/spheres/wedges, bevel and chamfer edges, taper walls, add trim (base, cornice, corner posts, window frames), overhangs, pipes, signs, cables, awnings.
- Break perfection: rotate props 1–6°, vary sizes ±10%, offset repeats, hand-place asymmetry, jitter colour value ±3–6% per instance so surfaces stop looking like uniform plastic.
- **3-tier detail**: big shapes (silhouette) → medium (doors, windows, crates) → small (screws, cracks, grass tufts, decals). Every screen-space area needs all three.
- **Materials**: layer Material + `MaterialVariant`/`generate_material` + `SurfaceAppearance` on MeshParts (Colour/Normal/Roughness/Metalness). Use `MaterialService.Use2022Materials = true` for better built-in materials. Vary roughness: nothing in the world is uniformly matte or glossy. Mix 2–3 materials per structure (stone base, wood body, metal trim).
- Wear and story: dirt, moss, scuffs, stains (decals/textures), props that imply use (tools on a bench, cups on a table).
- **Terrain** for natural spaces (hills, rivers, cliffs via `Terrain` + noise or FillBlock/WriteVoxels, grass decoration, water settings) instead of a flat baseplate; add elevation change everywhere.
- Vegetation and rocks in clusters of 3–5 at varied scale/rotation, not evenly spaced.

## 4. Lighting & atmosphere (set in the Edit datamodel via `execute_luau`)
Baseline stylised-daylight recipe (then tune to the mood):
```lua
local Lighting = game:GetService("Lighting")
Lighting.Technology = Enum.Technology.Future
Lighting.GlobalShadows = true
Lighting.ClockTime = 16.5            -- low sun = long shadows, warm light
Lighting.Brightness = 3
Lighting.ShadowSoftness = 0.2
Lighting.EnvironmentDiffuseScale = 1
Lighting.EnvironmentSpecularScale = 1
Lighting.Ambient = Color3.fromRGB(70, 70, 82)
Lighting.OutdoorAmbient = Color3.fromRGB(95, 100, 118)
local function ensure(class, name)
	local o = Lighting:FindFirstChild(name)
	if not o then o = Instance.new(class); o.Name = name; o.Parent = Lighting end
	return o
end
local atm = ensure("Atmosphere", "Atmosphere")
atm.Density, atm.Offset, atm.Glare, atm.Haze = 0.3, 0.25, 0.2, 1.5
atm.Color, atm.Decay = Color3.fromRGB(199, 170, 155), Color3.fromRGB(106, 112, 125)
local cc = ensure("ColorCorrectionEffect", "ColorGrade")
cc.Contrast, cc.Saturation, cc.TintColor = 0.1, 0.15, Color3.fromRGB(255, 244, 232)
local bloom = ensure("BloomEffect", "Bloom")
bloom.Intensity, bloom.Size, bloom.Threshold = 0.35, 24, 1.6
local rays = ensure("SunRaysEffect", "SunRays")
rays.Intensity, rays.Spread = 0.08, 0.8
```
Mood shifts: **horror** low brightness, ClockTime ~0–2 or heavy fog (Atmosphere Density 0.5+), desaturated, cold tint, tight pools of warm light; **sci-fi/neon** dark base, Neon material accents, higher Bloom, cyan/magenta tint; **cosy** warm tint, soft shadows, many small warm PointLights; **bright cartoon** high saturation, low contrast haze, strong sun.
- Place real light sources by hand (PointLight/SpotLight/SurfaceLight, 2–3 colours max, Shadows only where it matters). Emissive Neon/glow parts need Bloom to sing.
- Replace the default Sky (Skybox or a gradient), add `DepthOfFieldEffect` only for menus/cutscenes, keep exposure consistent between spaces.
- Interiors: darker ambient + local lights, never the outdoor ambient leaking in.

## 5. Scale & gameplay readability
Character ≈ 5 studs. Doors ≥ 7 high / 4–5 wide, corridors ≥ 8 wide for comfort, jumps within the humanoid's ability with margin, steps ≈ 0.7–1 stud. Interactive objects are obvious (colour, glow, animation, billboard prompt). Danger is readable.

## 6. Critique method (use it on every screenshot)
Hero shot, eye-level, overview, close-up, worst corner. Ask: Where does the eye land first? Is anything still default grey/Plastic or a bare box? Are there empty areas >15 studs wide with nothing of interest? Any floating parts, gaps, z-fighting, stretched textures, light leaks? Do colours stay inside the palette? Fix the largest problem first; re-capture; repeat.

## 7. Budget
Beauty must run on a phone: no stacks of transparent parts, `CastShadow=false` on small details, reuse meshes/textures, merge static detail where sensible, `RenderFidelity` and `CollisionFidelity` tuned, StreamingEnabled decisions made deliberately.
