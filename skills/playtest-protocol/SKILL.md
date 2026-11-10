---
name: playtest-protocol
description: Protocol and ready-made Luau audit scripts for testing a Roblox game inside Studio via MCP - automated playtests, input simulation, console checks, scene and script audits, runtime performance probes, remote attack tests, edge-case checklist, bug logging. Use whenever verifying, testing, debugging, profiling or reviewing the security/performance of a Roblox game or any change to it.
---

# Playtest protocol

Files next to this SKILL.md (use `${CLAUDE_SKILL_DIR}`; if unexpanded, locate them inside the plugin folder):
- `audit-scene.luau`: world audit (default look, blocky/untextured parts, duplicates/z-fighting, lighting setup, counts). Run in the **Edit** datamodel.
- `audit-scripts.luau`: static script audit (deprecated APIs, security red flags, remote validation heuristics, DataStore safety). Run in **Edit**.
- `probe-runtime.luau`: runtime performance snapshot. Run in **Server** and **Client** datamodels during play.

Read a file and pass its full content to `execute_luau` with the right `datamodel_type`. They are heuristics: a clean report is necessary, not sufficient.

## Smoke test (after every change)
1. `get_studio_state` → `start_stop_play` (start) → wait a few seconds.
2. `get_console_output`: zero errors/warnings that you did not already triage.
3. Walk the core loop with real input: `character_navigation`, `user_keyboard_input`, `user_mouse_input`. Do not shortcut with `execute_luau` unless testing server logic in isolation.
4. `screen_capture` key moments. `start_stop_play` (stop). Fix, then repeat.
You may also launch the Studio `subagent` of type `playtest` with a concrete scenario and success criteria ("buy the first upgrade and verify coins decrease"), then double-check its claims.

## Full campaign (feeds the gates)
**architecture**: `audit-scripts.luau` → zero HIGH; deprecated APIs gone; each remote handler reviewed.
**core_loop**: complete the loop start → reward → next goal using only player-level input.
**console_clean**: three consecutive complete playthroughs, server + client consoles empty of errors/warnings.
**edge_cases** (each must be tried):
- Join mid-round; leave mid-action; die mid-action; reset character; respawn spam; rejoin and verify data.
- Double-click/spam every button; trigger two actions the same frame; call remotes out of order.
- Empty and full inventories; zero/max currency; purchase with insufficient funds; item removed while equipped.
- DataStore failure (simulate by pcall-erroring the store wrapper) → no data loss, friendly message.
- Slow client (large `Studio` network simulation if available), streaming on/off, long session (≥10 min) for leaks.
- Gamepad, touch, keyboard each reach every screen and can open/close/back out.
**performance**: run `probe-runtime.luau` on Server and Client at idle, at peak action, and after 10 minutes. Look up current official budgets with the Studio `http_get`/`skill` tools (performance optimisation docs). Fallback heuristics (tune per game): Heartbeat script time avg < 4 ms and no sustained spikes > 16 ms; physics step < 4 ms; memory stable (no monotonic growth); instance count stable over time (no leak); total BaseParts < ~20k without streaming (streamed-in set should be much smaller with it); data send/receive low and bursty only on events. Check the top memory tags for surprises (textures, meshes, sounds).
**security**: from the Client datamodel (`execute_luau`) fire every remote with wrong types, nil, NaN, ±inf, huge/negative numbers, long strings, other players' ids, spam (100×/s), and before eligibility; the server must ignore/limit without errors or state change. Grep all scripts for `loadstring`, `getfenv`, `require(<digits>)`, long escaped strings; list scripts inside any inserted model.

## Bug log (`.roblox-forge/QA_LOG.md`)
`#id | severity (blocker/major/minor) | area | repro steps | expected | actual | status (open/fixed/verified)`. Blockers: crashes, data loss, soft-locks, exploits, broken core loop. Major: frequent errors, broken features, bad perf. Minor: cosmetic, rare.
After each fix: re-run the repro, then the smoke test (regressions are common).

## Honest limits
Automated play cannot judge fun, difficulty, or real-network behaviour. State what was not covered and recommend a few sessions with real players (and mobile devices) before launch.
