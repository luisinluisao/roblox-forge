---
name: stop
description: Abort the current roblox-forge run so the Stop hook stops forcing continuation. Use only when the user explicitly says to stop, cancel or abort the forge/build loop.
disable-model-invocation: true
---

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/forge-state.mjs" abort`, then summarize in 5 lines what is done and what is still open (read `.roblox-forge/REPORT.md`). Do not continue building.
