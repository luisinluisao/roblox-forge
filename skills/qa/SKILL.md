---
name: qa
description: Run a full QA, bug-hunt, performance and exploit audit on a Roblox game in Studio with automated playtests, input simulation, console checks, runtime probes and attack tests against remotes. Use when the user asks to test the game, find bugs, check performance or lag, review security or anti-exploit, or verify the game is ready to publish.
argument-hint: [feature or area to focus on, optional]
disable-model-invocation: true
---

# /roblox-forge:qa $ARGUMENTS

1. Connect: `list_roblox_studios`, `get_studio_state`. Load `playtest-protocol`.
2. Delegate the entire campaign to the `qa-playtester` agent with the focus area (or "everything"). It must run: script audit, scene audit, 3 full playthroughs, edge-case suite, runtime probe, remote attack tests, free-model/backdoor scan.
3. Receive the bug list from `.roblox-forge/QA_LOG.md`. For every blocker/major bug, delegate the fix to `luau-engineer` (code) or `level-artist` (world) or `ui-designer` (UI), then have `qa-playtester` re-verify and regression-test.
4. Repeat until no blocker/major bugs remain and the technical gates (`architecture`, `core_loop`, `console_clean`, `edge_cases`, `performance`, `security`) pass with evidence.
5. Report to the user: what was tested, what was NOT tested, bugs found/fixed/open, performance numbers, exploit findings. Be honest about gaps: automated play cannot replace human playtests; recommend a few real-player sessions.
