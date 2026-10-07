import "server-only";
import { del, get, list, put } from "@vercel/blob";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Answers, Scoring } from "./engine/score";
import type { AnalysisResult } from "./engine/analysis-schema";

export interface Respondent {
  name: string;
  contact: string;
  /** לשון פנייה בניתוח */
  address: "m" | "f" | "";
}

export interface ResponseRecord {
  id: string;
  /** מפתח סודי לקישור התוצאה של המשיב */
  token: string;
  createdAt: string;
  durationSec: number | null;
  respondent: Respondent;
  answers: Answers;
  scoring: Scoring;
  /** האם מנהל אפשר למשיב לראות את התוצאה שלו (גם כשההגדרה הכללית כבויה) */
  sharedWithRespondent?: boolean;
}

export interface AnalysisRecord {
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  model?: string;
  result?: AnalysisResult;
  error?: string;
  usage?: { input: number; output: number };
}

export interface Settings {
  /** האם המשיב רואה את התוצאה שלו מיד בסיום */
  showResultsToRespondent: boolean;
}

const DEFAULT_SETTINGS: Settings = { showResultsToRespondent: false };

/* ---------------- backend: Vercel Blob (private) or local files ---------------- */

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const LOCAL_DIR = path.join(process.cwd(), ".data");

async function writeJson(pathname: string, data: unknown) {
  const body = JSON.stringify(data);
  if (blobEnabled()) {
    await put(pathname, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return;
  }
  const file = path.join(LOCAL_DIR, pathname);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body, "utf8");
}

async function readJson<T>(pathname: string): Promise<T | null> {
  if (blobEnabled()) {
    const res = await get(pathname, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return (await new Response(res.stream).json()) as T;
  }
  try {
    return JSON.parse(await readFile(path.join(LOCAL_DIR, pathname), "utf8")) as T;
  } catch {
    return null;
  }
}

async function listPaths(prefix: string): Promise<string[]> {
  if (blobEnabled()) {
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      out.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out;
  }
  try {
    const files = await readdir(path.join(LOCAL_DIR, prefix));
    return files.map((f) => prefix + f);
  } catch {
    return [];
  }
}

async function removePaths(pathnames: string[]) {
  if (!pathnames.length) return;
  if (blobEnabled()) {
    await del(pathnames);
    return;
  }
  await Promise.all(pathnames.map((p) => rm(path.join(LOCAL_DIR, p), { force: true })));
}

/* ---------------- domain API ---------------- */

const SAFE_ID = /^[a-z0-9-]{6,64}$/;
const assertId = (id: string) => {
  if (!SAFE_ID.test(id)) throw new Error("bad id");
};

export async function saveResponse(rec: ResponseRecord) {
  assertId(rec.id);
  await writeJson(`responses/${rec.id}.json`, rec);
}

export async function getResponse(id: string) {
  if (!SAFE_ID.test(id)) return null;
  return readJson<ResponseRecord>(`responses/${id}.json`);
}

export async function listResponses(): Promise<ResponseRecord[]> {
  const paths = (await listPaths("responses/")).filter((p) => p.endsWith(".json"));
  const recs = await mapLimit(paths, 12, (p) => readJson<ResponseRecord>(p));
  return recs
    .filter((r): r is ResponseRecord => Boolean(r))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteResponse(id: string) {
  assertId(id);
  await removePaths([`responses/${id}.json`, `analyses/${id}.json`, `status/${id}.json`]);
}

export async function saveAnalysis(id: string, rec: AnalysisRecord) {
  assertId(id);
  await writeJson(`analyses/${id}.json`, rec);
  await writeJson(`status/${id}.json`, { status: rec.status });
}

export async function getAnalysis(id: string) {
  if (!SAFE_ID.test(id)) return null;
  return readJson<AnalysisRecord>(`analyses/${id}.json`);
}

/** סטטוס הניתוח של כל התשובות (לטבלה בדף הניהול), בלי לטעון את הטקסט המלא */
export async function listAnalysisStatuses(ids: string[]) {
  const recs = await mapLimit(ids, 12, (id) =>
    readJson<{ status: AnalysisRecord["status"] }>(`status/${id}.json`),
  );
  const out: Record<string, AnalysisRecord["status"] | "none"> = {};
  ids.forEach((id, i) => (out[id] = recs[i]?.status ?? "none"));
  return out;
}

export async function getSettings(): Promise<Settings> {
  const s = await readJson<Partial<Settings>>("settings/settings.json");
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(s: Settings) {
  await writeJson("settings/settings.json", s);
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}
