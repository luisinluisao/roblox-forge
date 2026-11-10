# Mistral Vibe install

Run the shared installer first:

```bash
node scripts/install-harness.mjs --harness vibe
```

It copies the skills to `~/.vibe/skills`, converts the five agent definitions to `~/.vibe/agents/*.toml`, and prints the MCP command. Register the Studio server with that printed command:

```bash
vibe mcp add roblox_studio --transport stdio --command node --arg "<checkout>\scripts\studio-mcp.mjs" --startup-timeout-sec 30 --tool-timeout-sec 600
```

The full matrix, including what is and is not portable, is in [docs/INSTALL.md](docs/INSTALL.md).

## Limitation

Vibe has no Claude Code Stop hook equivalent, so the harness does not force continuation while gates are open. The skills still run every gate.
