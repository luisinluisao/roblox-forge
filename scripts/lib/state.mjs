// Shared state helpers for roblox-forge. State lives in <project>/.roblox-forge/quality.json
import fs from "node:fs";
import path from "node:path";

export const DIR_NAME = ".roblox-forge";
export const FILE_NAME = "quality.json";

// id, who may mark it PASS, what "pass" means
export const GATES = [
  ["design_doc",     "game-director",  "GDD.md complete: pillars, core loop, FTUE script (first 60s), progression, art/UI/audio direction, scope"],
  ["architecture",   "qa-playtester",  "Scripts strict + server-authoritative; audit-scripts reports zero HIGH findings; no deprecated APIs"],
  ["core_loop",      "qa-playtester",  "Core loop completed end-to-end by an automated playtest with zero manual help"],
  ["console_clean",  "qa-playtester",  "Zero errors/warnings (server + client) across 3 consecutive full playtests"],
  ["visual_quality", "visual-critic",  "Critic avg >= 9 and no criterion < 8 on every required screenshot"],
  ["ui_quality",     "visual-critic",  "UI verified at phone, tablet and desktop: no overlap/clipping, safe areas respected"],
  ["game_feel",      "visual-critic",  "Juice checklist complete: feedback, audio, animation, camera, onboarding"],
  ["performance",    "qa-playtester",  "Perf budgets met (instances, memory, heartbeat); mobile-safe"],
  ["security",       "qa-playtester",  "All remotes validated + rate-limited; no free-model scripts/backdoors; data saves safe"],
  ["edge_cases",     "qa-playtester",  "Join/leave/respawn/reset/data-failure/multi-player edge cases tested"],
  ["release_ready",  "game-director",  "Place settings, icon/thumbnail plan, final full regression pass"],
];

export function findRoot(start) {
  let dir = path.resolve(start || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, DIR_NAME, FILE_NAME))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function statePath(root) {
  return path.join(root, DIR_NAME, FILE_NAME);
}

export function load(root) {
  try {
    return JSON.parse(fs.readFileSync(statePath(root), "utf8"));
  } catch {
    return null;
  }
}

export function save(root, state) {
  state.updatedAt = new Date().toISOString();
  const file = statePath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}

export function newState(game, maxBlocks = 30) {
  const now = new Date().toISOString();
  const gates = {};
  for (const [id] of GATES) gates[id] = { status: "pending", note: "", by: "", at: "" };
  return { version: 1, active: true, game, startedAt: now, updatedAt: now, maxBlocks, blocks: 0, paused: false, pauseReason: "", gates, log: [] };
}

export function openGates(state) {
  return GATES.filter(([id]) => state.gates[id]?.status !== "pass").map(([id, who, desc]) => ({
    id, who, desc, status: state.gates[id]?.status ?? "pending", note: state.gates[id]?.note ?? "",
  }));
}

export function logLine(state, msg) {
  state.log.push(`${new Date().toISOString()} ${msg}`);
  if (state.log.length > 200) state.log = state.log.slice(-200);
}

export function writeReport(root, state, headline) {
  const open = openGates(state);
  const lines = [`# roblox-forge report — ${state.game}`, "", `**${headline}**`, "", "| Gate | Status | Note |", "|---|---|---|"];
  for (const [id] of GATES) {
    const g = state.gates[id];
    lines.push(`| ${id} | ${g.status} | ${(g.note || "").replace(/\|/g, "/").slice(0, 160)} |`);
  }
  if (open.length) {
    lines.push("", "## Still open", ...open.map((g) => `- **${g.id}** (${g.status}): ${g.desc}${g.note ? ` — last note: ${g.note}` : ""}`));
  }
  fs.writeFileSync(path.join(root, DIR_NAME, "REPORT.md"), lines.join("\n") + "\n");
}
