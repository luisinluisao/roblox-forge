# roblox-forge

**A quality-gated AI game studio for Roblox Studio.** A Claude Code plugin that turns "make me a game" into a studio-style pipeline: design doc → vertical slice → systems → art → UI → juice → playtest → critique → fix, repeated until every quality gate passes.

It drives your open Studio session through Roblox's **built-in MCP server** (script editing, `execute_luau`, play-mode control, input simulation, **screenshots**, AI mesh/material/procedural-model generation, Creator Store search).

> English · [Português (BR)](README.pt-BR.md)

## Why it is different
Most AI-for-Roblox setups give a model tools and hope. roblox-forge adds what makes results good:

| Piece | What it does |
|---|---|
| **Director workflow** (`/roblox-forge:build`) | GDD first, then a *vertical slice at final quality*, then expansion task by task. |
| **Specialist agents** | `luau-engineer`, `level-artist`, `ui-designer`, `qa-playtester`, `visual-critic`, each with strict procedures. |
| **Expert skills** | `luau-craft` (strict, server-authoritative, safe data), `visual-direction` (anti-blocky art + lighting recipes), `ui-craft`, `game-feel`, `asset-pipeline` (generate → vet → integrate), `playtest-protocol`. |
| **Real verification** | Scene audit, script audit (security/deprecated APIs/remote validation), runtime probe, remote-attack tests, screenshot critique with a scored rubric. |
| **Quality gates + Stop hook** | 11 gates. The session is *not allowed to stop* until they pass (with a safety cap). Builders can't approve their own work: only the QA agent or the critic can pass specific gates, with evidence. |

## Requirements
- Roblox Studio (latest) with **Assistant → … → Manage MCP Servers → "Enable Studio as MCP server"**
- Node.js 18+ on PATH (MCP launcher + gate scripts)
- Windows or macOS (Studio's platforms)
- One supported agent harness: Claude Code, DeepSeek Harness, Mistral Vibe, or any host that reads Agent Skills and MCP. Install instructions in [docs/INSTALL.md](docs/INSTALL.md).

## Install

Every harness gets the same skills and the same Studio MCP launcher through one installer.

```bash
git clone https://github.com/luisinluisao/roblox-forge.git
cd roblox-forge
node scripts/install-harness.mjs --list          # detect harnesses on this machine
node scripts/install-harness.mjs --harness auto  # install into every detected harness
```

| Harness | Skills land in | Agents | Studio MCP |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills` | `~/.claude/agents/*.md` | plugin `.mcp.json` |
| DeepSeek Harness | `~/.agents/skills` | role files in `agents/` | generated `cordis.patch.yml` plus `plugin_manager install_bundle` |
| Mistral Vibe | `~/.vibe/skills` | `~/.vibe/agents/*.toml` | `vibe mcp add` command printed by the installer |
| Codex, OpenCode, Cursor, other Agent Skills hosts | `~/.agents/skills` | not portable | MCP snippet printed by the installer and documented in [docs/INSTALL.md](docs/INSTALL.md) |

Claude Code users can also install through the plugin marketplace. DeepSeek Harness users install the bundle the installer generates. The installer prints every command it cannot run for you.

## Use

In Claude Code the slash commands below exist. In every other harness, invoke the matching skill by name or ask in words.

| Command | Purpose |
|---|---|
| `/roblox-forge:setup` | Check/fix the Studio connection. |
| `/roblox-forge:build <idea>` | Full pipeline from idea to release-ready game. |
| `/roblox-forge:polish [area]` | Raise an existing game's visuals/UI/feel with scored critique rounds. |
| `/roblox-forge:qa [area]` | Bug hunt + performance + exploit audit. |
| `/roblox-forge:stop` | Abort the loop (also: just press Esc). |

Example: `/roblox-forge:build a cozy co-op fishing tycoon, pastel low-poly look, mobile-first, 10-minute sessions`

Tip: use your strongest model with high reasoning effort, keep Studio open and visible, work on a **copy** of your place, and be specific about the vibe.

## Quality gates
`design_doc` · `architecture` · `core_loop` · `console_clean` · `visual_quality` · `ui_quality` · `game_feel` · `performance` · `security` · `edge_cases` · `release_ready`

State lives in `.roblox-forge/` inside your project (`quality.json`, `GDD.md`, `TASKS.md`, `DECISIONS.md`, `QA_LOG.md`, `REPORT.md`). These ledgers also let a run survive context compaction or a restart. Check progress any time:
`node scripts/forge-state.mjs status`

### The "don't stop until done" loop
A `Stop` hook blocks the session from ending while gates are open and tells the model which gate to work on. Safety valves: a cap of 30 forced continuations (`forge-state.mjs init --force --max-blocks N`), `/roblox-forge:stop`, Esc, and an automatic pause when the model needs your input. **A full run can use a lot of tokens/time**; raise the cap deliberately.

## Honest limits
- It maximises quality with process, tools and verification; it cannot guarantee "perfect, bug-free". Automated play can't judge fun or real-network behaviour, so playtest with humans (and phones) before launch.
- Gate approval by separate agents is a strong convention enforced by the CLI, not cryptographic proof; read the evidence in `REPORT.md`.
- Generated meshes/materials vary in quality and may have limits or costs on Roblox's side. The pipeline is generate → screenshot → critique → regenerate/replace.
- Tool names follow Roblox's Studio MCP docs at the time of writing; if Roblox renames tools, update the skills.
- Studio's MCP can read and modify your open place. Use version history/backups.

## Repository layout
```
.claude-plugin/    plugin.json + marketplace.json
.mcp.json          launches Studio's MCP server (scripts/studio-mcp.mjs)
agents/            5 specialist subagents
skills/            build, polish, qa, setup, stop + 6 knowledge skills (+ Luau audit scripts)
hooks/hooks.json   SessionStart / UserPromptSubmit / Stop
scripts/           gate CLI, hook logic, MCP launcher
tests/             node:test suite   (npm test)
```

## Contributing
Issues and PRs welcome: new genre playbooks (obby, tycoon, simulator, shooter…), better audit heuristics, rubric calibration with real screenshots. Run `npm test` before a PR.

## License
MIT
