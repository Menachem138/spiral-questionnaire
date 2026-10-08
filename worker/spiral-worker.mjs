#!/usr/bin/env node
/**
 * Spiral questionnaire analysis worker.
 *
 * Runs on the admin's own Mac. Picks up questionnaires waiting for analysis,
 * runs the analysis with the official Claude Code CLI (signed in with the
 * admin's own Claude subscription), and sends the report back to the site.
 * Emergency fallback: the official Codex CLI (signed in with ChatGPT).
 *
 * No credentials of Claude or ChatGPT ever leave this machine: the site only
 * receives the finished report.
 *
 * Config (env vars or ~/.spiral-worker/config.json):
 *   SITE_URL       e.g. https://spiral-questionnaire.vercel.app
 *   WORKER_TOKEN   shared secret, same value as on the server
 *   ENGINES        "claude,codex" (order = priority). Default: "claude,codex"
 *   CLAUDE_MODEL   default "opus"
 *   MAX_JOBS       per run, default 3
 *
 * Usage: node spiral-worker.mjs            (one pass, then exit)
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const HOME_DIR = process.env.SPIRAL_WORKER_HOME || path.join(homedir(), ".spiral-worker");
const CONFIG_FILE = path.join(HOME_DIR, "config.json");
const LOCK_FILE = path.join(HOME_DIR, "worker.lock");
const LOG_FILE = path.join(HOME_DIR, "worker.log");

const fileCfg = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, "utf8")) : {};
const cfg = {
  site: (process.env.SITE_URL || fileCfg.SITE_URL || "").replace(/\/$/, ""),
  token: process.env.WORKER_TOKEN || fileCfg.WORKER_TOKEN || "",
  engines: (process.env.ENGINES || fileCfg.ENGINES || "claude,codex").split(",").map((s) => s.trim()),
  claudeModel: process.env.CLAUDE_MODEL || fileCfg.CLAUDE_MODEL || "opus",
  maxJobs: Number(process.env.MAX_JOBS || fileCfg.MAX_JOBS || 3),
};

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
  try {
    mkdirSync(HOME_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + "\n");
  } catch {}
}

async function api(method, p, body) {
  const res = await fetch(cfg.site + p, {
    method,
    headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${data.error ?? ""}`);
  return data;
}

/** run a command with stdin, collect stdout/stderr */
function run(cmd, args, input, { cwd, timeoutMs }) {
  return new Promise((resolve) => {
    // launchd starts with a minimal PATH; add the usual install locations
    const env = {
      ...process.env,
      PATH: [path.join(homedir(), ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].join(":"),
    };
    const child = spawn(cmd, args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, out, err: String(e) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
    child.stdin.end(input);
  });
}

const REQUIRED_OF = (schema) => schema.required ?? [];

function checkResult(result, schema) {
  if (!result || typeof result !== "object") throw new Error("result is not an object");
  const missing = REQUIRED_OF(schema).filter((k) => !(k in result));
  if (missing.length) throw new Error("missing fields: " + missing.join(", "));
  return result;
}

/** Engine 1: official Claude Code CLI, signed in with the admin's Claude subscription */
async function withClaude(job, work) {
  const sysFile = path.join(work, "system.md");
  writeFileSync(sysFile, job.system);
  const args = [
    "-p",
    "--output-format", "json",
    "--json-schema", JSON.stringify(job.schema),
    "--system-prompt-file", sysFile,
    "--tools", "",
    "--no-session-persistence",
    "--model", cfg.claudeModel,
    "--effort", "high",
  ];
  const r = await run("claude", args, job.prompt, { cwd: work, timeoutMs: 15 * 60_000 });
  let parsed;
  try {
    parsed = JSON.parse(r.out);
  } catch {
    throw new Error(`claude: unexpected output (code ${r.code}): ${(r.err || r.out).slice(0, 300)}`);
  }
  if (parsed.is_error) throw new Error(`claude: ${String(parsed.result).slice(0, 300)}`);
  const result = parsed.structured_output ?? JSON.parse(parsed.result);
  const model = Object.keys(parsed.modelUsage ?? {})[0] ?? cfg.claudeModel;
  return {
    result: checkResult(result, job.schema),
    engine: "claude-code",
    model,
    usage: { input: parsed.usage?.input_tokens ?? 0, output: parsed.usage?.output_tokens ?? 0 },
  };
}

/** Engine 2 (emergency only): official Codex CLI, signed in with ChatGPT */
async function withCodex(job, work) {
  const schemaFile = path.join(work, "schema.json");
  const outFile = path.join(work, "out.json");
  writeFileSync(schemaFile, JSON.stringify(job.schema));
  const prompt =
    "Follow the SYSTEM INSTRUCTIONS exactly, then analyze the EVIDENCE PACK. " +
    "Reply only with the JSON object required by the output schema. Do not run any commands.\n\n" +
    "=== SYSTEM INSTRUCTIONS ===\n" + job.system + "\n\n=== EVIDENCE PACK ===\n" + job.prompt;
  const args = ["exec", "--skip-git-repo-check", "--sandbox", "read-only", "--output-schema", schemaFile, "-o", outFile, "-"];
  const r = await run("codex", args, prompt, { cwd: work, timeoutMs: 15 * 60_000 });
  if (!existsSync(outFile)) throw new Error(`codex failed (code ${r.code}): ${(r.err || r.out).slice(-300)}`);
  const result = JSON.parse(readFileSync(outFile, "utf8"));
  return { result: checkResult(result, job.schema), engine: "codex", model: "codex (ChatGPT)", usage: { input: 0, output: 0 } };
}

const ENGINES = { claude: withClaude, codex: withCodex };

async function processJob(id) {
  const job = await api("GET", `/api/worker/job/${id}`);
  const work = path.join(tmpdir(), `spiral-job-${id}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  const errors = [];
  try {
    for (const name of cfg.engines) {
      const fn = ENGINES[name];
      if (!fn) continue;
      try {
        log(`job ${id}: running ${name}`);
        const out = await fn(job, work);
        await api("POST", `/api/worker/job/${id}`, out);
        log(`job ${id}: done with ${name}`);
        return true;
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
        log(`job ${id}: ${name} failed: ${e.message}`);
        // Claude Code not signed in is a setup issue, not an emergency: do not fall back to ChatGPT
        if (name === "claude" && /not logged in|\/login/i.test(e.message)) {
          log("Claude Code is not signed in. Run: claude auth login");
          break;
        }
      }
    }
    // engine unavailable (not signed in / usage limit / not installed): keep it in the queue for the next run
    const unavailable = /not logged in|\/login|usage limit|rate limit|limit reached|ENOENT|not found|429/i;
    const requeue = errors.length > 0 && errors.every((e) => unavailable.test(e));
    await api("POST", `/api/worker/job/${id}`, { error: errors.join(" | "), engine: "worker", requeue });
    if (requeue) log(`job ${id}: no engine available, back to queue`);
    return false;
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function main() {
  if (!cfg.site || !cfg.token) {
    log("missing SITE_URL or WORKER_TOKEN (see ~/.spiral-worker/config.json)");
    process.exit(1);
  }
  mkdirSync(HOME_DIR, { recursive: true });
  // one run at a time
  if (existsSync(LOCK_FILE)) {
    const age = Date.now() - Number(readFileSync(LOCK_FILE, "utf8") || 0);
    if (age < 30 * 60_000) return;
  }
  writeFileSync(LOCK_FILE, String(Date.now()));
  try {
    const { pending } = await api("GET", "/api/worker/pending");
    if (!pending.length) return;
    log(`${pending.length} pending`);
    for (const id of pending.slice(0, cfg.maxJobs)) await processJob(id);
  } catch (e) {
    log("error:", e.message);
  } finally {
    rmSync(LOCK_FILE, { force: true });
  }
}

main();
