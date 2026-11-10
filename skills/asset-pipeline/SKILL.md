---
name: asset-pipeline
description: How to source, generate, vet and integrate 3D models, meshes, materials, textures, audio and animations for a Roblox game so assets look consistent and professional and are safe. Use whenever adding any prop, model, mesh, material, sound or animation, when using generate_procedural_model, generate_mesh, generate_material, search_asset or insert_asset, or when a game looks like default blocks.
---

# Asset pipeline

## Source priority (stop at the first that gives a result that passes the screenshot test)
1. **`generate_procedural_model`**: structured props built from primitives (furniture, lamps, crates, buildings, bridges, vehicles' bodies). Clean, editable, cheap. Give it a precise part-level description, proportions in studs, and a reference image if you have one (`store_image`/`upload_image`). Use `wait_job_finished` to collect the result.
2. **`generate_mesh`**: organic or hero assets (rocks, trees, creatures, statues, stylized props). Check afterwards: scale, orientation, pivot, triangle count, texture look, collision fidelity.
3. **`generate_material`**: tileable surface variants (worn brick, stylised grass, painted metal) to put on parts/terrain through MaterialVariants.
4. **`search_asset` + `insert_asset`** (Creator Store): for sounds, animations, decals and when it truly beats generating. **Always vet** (below).
5. **Plain Parts**: only for blockout, deliberately stylised minimal geometry, or invisible helpers. Never as a finished surface in default grey Plastic.

Generation tools can have limits/costs and variable quality: reuse results, make a few good variants, and don't regenerate blindly. Always inspect the output in context.

## Style consistency
Write a **style token** in the GDD, e.g. "chunky stylised, soft bevels, saturated warm palette (#hex...), hand-painted textures, no photorealism". Prefix every generation prompt with it. Mixed styles are the #1 amateur tell. Recolour or re-material imported assets to the palette.

## Prompt recipe for generation
`<object>, <function/context>, <shape language: chunky/rounded/angular>, <material list>, <palette hexes>, <proportions in studs>, <key details: 3 items>, <wear level>`.
Be specific, one object per prompt, describe the silhouette. State the intended size in studs (character ≈ 5 studs tall; doors ≥ 7 high; steps ≈ 0.7–1).

## Acceptance test (each new asset)
- Placed in the real scene under final lighting; screenshot at gameplay distance and close.
- Correct scale vs. the character; sits on the ground (no floating/sinking); pivot sensible (`PrimaryPart`).
- Reads clearly from the gameplay camera; matches style token; no texture seams/artifacts/stretching.
- Performance: sensible triangle count for its screen importance, texture resolution not wasteful, `RenderFidelity`/`CollisionFidelity` set (Box/Hull for most props; PreciseConvexDecomposition only when needed), decor `CanCollide=false`, `CastShadow=false` for tiny details.
- Named, in the right folder, anchored if static, no leftover helper parts.
Reject and regenerate/replace if it fails; do not "ship and hope".

## Vetting Creator Store content (mandatory)
1. Insert into `ServerStorage/_Quarantine`, never straight into Workspace.
2. List every script/ModuleScript inside (`execute_luau`). Delete all of them unless the asset truly needs one; if kept, read every line. Red flags: `require(<number>)`, `loadstring`, `getfenv`, `HttpService`, long escaped strings, scripts named oddly or nested deep, `Fire`/`Backdoor`-like remotes.
3. Check for hidden extras: invisible parts, huge decals, particle spam, sounds that autoplay, `Fire/Smoke` objects.
4. Check origin when the tool exposes it (prefer Roblox-official and long-standing verified creators), and sanity-check licence/appropriateness (age rating, no real-world brands/IP).
5. Fix anchoring, collision, scale, colours, then move into the proper folder and delete the quarantine copy.

## Audio
- Test every sound ID in a playtest: public audio is restricted (many assets only play for their owner or in certain places), so broken IDs are common. A sound that doesn't load is a bug.
- Mix with `SoundGroup`s (Music, SFX, UI, Ambient), set `RollOffMinDistance/MaxDistance` for 3D sounds, randomise pitch ±5–10% and keep 3+ variants for repeated SFX, loop music with clean loop points, duck music under big moments.

## Animation
Use consistent animation priorities (Core < Idle < Movement < Action), keep tracks loaded/cached, fire gameplay events from `AnimationEvent` markers (e.g. "Hit") instead of timers, and verify rigs (R15 vs custom) match the animation.
