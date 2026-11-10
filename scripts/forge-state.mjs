#!/usr/bin/env node
// CLI used by the agents to manage the quality gates.
//   node forge-state.mjs init "<game name>" [--max-blocks 30] [--force]
//   node forge-state.mjs gate <id> <pass|fail|pending> --note "<evidence>" --by <agent-name>
//   node forge-state.mjs status | pause "<reason>" | resume | finish | abort
import fs from "node:fs";
import path from "node:path";
import { GATES, DIR_NAME, findRoot, load, save, newState, openGates, logLine, writeReport } from "./lib/state.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (name, fallback = "") => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);
const rootDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const die = (m) => { console.error(`forge-state: ${m}`); process.exit(1); };

function need() {
  const root = findRoot(rootDir);
  if (!root) die(`no ${DIR_NAME}/quality.json found. Run: init "<game name>"`);
  return [root, load(root)];
}

function table(state) {
  const rows = GATES.map(([id, who]) => {
    const g = state.gates[id];
    const icon = g.status === "pass" ? "PASS" : g.status === "fail" ? "FAIL" : "....";
    return `${icon}  ${id.padEnd(15)} (verifier: ${who})${g.note ? `  — ${g.note.slice(0, 110)}` : ""}`;
  });
  const done = GATES.length - openGates(state).length;
  return `${state.game}: ${done}/${GATES.length} gates passed | stop-blocks used ${state.blocks}/${state.maxBlocks} | ${state.active ? (state.paused ? "PAUSED" : "ACTIVE") : "inactive"}\n${rows.join("\n")}`;
}

switch (cmd) {
  case "init": {
    const game = argv[1] && !argv[1].startsWith("--") ? argv[1] : "untitled-game";
    const existing = findRoot(rootDir);
    if (existing && load(existing)?.active && !has("force")) die("an active run already exists. Use --force to restart it, or `abort` first.");
    const root = existing || rootDir;
    fs.mkdirSync(path.join(root, DIR_NAME), { recursive: true });
    const state = newState(game, parseInt(flag("max-blocks", "30"), 10) || 30);
    logLine(state, `init "${game}"`);
    save(root, state);
    console.log(table(state));
    break;
  }
  case "gate": {
    const [root, state] = need();
    const [id, status] = [argv[1], argv[2]];
    const spec = GATES.find(([g]) => g === id);
    if (!spec) die(`unknown gate "${id}". Valid: ${GATES.map((g) => g[0]).join(", ")}`);
    if (!["pass", "fail", "pending"].includes(status)) die("status must be pass|fail|pending");
    const note = flag("note");
    const by = flag("by");
    if (status === "pass") {
      if (by !== spec[1]) die(`gate "${id}" can only be marked PASS by "${spec[1]}" (got "${by || "nobody"}"). Delegate the verification to that agent.`);
      if (note.trim().length < 20) die("PASS needs --note with concrete evidence (what was run/seen, scores, counts), at least 20 chars.");
    }
    state.gates[id] = { status, note, by, at: new Date().toISOString() };
    logLine(state, `gate ${id} -> ${status}${by ? ` by ${by}` : ""}: ${note.slice(0, 120)}`);
    save(root, state);
    console.log(table(state));
    break;
  }
  case "status": {
    const [, state] = need();
    console.log(table(state));
    break;
  }
  case "pause": {
    const [root, state] = need();
    state.paused = true;
    state.pauseReason = argv.slice(1).join(" ");
    logLine(state, `pause: ${state.pauseReason}`);
    save(root, state);
    console.log("Paused: the next Stop will be allowed so you can wait for the user. Auto-resumes on the user's next message.");
    break;
  }
  case "resume": {
    const [root, state] = need();
    state.paused = false;
    save(root, state);
    console.log(table(state));
    break;
  }
  case "finish": {
    const [root, state] = need();
    const open = openGates(state);
    if (open.length) die(`cannot finish, open gates: ${open.map((g) => g.id).join(", ")}`);
    state.active = false;
    logLine(state, "finish: all gates passed");
    save(root, state);
    writeReport(root, state, "All quality gates passed.");
    console.log("All gates passed. Run closed.");
    break;
  }
  case "abort": {
    const [root, state] = need();
    state.active = false;
    logLine(state, "abort by user");
    save(root, state);
    writeReport(root, state, "Run aborted by the user.");
    console.log("Run aborted. The Stop hook will no longer block.");
    break;
  }
  default:
    die('usage: init "<game>" | gate <id> <pass|fail|pending> --note "..." --by <agent> | status | pause "<why>" | resume | finish | abort');
}
