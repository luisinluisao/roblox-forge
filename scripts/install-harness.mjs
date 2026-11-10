#!/usr/bin/env node
// Installs roblox-forge skills, agents and MCP configuration into agent harnesses.
//
// Usage:
//   node scripts/install-harness.mjs --list
//   node scripts/install-harness.mjs --harness auto|all|claude,dsh,vibe,agents [--dry-run]
//   node scripts/install-harness.mjs --uninstall [--dry-run]
//
// The installer copies files and prints the one harness command it cannot run for you
// (plugin_manager for DeepSeek Harness, `vibe mcp add` for Mistral Vibe). It never
// edits a harness configuration file directly.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyPlan,
	discoverHarnesses,
	mcpSnippets,
	planInstall,
	uninstall,
	writeManifest,
} from "./harnesses.mjs";

const PLUGIN_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
	const options = {
		harnesses: "auto",
		home: process.env.HOME || process.env.USERPROFILE,
		dryRun: false,
		includeAgents: true,
		list: false,
		uninstall: false,
		json: false,
		help: false,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		const next = () => {
			const value = argv[index + 1];
			if (value === undefined) throw new Error(`${arg} needs a value`);
			index += 1;
			return value;
		};
		if (arg === "--list") options.list = true;
		else if (arg === "--dry-run") options.dryRun = true;
		else if (arg === "--no-agents") options.includeAgents = false;
		else if (arg === "--uninstall") options.uninstall = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "--help" || arg === "-h") options.help = true;
		else if (arg === "--harness") options.harnesses = next();
		else if (arg === "--home") options.home = next();
		else if (arg === "--plugin-root") options.pluginRoot = next();
		else throw new Error(`unknown argument ${arg}`);
	}
	return options;
}

function help() {
	return `roblox-forge installer

  --list                 show detected harnesses and their skill locations
  --harness <selector>   auto (default), all, or a comma list of claude,dsh,vibe,agents
  --home <dir>           override the home directory (testing)
  --dry-run              print the plan without writing
  --no-agents            skip agent definitions
  --uninstall            remove files recorded by the last install
  --json                 machine-readable output
  --help                 this text`;
}

function printPlan(plan, { dryRun }) {
	console.log(`harnesses: ${plan.selected.map((entry) => entry.label).join(", ") || "none"}`);
	for (const write of plan.writes) {
		console.log(`  ${dryRun ? "would write" : "wrote"} ${write.target}`);
	}
	for (const command of plan.commands) {
		console.log(`  run: ${command.command}`);
	}
	for (const note of plan.notes) console.log(`  note: ${note}`);
}

function main() {
	const options = parseArgs(process.argv.slice(2));
	if (options.help) {
		console.log(help());
		return 0;
	}
	const pluginRoot = options.pluginRoot ? path.resolve(options.pluginRoot) : PLUGIN_ROOT;

	if (options.list) {
		const rows = discoverHarnesses({ home: options.home }).map((entry) => ({
			id: entry.id,
			label: entry.label,
			detected: entry.detected,
			skills: entry.skillsDir,
			agents: entry.agents ? `${entry.agents.dir} (${entry.agents.format})` : "not supported",
			mcp: entry.mcp,
		}));
		console.log(JSON.stringify(rows, null, 2));
		return 0;
	}

	if (options.uninstall) {
		const result = uninstall({ home: options.home, dryRun: options.dryRun });
		if (options.json) console.log(JSON.stringify(result, null, 2));
		else console.log(`${options.dryRun ? "would remove" : "removed"} ${result.removed} file(s)`);
		console.log(`MCP cleanup: run the harness-specific remove command from docs/INSTALL.md if you want the Studio server gone too.`);
		return 0;
	}

	const plan = planInstall({
		pluginRoot,
		home: options.home,
		harnesses: options.harnesses,
		includeAgents: options.includeAgents,
	});
	if (plan.selected.length === 0) {
		console.error("No harness selected. Use --harness all or name one of claude,dsh,vibe,agents.");
		return 2;
	}
	const applied = applyPlan(plan, { dryRun: options.dryRun });
	if (!options.dryRun) writeManifest(plan);
	if (options.json) {
		console.log(JSON.stringify({ applied, plan }, null, 2));
	} else {
		printPlan(plan, { dryRun: options.dryRun });
		console.log(`${options.dryRun ? "dry run" : "installed"}: ${applied.written} file(s)`);
		if (options.harnesses === "auto") console.log("MCP commands above are printed, not executed. Run them once per harness.");
	}
	return 0;
}

try {
	process.exitCode = main();
} catch (error) {
	console.error(`roblox-forge installer: ${error.message}`);
	process.exitCode = 1;
}
