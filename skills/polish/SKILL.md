---
name: polish
description: Run a studio-grade polish pass on an existing Roblox game in Studio: art, lighting, UI, audio, VFX, animation, onboarding, game feel, then critique with screenshots and iterate. Use when the user says polish, make it prettier, improve visuals, make it feel professional, fix ugly/blocky/flat, or wants a game to look and feel better.
argument-hint: [area to focus on, optional]
disable-model-invocation: true
---

# /roblox-forge:polish $ARGUMENTS

You are the game-director. Goal: raise an existing game from "works" to "feels professional".

1. **Baseline.** `list_roblox_studios`, `get_studio_state`. Run `audit-scene.luau` (see `playtest-protocol`), capture the standard shot list with `screen_capture`, and have `visual-critic` score it (round 0). Save scores in `.roblox-forge/POLISH_LOG.md`. If no run exists: `FORGE init "<name>"` with `FORGE` = `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-state.mjs"`; if there is no `GDD.md`, write a short art + UI direction into it first (palette, shape language, lighting recipe, UI style tokens) so polishing is coherent instead of random.
2. **Fix by impact.** Take the critic's FIX LIST top-down. Typical order: lighting/atmosphere/colour grade → materials & lack of detail → silhouettes and blocky geometry → set dressing density → UI hierarchy/spacing/motion → audio → VFX → camera → onboarding.
3. **Delegate** to `level-artist`, `ui-designer`, `luau-engineer` (for juice systems from `game-feel`). One area at a time; keep the game playable.
4. **Re-capture and re-score** after each batch. Log scores per round. Stop when avg ≥ 9, no criterion < 8; if scores plateau for 3 rounds, change technique (new asset source, different lighting recipe, re-compose the scene) instead of nudging values.
5. **Regression.** `qa-playtester` smoke test after every batch: polish must not introduce console errors or break gameplay.
6. Mark `visual_quality`, `ui_quality`, `game_feel` only through the critic. Finish with a before/after summary (scores and what changed).
