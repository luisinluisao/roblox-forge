#!/usr/bin/env node
// Hook entry point: stop | prompt-submit | session-start. Never throws, always exits 0.
import fs from "node:fs";
import { findRoot, load, save, openGates, logLine, writeReport, GATES } from "./lib/state.mjs";

const event = process.argv[2];
let input = {};
try { input = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { /* no stdin */ }

const start = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
const root = findRoot(start);
const state = root ? load(root) : null;
const out = (obj) => process.stdout.write(JSON.stringify(obj));

function summary(s) {
  return GATES.map(([id]) => `${s.gates[id].status === "pass" ? "[x]" : s.gates[id].status === "fail" ? "[FAIL]" : "[ ]"} ${id}`).join("  ");
}

try {
  if (!state || !state.active) process.exit(0);

  if (event === "prompt-submit") {
    if (state.paused) { state.paused = false; state.pauseReason = ""; logLine(state, "auto-resume on user prompt"); save(root, state); }
  }

  if (event === "session-start") {
    out({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext:
          `roblox-forge run in progress for "${state.game}". Gates: ${summary(state)}. ` +
          `Read .roblox-forge/GDD.md, TASKS.md and DECISIONS.md, run \`node "\${CLAUDE_PLUGIN_ROOT}/scripts/forge-state.mjs" status\`, then continue with the first open gate. ` +
          `The Stop hook will keep you working until all gates pass (or the safety cap is hit).`,
      },
    });
  }

  if (event === "stop") {
    const open = openGates(state);
    if (state.paused) process.exit(0); // waiting for the user on purpose
    if (open.length === 0) {
      state.active = false;
      logLine(state, "all gates passed (stop hook)");
      save(root, state);
      writeReport(root, state, "All quality gates passed.");
      out({ systemMessage: "roblox-forge: all quality gates passed. Report: .roblox-forge/REPORT.md" });
      process.exit(0);
    }
    if (state.blocks >= state.maxBlocks) {
      state.active = false;
      logLine(state, `safety cap reached (${state.maxBlocks}); stopping with ${open.length} open gates`);
      save(root, state);
      writeReport(root, state, `Stopped at the safety cap (${state.maxBlocks} continuations) with ${open.length} gate(s) still open.`);
      out({ systemMessage: `roblox-forge: safety cap reached with ${open.length} open gate(s). See .roblox-forge/REPORT.md. Raise it with: forge-state init --force --max-blocks N` });
      process.exit(0);
    }
    state.blocks += 1;
    logLine(state, `stop blocked (${state.blocks}/${state.maxBlocks}); open: ${open.map((g) => g.id).join(",")}`);
    save(root, state);
    const next = open[0];
    const list = open.map((g) => `- ${g.id} [${g.status}] verifier=${g.who}: ${g.desc}${g.note ? ` | last note: ${g.note}` : ""}`).join("\n");
    out({
      decision: "block",
      reason:
        `roblox-forge: "${state.game}" is NOT done — ${open.length}/${GATES.length} quality gates still open (continuation ${state.blocks}/${state.maxBlocks}).\n${list}\n\n` +
        `Do not summarize or stop. Work on "${next.id}" now: build/fix what it needs, then delegate verification to the "${next.who}" agent, which alone may mark it PASS with evidence. ` +
        `If a gate FAILED, fix the listed problems and re-verify. If you truly need the user (missing Studio connection, ambiguous creative decision), run ` +
        `\`node "\${CLAUDE_PLUGIN_ROOT}/scripts/forge-state.mjs" pause "<reason>"\` and ask once.`,
    });
  }
} catch (e) {
  process.stderr.write(`roblox-forge hook error: ${e.message}\n`);
}
process.exit(0);
