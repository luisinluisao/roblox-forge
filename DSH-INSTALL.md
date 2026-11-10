# DeepSeek Harness install

Run the shared installer first:

```bash
node scripts/install-harness.mjs --harness dsh
```

It copies the skills to `~/.agents/skills`, writes the agent roles as reference files, and generates `cordis.patch.yml` for this checkout. Then install the bundle:

```
plugin_manager install_bundle  target: <absolute path to this checkout>
```

The bundle row `roblox-forge-mcp` connects the Studio launcher through `@deepseek-ai/dsh-mcp-client`. The full matrix, including what is and is not portable, is in [docs/INSTALL.md](docs/INSTALL.md).

## Limitation

The Claude Code Stop hook gate loop has no equivalent bundle in a stock DSH profile, so DSH does not force continuation while gates are open. The skills still run every gate. See `docs/INSTALL.md` for the per-harness differences.
