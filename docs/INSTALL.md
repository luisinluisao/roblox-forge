# Install roblox-forge in any harness

One installer copies the skills, writes the agent definitions in the format each harness reads, and generates the MCP wiring. The plugin itself is harness-neutral: the same skills and the same Studio MCP launcher serve every target.

```bash
git clone https://github.com/luisinluisao/roblox-forge.git
cd roblox-forge
node scripts/install-harness.mjs --list          # what is detected on this machine
node scripts/install-harness.mjs --harness auto  # install into every detected harness
node scripts/install-harness.mjs --harness all   # install into every supported harness
```

`--dry-run` prints the plan without writing. `--no-agents` skips agent definitions. `--uninstall` removes the files recorded by the last install, and `--json` makes the output machine readable.

## Support matrix

| Harness | Skills | Agents | Studio MCP |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/skills/<name>/SKILL.md` | `~/.claude/agents/<name>.md` | The plugin's `.mcp.json` loads with the plugin. Install with `/plugin marketplace add luisinluisao/roblox-forge` or `claude --plugin-dir .` |
| DeepSeek Harness | `~/.agents/skills/<name>/SKILL.md` | Not a file format the harness reads; the director delegates with role text from `agents/` | The installer writes `cordis.patch.yml`; install the bundle with `plugin_manager install_bundle` on this checkout |
| Mistral Vibe | `~/.vibe/skills/<name>/SKILL.md` | `~/.vibe/agents/<name>.toml` (`agent_type = "subagent"`) | `vibe mcp add roblox_studio --transport stdio --command node --arg "<checkout>/scripts/studio-mcp.mjs" --startup-timeout-sec 30 --tool-timeout-sec 600` |
| Codex, OpenCode, Cursor, other Agent Skills hosts | `~/.agents/skills/<name>/SKILL.md` | Not portable | Add the stdio server to that host's MCP config using the snippets below |

## Studio MCP snippets

The launcher is `scripts/studio-mcp.mjs`. It spawns Roblox Studio's own MCP server at `%LOCALAPPDATA%\Roblox\mcp.bat` on Windows, or `StudioMCP` inside the Studio app on macOS. Override it with `ROBLOX_STUDIO_MCP_CMD`.

Codex `config.toml`:

```toml
[mcp_servers.roblox_studio]
command = "node"
args = ["<checkout>/scripts/studio-mcp.mjs"]
```

OpenCode `opencode.json`:

```json
{
  "mcp": {
    "roblox_studio": {
      "type": "local",
      "command": ["node", "<checkout>/scripts/studio-mcp.mjs"],
      "enabled": true
    }
  }
}
```

Cursor `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "roblox_studio": {
      "command": "node",
      "args": ["<checkout>/scripts/studio-mcp.mjs"]
    }
  }
}
```

The installer prints the exact command with the real checkout path for Vibe and DeepSeek Harness. It does not edit any harness configuration file itself.

## Before the first run

1. Open Roblox Studio.
2. Assistant, menu of three dots, Manage MCP Servers, "Enable Studio as MCP server".
3. Start the harness in the project folder where the game should live.
4. Ask for a game, or invoke the `build` skill. The `setup` skill diagnoses a missing Studio connection.

## Harness differences

- **Claude Code** is the reference target. Slash commands, hooks and the Stop gate loop work as designed.
- **DeepSeek Harness** gets the skills, the Studio MCP tools and the agent definitions as reference files. The Stop hook gate loop is not active because the Claude hooks bridge is not installable as a DSH bundle in a stock profile. The skills still run every gate; the harness does not force continuation on its own.
- **Mistral Vibe** gets skills, converted agent TOML files and the Studio MCP server. There is no equivalent of the Claude Stop hook, so the same rule applies: keep the loop in the skill.
- **Generic Agent Skills hosts** get the portable skills and the MCP snippet. No hooks.

## Where state lives

The gate state machine is harness-neutral. `node scripts/forge-state.mjs init "<game>"` creates `.roblox-forge/` in the project folder, and every harness's scripts read the same files. Progress survives context compaction because the ledgers are plain markdown.
