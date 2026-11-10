---
name: game-feel
description: Game feel, juice, onboarding and retention polish for Roblox games - feedback on every action, hit-stop, camera shake, VFX, layered audio, reward moments, tweened UI, first-time user experience, accessibility. Use when making a game feel responsive, satisfying, alive or professional, when polishing gameplay, or when designing the first minute of play.
---

# Game feel & juice

**Rule: every meaningful action produces at least two feedback channels (visual + audio, ideally + motion) within 100 ms.** Silent, motionless interactions feel broken.

## Checklist (visual-critic uses this for the `game_feel` gate)
**Input & movement**
- Instant response to input; acceleration/deceleration tuned; coyote time and jump buffering for platforming; no input eaten during animations that should be cancellable.
- Camera: smooth follow, collision-aware, FOV kick on sprint/impact (±6–10°), no nausea (limit bob).

**Actions & combat**
- Anticipation → action → recovery on animations; fire gameplay events from animation markers.
- Hit feedback: flash (`Highlight` 0.1 s), small knockback, damage numbers (pooled BillboardGuis), hit-stop 40–80 ms (client-side only), camera shake with exponential decay (amplitude small, 0.15–0.3 s), impact particles + sound variant.
- Misses and blocked actions also give feedback (a "whiff"/"denied" cue).

**Audio**
- 3+ variants per repeated SFX, pitch ±5–10%, volume ±10%; layered sounds for big moments; footsteps per material; UI sounds for hover/press/open/close; ambience beds per zone; music with intensity layers and ducking; master/music/SFX sliders.

**VFX**
- Short, readable, palette-matched `ParticleEmitter` bursts (`:Emit(n)`), trails on fast things, pickup sparkle, spawn/despawn poofs, ground decals for AoE telegraphs, screen-edge effects for low health (subtle).

**Rewards & progression**
- Reward moments in 3 beats: anticipation (0.2–0.4 s build) → burst (particles, sound, UI pop with `Back` ease overshoot) → settle (counter tweens up, item flies to its HUD slot).
- Progress bars ease, never jump. Level-ups, unlocks and milestones deserve a mini-celebration; never block play for more than ~2 s.
- Make the next goal always visible.

**Onboarding (FTUE)**
- First 60 s scripted in the GDD: player acts within 5 s, first reward within 20 s, one new concept at a time, learn by doing.
- Contextual hints (world-space arrows/Beams/billboards, highlight the target) that disappear once done; skippable; never a wall of text; no tutorial that blocks input needlessly.
- Safe early failure: instant respawn, nothing lost in the first minutes.

**Life & atmosphere**
- Idle animations, ambient motion (wind sway, floating dust, flickering lights), reactive world (doors, buttons, props respond), NPCs that look at the player.
- Loading: branded `ReplicatedFirst` loading screen with progress; smooth fade transitions between states; no pop-in at spawn.

**Flow & fairness**
- Clear fail states and quick retry; no unavoidable one-shot deaths without telegraph; rubber-banding/difficulty ramps; session ends on a high note.
- Latency: predict feedback on the client instantly (sound, animation, particles), server confirms outcome; reconcile gracefully.

**Accessibility & comfort**
- Colour-blind-safe cues (shape/icon, not colour only), text-size option, reduce-motion/shake toggle, subtitles for key audio, adjustable volume, no flashing faster than 3 Hz.

## Implementation notes
- A client `Feedback` module exposing `Feedback.hit(position, strength)`, `Feedback.reward(kind, amount)`, `Feedback.shake(amplitude, duration)`, `Feedback.sound(name, props)` keeps juice consistent and tunable from one place.
- Use `TweenService`/springs; pool particles and billboards; everything cosmetic runs on the client and never affects authority.
- Tune by playing it: record a short capture or screenshot sequence of key moments and have `visual-critic` score them.
