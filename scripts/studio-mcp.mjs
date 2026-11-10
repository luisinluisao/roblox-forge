#!/usr/bin/env node
// Cross-platform launcher for the Roblox Studio built-in MCP server (stdio).
// Windows: %LOCALAPPDATA%\Roblox\mcp.bat   macOS: RobloxStudio.app/Contents/MacOS/StudioMCP
// Override with ROBLOX_STUDIO_MCP_CMD="<full path to binary or .bat>".
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const override = process.env.ROBLOX_STUDIO_MCP_CMD;
let child;

function fail(msg) {
  process.stderr.write(`[roblox-forge] ${msg}\n`);
  process.exit(1);
}

if (process.platform === "win32") {
  const bat = override || path.join(process.env.LOCALAPPDATA || "", "Roblox", "mcp.bat");
  if (!fs.existsSync(bat)) {
    fail(`Studio MCP launcher not found at ${bat}. Update Roblox Studio, open it once, then enable: Assistant > ... > Manage MCP Servers > "Enable Studio as MCP server".`);
  }
  child = spawn("cmd.exe", ["/d", "/s", "/c", `"${bat}"`], {
    stdio: "inherit",
    windowsHide: true,
    windowsVerbatimArguments: true,
  });
} else if (process.platform === "darwin") {
  const bin = override || "/Applications/RobloxStudio.app/Contents/MacOS/StudioMCP";
  if (!fs.existsSync(bin)) {
    fail(`Studio MCP binary not found at ${bin}. Update Roblox Studio and enable "Enable Studio as MCP server" in Assistant > Manage MCP Servers.`);
  }
  child = spawn(bin, [], { stdio: "inherit" });
} else {
  fail("Roblox Studio only runs on Windows and macOS.");
}

child.on("error", (e) => fail(`Failed to start Studio MCP: ${e.message}`));
child.on("exit", (code, signal) => process.exit(signal ? 1 : code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
