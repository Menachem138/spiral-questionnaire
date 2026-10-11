#!/usr/bin/env node
/**
 * Helper for the cloud routine (Claude Code in Anthropic's cloud, on the admin's subscription).
 * The routine itself writes the analysis; this script only moves data to and from the site.
 *
 * Env: SITE_URL, WORKER_TOKEN
 *   node worker/cloud-job.mjs pending            -> ids to analyze now (at 08:00/20:00 Israel time: the whole queue)
 *   node worker/cloud-job.mjs fetch <id>         -> writes /tmp/spiral/<id>/{system.md,evidence.md,schema.json}
 *   node worker/cloud-job.mjs submit <id> <file> -> validates the JSON against the schema and sends it
 *   node worker/cloud-job.mjs requeue <id> <msg> -> puts the job back in the queue
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const SITE = (process.env.SITE_URL || "https://spiral-questionnaire.vercel.app").replace(/\/$/, "");
const TOKEN = process.env.WORKER_TOKEN;
if (!TOKEN) {
  console.error("WORKER_TOKEN is missing");
  process.exit(1);
}

async function api(method, path, body) {
  const res = await fetch(SITE + path, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.error ?? ""}`);
  return data;
}

/** minimal JSON-schema check: types, required keys, no extra keys, enums */
function validate(v, s, at = "$") {
  const errs = [];
  if (s.enum && !s.enum.includes(v)) errs.push(`${at}: not one of ${JSON.stringify(s.enum)}`);
  if (s.type === "object") {
    if (!v || typeof v !== "object" || Array.isArray(v)) return [`${at}: expected object`];
    for (const k of s.required ?? []) if (!(k in v)) errs.push(`${at}.${k}: missing`);
    for (const k of Object.keys(v)) {
      if (!s.properties?.[k]) errs.push(`${at}.${k}: unexpected field`);
      else errs.push(...validate(v[k], s.properties[k], `${at}.${k}`));
    }
  } else if (s.type === "array") {
    if (!Array.isArray(v)) return [`${at}: expected array`];
    v.forEach((x, i) => errs.push(...validate(x, s.items, `${at}[${i}]`)));
  } else if (s.type === "string" && typeof v !== "string") errs.push(`${at}: expected string`);
  else if (s.type === "integer" && !Number.isInteger(v)) errs.push(`${at}: expected integer`);
  else if (s.type === "boolean" && typeof v !== "boolean") errs.push(`${at}: expected boolean`);
  return errs;
}

const [cmd, id, arg] = process.argv.slice(2);
const dir = (x) => `/tmp/spiral/${x}`;

if (cmd === "pending") {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jerusalem" }).format(new Date()));
  const scope = hour === 8 || hour === 20 ? "all" : "now";
  const { pending } = await api("GET", `/api/worker/pending?scope=${scope}`);
  console.log(`scope=${scope} pending=${pending.length}`);
  for (const p of pending) console.log(p);
} else if (cmd === "fetch") {
  const job = await api("GET", `/api/worker/job/${id}`);
  mkdirSync(dir(id), { recursive: true });
  writeFileSync(`${dir(id)}/system.md`, job.system);
  writeFileSync(`${dir(id)}/evidence.md`, job.prompt);
  writeFileSync(`${dir(id)}/schema.json`, JSON.stringify(job.schema, null, 1));
  console.log(`written to ${dir(id)}: system.md (instructions), evidence.md (the respondent's data), schema.json (output format)`);
} else if (cmd === "submit") {
  const result = JSON.parse(readFileSync(arg, "utf8"));
  const schema = JSON.parse(readFileSync(`${dir(id)}/schema.json`, "utf8"));
  const errs = validate(result, schema);
  if (errs.length) {
    console.error(`INVALID (${errs.length} problems), fix and submit again:\n` + errs.slice(0, 40).join("\n"));
    process.exit(2);
  }
  await api("POST", `/api/worker/job/${id}`, { result, engine: "claude-routine", model: process.env.ANALYSIS_MODEL || "claude-sonnet-5-5" });
  console.log("submitted");
} else if (cmd === "requeue") {
  await api("POST", `/api/worker/job/${id}`, { error: arg || "routine failed", engine: "claude-routine", requeue: true });
  console.log("requeued");
} else {
  console.log("usage: pending | fetch <id> | submit <id> <file> | requeue <id> <msg>");
}
