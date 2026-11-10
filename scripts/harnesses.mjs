//! Registry and pure renderers for installing roblox-forge into agent harnesses.
//!
//! The installer itself only copies files and prints harness commands. Turning a
//! plugin into a harness extension belongs to the harness, so this module models each
//! harness as data (where skills live, how agents are expressed, how MCP is wired) and
//! keeps every filesystem decision in `install-harness.mjs`.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PLUGIN_ROOT_TOKEN = "__PLUGIN_ROOT__";
export const MANAGED_MARKER = "installed by roblox-forge";

const SKILL_ALLOWED_KEYS = new Set(["name", "description"]);

/** Source files that make up the portable skill set. */
export function skillNames(pluginRoot) {
	return fs
		.readdirSync(path.join(pluginRoot, "skills"), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

function splitFrontmatter(markdown) {
	const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return { frontmatter: [], body: markdown };
	return { frontmatter: match[1].split(/\r?\n/), body: match[2] };
}

/** Resolve plugin-root placeholders and argument placeholders in a skill body. */
export function resolveSkillText(markdown, pluginRoot) {
	return markdown
		.split("${CLAUDE_PLUGIN_ROOT}")
		.join(pluginRoot)
		.split("$CLAUDE_PLUGIN_ROOT")
		.join(pluginRoot)
		.split("$ARGUMENTS")
		.join("<game idea from the user>");
}

/**
 * Render a skill for a harness. Claude Code receives the original metadata. Every
 * other harness gets only `name` and `description`, because unknown frontmatter keys
 * are not part of the shared Agent Skills convention.
 */
export function renderSkill(markdown, { pluginRoot, harness, note }) {
	let text = resolveSkillText(markdown, pluginRoot);
	if (harness !== "claude") {
		const { frontmatter, body } = splitFrontmatter(text);
		const kept = frontmatter.filter((line) => {
			const key = /^([A-Za-z0-9_-]+):/.exec(line)?.[1];
			return key === undefined || SKILL_ALLOWED_KEYS.has(key);
		});
		text = `---\n${kept.join("\n")}\n---\n${body}`;
	}
	if (note && !text.includes(MANAGED_MARKER)) {
		text = `${text.trimEnd()}\n\n## ${MANAGED_MARKER}\n\n${note}\n`;
	}
	return text;
}

/** Convert a Claude agent markdown file into a Mistral Vibe agent TOML. */
export function renderVibeAgent(markdown, { pluginRoot, note }) {
	const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) throw new Error("agent markdown has no frontmatter");
	const description = /^description:\s*(.+)$/m.exec(match[1])?.[1]?.trim();
	if (!description) throw new Error("agent markdown has no description");
	if (match[2].includes("'''")) throw new Error("agent body contains a triple single quote");
	const instructions = resolveSkillText(match[2].trimEnd(), pluginRoot) + (note ? `\n\n## ${MANAGED_MARKER}\n\n${note}` : "");
	return [
		`description = ${JSON.stringify(description)}`,
		'agent_type = "subagent"',
		`instructions = '''\n${instructions}\n'''`,
		"",
	].join("\n");
}

/** DSH bundle patch: MCP row for the Studio launcher plus display resources. */
export function renderDshPatch(pluginRoot) {
	const launcher = path.join(pluginRoot, "scripts", "studio-mcp.mjs").replaceAll("\\", "/");
	return `- insert:
    - id: roblox-forge-mcp
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: roblox_studio
        transport: stdio
        command: node
        args:
          - '${launcher}'
        failOnStartupError: false
`;
}

/** MCP snippets for harnesses whose config this installer does not edit. */
export function mcpSnippets(pluginRoot) {
	const launcher = path.join(pluginRoot, "scripts", "studio-mcp.mjs");
	const windowsLauncher = launcher.replaceAll("\\", "\\\\");
	return {
		vibe: `vibe mcp add roblox_studio --transport stdio --command node --arg "${launcher}" --startup-timeout-sec 30 --tool-timeout-sec 600`,
		codex: `[mcp_servers.roblox_studio]\ncommand = "node"\nargs = ["${windowsLauncher}"]`,
		opencode: `{\n  "mcp": {\n    "roblox_studio": {\n      "type": "local",\n      "command": ["node", "${windowsLauncher}"],\n      "enabled": true\n    }\n  }\n}`,
		cursor: `{\n  "mcpServers": {\n    "roblox_studio": {\n      "command": "node",\n      "args": ["${windowsLauncher}"]\n    }\n  }\n}`,
		claude: "The plugin's .mcp.json already declares the roblox_studio server. Installing the plugin through its marketplace is enough.",
	};
}

/**
 * Harness registry. `detect` is a pure function of the home directory and env so the
 * plan is testable without touching the real machine.
 */
export function discoverHarnesses({ home = os.homedir(), env = process.env } = {}) {
	const has = (...parts) => fs.existsSync(path.join(home, ...parts));
	const onPath = (name) => {
		const pathEnv = env.PATH || env.Path || "";
		const exts = process.platform === "win32" ? (env.PATHEXT || ".EXE").split(";") : [""];
		return pathEnv
			.split(path.delimiter)
			.filter(Boolean)
			.some((dir) => exts.some((ext) => fs.existsSync(path.join(dir, `${name}${ext}`))));
	};
	return [
		{
			id: "claude",
			label: "Claude Code",
			detected: has(".claude") || onPath("claude"),
			skillsDir: path.join(home, ".claude", "skills"),
			agents: { dir: path.join(home, ".claude", "agents"), format: "markdown" },
			mcp: "plugin",
		},
		{
			id: "dsh",
			label: "DeepSeek Harness",
			detected: has(".dsh") || has(".agents", "skills"),
			skillsDir: path.join(home, ".agents", "skills"),
			agents: null,
			mcp: "bundle",
		},
		{
			id: "vibe",
			label: "Mistral Vibe",
			detected: has(".vibe") || onPath("vibe"),
			skillsDir: path.join(home, ".vibe", "skills"),
			agents: { dir: path.join(home, ".vibe", "agents"), format: "toml" },
			mcp: "vibe",
		},
		{
			id: "agents",
			label: "Generic Agent Skills (Codex, OpenCode, Cursor, others)",
			detected: has(".agents", "skills"),
			skillsDir: path.join(home, ".agents", "skills"),
			agents: null,
			mcp: "snippet",
		},
	];
}

export function harnessNote(id, pluginRoot) {
	return (
		`This skill is ${MANAGED_MARKER} for ${id}. ` +
		`When the workflow delegates to a specialist, read that specialist's definition at \`${pluginRoot}${path.sep}agents<role>.md\` ` +
		"and delegate with the role text, or use the harness's own subagent mechanism. " +
		"The plugin's Stop gate loop only runs under Claude Code; in every other harness the agent must keep running the gates from the skill."
	);
}

/** Agent markdown files shipped with the plugin. */
export function agentFiles(pluginRoot) {
	const dir = path.join(pluginRoot, "agents");
	return fs
		.readdirSync(dir)
		.filter((name) => name.endsWith(".md"))
		.sort()
		.map((name) => ({ name: name.replace(/\.md$/, ""), path: path.join(dir, name), markdown: fs.readFileSync(path.join(dir, name), "utf8") }));
}

/**
 * Build a complete install plan without touching the disk. Writes are de-duplicated
 * by path, so selecting both `dsh` and `agents` installs the shared skills once.
 */
export function planInstall({ pluginRoot, home = os.homedir(), env = process.env, harnesses = "auto", includeAgents = true } = {}) {
	const discovered = discoverHarnesses({ home, env });
	const requested =
		harnesses === "auto"
			? discovered.filter((entry) => entry.detected).map((entry) => entry.id)
			: harnesses === "all"
				? discovered.map((entry) => entry.id)
				: String(harnesses)
						.split(",")
						.map((value) => value.trim())
						.filter(Boolean);
	const unknown = requested.filter((id) => !discovered.some((entry) => entry.id === id));
	if (unknown.length > 0) throw new Error(`unknown harness: ${unknown.join(", ")}`);

	const selected = discovered.filter((entry) => requested.includes(entry.id));
	const writes = new Map();
	const commands = [];
	const notes = [];

	const skills = skillNames(pluginRoot).map((name) => ({
		name,
		markdown: fs.readFileSync(path.join(pluginRoot, "skills", name, "SKILL.md"), "utf8"),
		extra: fs
			.readdirSync(path.join(pluginRoot, "skills", name))
			.filter((file) => file !== "SKILL.md")
			.map((file) => ({ file, path: path.join(pluginRoot, "skills", name, file) })),
	}));

	for (const harness of selected) {
		for (const skill of skills) {
			const targetDir = path.join(harness.skillsDir, skill.name);
			writes.set(
				path.join(targetDir, "SKILL.md"),
				renderSkill(skill.markdown, {
					pluginRoot,
					harness: harness.id === "dsh" || harness.id === "agents" ? "standard" : harness.id,
					note: harnessNote(harness.id, pluginRoot),
				}),
			);
			for (const extra of skill.extra) {
				writes.set(path.join(targetDir, extra.file), fs.readFileSync(extra.path, "utf8"));
			}
		}
		if (includeAgents && harness.agents) {
			for (const agent of agentFiles(pluginRoot)) {
				const content =
					harness.agents.format === "toml"
						? renderVibeAgent(agent.markdown, { pluginRoot, note: harnessNote(harness.id, pluginRoot) })
						: resolveSkillText(agent.markdown, pluginRoot);
				const extension = harness.agents.format === "toml" ? ".toml" : ".md";
				writes.set(path.join(harness.agents.dir, `${agent.name}${extension}`), content);
			}
		}
		if (harness.mcp === "vibe") {
			commands.push({ label: `Register the Studio MCP server in ${harness.label}`, command: mcpSnippets(pluginRoot).vibe });
		} else if (harness.mcp === "bundle") {
			writes.set(path.join(pluginRoot, "cordis.patch.yml"), renderDshPatch(pluginRoot));
			commands.push({
				label: `Install the DSH bundle (generated cordis.patch.yml)`,
				command: `plugin_manager install_bundle target ${pluginRoot}`,
			});
		} else if (harness.mcp === "snippet") {
			notes.push(`MCP config for ${harness.label} is in docs/INSTALL.md (Codex, OpenCode, Cursor snippets).`);
		}
	}

	return {
		pluginRoot,
		home,
		selected: selected.map((entry) => ({ id: entry.id, label: entry.label })),
		writes: [...writes.entries()].map(([target, content]) => ({ target, content })),
		commands,
		notes,
	};
}

/** Apply a plan. Returns the number of files written and removed. */
export function applyPlan(plan, { dryRun = false } = {}) {
	let written = 0;
	if (dryRun) return { written: plan.writes.length, removed: 0 };
	for (const write of plan.writes) {
		fs.mkdirSync(path.dirname(write.target), { recursive: true });
		fs.writeFileSync(write.target, write.content);
		written += 1;
	}
	return { written, removed: 0 };
}

function manifestPathFor(home) {
	return path.join(home, ".roblox-forge", "install-state.json");
}

/** Remove paths recorded in an install manifest. */
export function uninstall({ home, dryRun = false } = {}) {
	const manifestPath = manifestPathFor(home);
	if (!fs.existsSync(manifestPath)) return { removed: 0, files: [] };
	const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
	const files = manifest.files || [];
	if (dryRun) return { removed: files.length, files };
	let removed = 0;
	for (const file of files) {
		if (fs.existsSync(file)) {
			fs.rmSync(file, { force: true });
			removed += 1;
		}
	}
	fs.rmSync(manifestPath, { force: true });
	return { removed, files };
}

/** Persist what was installed so uninstall and reinstall stay idempotent. */
export function writeManifest(plan, { dryRun = false } = {}) {
	const manifestPath = manifestPathFor(plan.home);
	const manifest = {
		plugin: "roblox-forge",
		pluginRoot: plan.pluginRoot,
		installedAt: new Date().toISOString(),
		harnesses: plan.selected,
		files: plan.writes.map((write) => write.target),
	};
	if (!dryRun) {
		fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
		fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	}
	return manifest;
}
