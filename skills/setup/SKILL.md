---
name: setup
description: Check and fix the connection between this plugin and Roblox Studio's built-in MCP server. Use when Studio tools are missing or failing, on first install, or when the user asks how to connect Claude to Roblox Studio.
---

# Roblox Studio connection check

1. Call `list_roblox_studios`. If it returns instances, the connection works: report their names and IDs and stop.
2. If the Roblox tools are missing or erroring, tell the user to do exactly this:
   - Update Roblox Studio to the latest version and open (or create) a place.
   - In Studio: **Assistant → … → Manage MCP Servers → turn on "Enable Studio as MCP server"**.
   - Restart Claude Code (the plugin launches Studio's MCP server itself via `scripts/studio-mcp.mjs`; Windows uses `%LOCALAPPDATA%\Roblox\mcp.bat`, macOS uses `/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP`; override with env `ROBLOX_STUDIO_MCP_CMD`).
   - Verify: in the same Manage MCP Servers panel a green indicator should show a connected client.
3. If the user already connected Claude Code through Studio's "Quick connect", there may be two Roblox servers; either works, tell them to keep one.
4. Requires Node.js 18+ on PATH (for the launcher and the quality-gate scripts): `node --version`.
5. Optional but recommended: in Studio Game Settings → Security enable "Allow HTTP Requests" only if the game needs it, and "Enable Studio Access to API Services" if you want DataStores tested in Studio.
6. Reminder: connected clients can read and modify the open place. Work on a copy or keep version history/backups.
