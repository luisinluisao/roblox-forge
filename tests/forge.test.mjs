import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
const run = (file, args, cwd, input = "") =>
  spawnSync("node", [path.join(scripts, file), ...args], { cwd, input, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: cwd } });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "forge-"));
const stop = (cwd) => run("forge-hook.mjs", ["stop"], cwd, JSON.stringify({ cwd }));

test("stop hook is silent when no run is active", () => {
  const r = stop(tmp());
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
});

test("stop hook blocks while gates are open, then allows at the cap", () => {
  const d = tmp();
  run("forge-state.mjs", ["init", "T", "--max-blocks", "2"], d);
  for (let i = 0; i < 2; i++) assert.equal(JSON.parse(stop(d).stdout).decision, "block");
  const last = JSON.parse(stop(d).stdout);
  assert.equal(last.decision, undefined);
  assert.match(last.systemMessage, /safety cap/);
  assert.ok(fs.existsSync(path.join(d, ".roblox-forge", "REPORT.md")));
  assert.equal(stop(d).stdout, "");
});

test("only the designated verifier may pass a gate, with evidence", () => {
  const d = tmp();
  run("forge-state.mjs", ["init", "T"], d);
  const wrong = run("forge-state.mjs", ["gate", "visual_quality", "pass", "--by", "luau-engineer", "--note", "looks great, trust me bro ok"], d);
  assert.notEqual(wrong.status, 0);
  const thin = run("forge-state.mjs", ["gate", "visual_quality", "pass", "--by", "visual-critic", "--note", "ok"], d);
  assert.notEqual(thin.status, 0);
  const good = run("forge-state.mjs", ["gate", "visual_quality", "pass", "--by", "visual-critic", "--note", "6 shots, avg 9.1, min criterion 8.5"], d);
  assert.equal(good.status, 0);
});

test("all gates passing lets the run finish", () => {
  const d = tmp();
  run("forge-state.mjs", ["init", "T"], d);
  const who = { design_doc: "game-director", release_ready: "game-director", visual_quality: "visual-critic", ui_quality: "visual-critic", game_feel: "visual-critic" };
  for (const id of ["design_doc", "architecture", "core_loop", "console_clean", "visual_quality", "ui_quality", "game_feel", "performance", "security", "edge_cases", "release_ready"]) {
    const r = run("forge-state.mjs", ["gate", id, "pass", "--by", who[id] ?? "qa-playtester", "--note", `evidence for ${id}: measured and verified`], d);
    assert.equal(r.status, 0, r.stderr);
  }
  assert.match(JSON.parse(stop(d).stdout).systemMessage, /all quality gates passed/);
  assert.equal(stop(d).stdout, "");
});

test("pause lets Stop through and the next user prompt resumes", () => {
  const d = tmp();
  run("forge-state.mjs", ["init", "T"], d);
  run("forge-state.mjs", ["pause", "need", "input"], d);
  assert.equal(stop(d).stdout, "");
  run("forge-hook.mjs", ["prompt-submit"], d, JSON.stringify({ cwd: d }));
  assert.equal(JSON.parse(stop(d).stdout).decision, "block");
});
