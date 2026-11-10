import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	applyPlan,
	discoverHarnesses,
	planInstall,
	renderDshPatch,
	renderSkill,
	renderVibeAgent,
	uninstall,
	writeManifest,
} from "../scripts/harnesses.mjs";

const pluginRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "forge-install-"));

test("renderSkill normalises non-Claude frontmatter and resolves the plugin root", () => {
	const markdown = `---\nname: build\ndescription: Builds a game.\nargument-hint: <idea>\ndisable-model-invocation: true\n---\n\nRun ${"${CLAUDE_PLUGIN_ROOT}"}/scripts/forge-state.mjs with $ARGUMENTS.\n`;
	const rendered = renderSkill(markdown, { pluginRoot: "/plugin", harness: "standard", note: "note" });
	assert.doesNotMatch(rendered, /argument-hint/);
	assert.doesNotMatch(rendered, /disable-model-invocation/);
	assert.match(rendered, /^---\nname: build\ndescription: Builds a game\.\n---/);
	assert.match(rendered, /\/plugin\/scripts\/forge-state\.mjs/);
	assert.match(rendered, /<game idea from the user>/);
	assert.match(rendered, /installed by roblox-forge/);
});

test("renderSkill keeps Claude frontmatter untouched", () => {
	const markdown = "---\nname: qa\ndescription: QA.\nargument-hint: [area]\n---\n\nBody\n";
	const rendered = renderSkill(markdown, { pluginRoot: "/plugin", harness: "claude" });
	assert.match(rendered, /argument-hint/);
});

test("renderVibeAgent produces the TOML agent shape Vibe reads", () => {
	const markdown = "---\nname: luau-engineer\ndescription: Writes Luau.\n---\n\nYou are an engineer.\n";
	const toml = renderVibeAgent(markdown, { pluginRoot: "/plugin", note: "" });
	assert.match(toml, /^description = "Writes Luau\."/m);
	assert.match(toml, /^agent_type = "subagent"$/m);
	assert.match(toml, /^instructions = '''$/m);
});

test("renderDshPatch points the MCP client at the checkout", () => {
	const patch = renderDshPatch("C:\\Users\\demo\\roblox-forge");
	assert.match(patch, /serverName: roblox_studio/);
	assert.match(patch, /C:\/Users\/demo\/roblox-forge\/scripts\/studio-mcp\.mjs/);
	assert.match(patch, /failOnStartupError: false/);
});

test("discoverHarnesses recognises the shared agent-skills directory once", () => {
	const home = tmp();
	fs.mkdirSync(path.join(home, ".agents", "skills"), { recursive: true });
	const harnesses = discoverHarnesses({ home, env: {} });
	const detected = harnesses.filter((entry) => entry.detected).map((entry) => entry.id);
	assert.ok(detected.includes("dsh"));
	assert.ok(detected.includes("agents"));
	const shared = harnesses.filter((entry) => entry.skillsDir === path.join(home, ".agents", "skills"));
	assert.equal(shared.length, 2);
});

test("planInstall writes once for shared skill dirs and includes every skill", () => {
	const home = tmp();
	const plan = planInstall({ pluginRoot, home, harnesses: "agents,dsh", includeAgents: false });
	const targets = plan.writes.map((write) => write.target);
	assert.equal(new Set(targets).size, targets.length);
	const skillsRoot = path.join(home, ".agents", "skills");
	const shared = targets.filter((target) => target.startsWith(skillsRoot));
	const patch = targets.filter((target) => target === path.join(pluginRoot, "cordis.patch.yml"));
	assert.equal(shared.length + patch.length, targets.length);
	const skillDirs = fs.readdirSync(path.join(pluginRoot, "skills"), { withFileTypes: true }).filter((entry) => entry.isDirectory());
	assert.equal(shared.filter((target) => target.endsWith("SKILL.md")).length, skillDirs.length);
});

test("planInstall renders Vibe agents and the DSH patch for all harnesses", () => {
	const home = tmp();
	const plan = planInstall({ pluginRoot, home, harnesses: "all" });
	const targets = plan.writes.map((write) => write.target);
	assert.ok(targets.includes(path.join(pluginRoot, "cordis.patch.yml")));
	assert.ok(targets.some((target) => target.endsWith(".toml")));
	assert.ok(plan.commands.some((entry) => entry.command.includes("plugin_manager")));
	assert.ok(plan.commands.some((entry) => entry.command.includes("vibe mcp add")));
});

test("apply, manifest and uninstall are reversible", () => {
	const home = tmp();
	const plan = planInstall({ pluginRoot, home, harnesses: "agents", includeAgents: false });
	const applied = applyPlan(plan);
	assert.equal(applied.written, plan.writes.length);
	writeManifest(plan);
	const removed = uninstall({ home, dryRun: false });
	assert.equal(removed.removed, plan.writes.length);
	assert.ok(plan.writes.every((write) => !fs.existsSync(write.target)));
	assert.ok(!fs.existsSync(path.join(home, ".roblox-forge", "install-state.json")));
});

test("installer CLI dry run reports the plan without writing", () => {
	const home = tmp();
	const run = spawnSync(
		process.execPath,
		[path.join(pluginRoot, "scripts", "install-harness.mjs"), "--harness", "agents", "--home", home, "--dry-run", "--json"],
		{ encoding: "utf8" },
	);
	assert.equal(run.status, 0, run.stderr);
	const output = JSON.parse(run.stdout);
	assert.ok(output.plan.writes.length > 0);
	assert.ok(!fs.existsSync(path.join(home, ".agents")));
});

test("installer CLI lists harnesses as JSON", () => {
	const home = tmp();
	const run = spawnSync(process.execPath, [path.join(pluginRoot, "scripts", "install-harness.mjs"), "--list", "--home", home], {
		encoding: "utf8",
	});
	assert.equal(run.status, 0, run.stderr);
	const rows = JSON.parse(run.stdout);
	assert.ok(rows.some((row) => row.id === "vibe"));
});
