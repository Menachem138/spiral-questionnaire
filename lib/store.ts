import "server-only";
import { Redis } from "@upstash/redis";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { score, SCORING_VERSION, type Answers, type Scoring } from "./engine/score";
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

export type AnalysisStatus = "queued" | "running" | "done" | "error";

export interface AnalysisRecord {
  /** queued = ממתין ל-worker של Claude Code שרץ אצל המנהל */
  status: AnalysisStatus;
  startedAt: string;
  finishedAt?: string;
  model?: string;
  result?: AnalysisResult;
  error?: string;
  usage?: { input: number; output: number };
  /** איזה מנוע הפיק את הניתוח: claude-code / codex / api */
  engine?: string;
}

export interface Settings {
  /** האם המשיב רואה את התוצאה שלו מיד בסיום */
  showResultsToRespondent: boolean;
}

const DEFAULT_SETTINGS: Settings = { showResultsToRespondent: false };

/* ---------------- backend: Upstash Redis, or a local JSON file in development ---------------- */

interface KV {
  get<T>(key: string): Promise<T | null>;
  mget<T>(keys: string[]): Promise<(T | null)[]>;
  set(key: string, value: unknown): Promise<void>;
  del(...keys: string[]): Promise<void>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrevmembers(key: string): Promise<string[]>;
  zrem(key: string, member: string): Promise<void>;
  hset(key: string, field: string, value: string): Promise<void>;
  hdel(key: string, field: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  sadd(key: string, ...members: string[]): Promise<void>;
  srem(key: string, member: string): Promise<void>;
  smembers(key: string): Promise<string[]>;
}

function redisKV(): KV {
  const redis = new Redis({
    url: (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)!,
    token: (process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN)!,
  });
  return {
    get: (k) => redis.get(k),
    mget: async (keys) => (keys.length ? redis.mget(...keys) : []),
    set: async (k, v) => void (await redis.set(k, v)),
    del: async (...keys) => void (keys.length && (await redis.del(...keys))),
    zadd: async (k, s, m) => void (await redis.zadd(k, { score: s, member: m })),
    zrevmembers: (k) => redis.zrange<string[]>(k, 0, -1, { rev: true }),
    zrem: async (k, m) => void (await redis.zrem(k, m)),
    hset: async (k, f, v) => void (await redis.hset(k, { [f]: v })),
    hdel: async (k, f) => void (await redis.hdel(k, f)),
    hgetall: async (k) => (await redis.hgetall<Record<string, string>>(k)) ?? {},
    sadd: async (k, ...m) => void (m.length && (await redis.sadd(k, m[0], ...m.slice(1)))),
    srem: async (k, m) => void (await redis.srem(k, m)),
    smembers: (k) => redis.smembers(k),
  };
}

/** development fallback: one JSON file, same semantics */
function fileKV(): KV {
  const file = path.join(process.cwd(), ".data", "kv.json");
  type Db = {
    kv: Record<string, unknown>;
    z: Record<string, Record<string, number>>;
    h: Record<string, Record<string, string>>;
    s: Record<string, string[]>;
  };
  const load = async (): Promise<Db> => {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      return { kv: {}, z: {}, h: {}, s: {} };
    }
  };
  const mut = async (fn: (db: Db) => void) => {
    const db = await load();
    fn(db);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(db));
  };
  return {
    get: async (k) => ((await load()).kv[k] as never) ?? null,
    mget: async (keys) => {
      const db = await load();
      return keys.map((k) => (db.kv[k] as never) ?? null);
    },
    set: (k, v) => mut((db) => void (db.kv[k] = v)),
    del: (...keys) => mut((db) => keys.forEach((k) => delete db.kv[k])),
    zadd: (k, s, m) => mut((db) => void ((db.z[k] ??= {})[m] = s)),
    zrevmembers: async (k) =>
      Object.entries((await load()).z[k] ?? {})
        .sort((a, b) => b[1] - a[1])
        .map(([m]) => m),
    zrem: (k, m) => mut((db) => void delete (db.z[k] ?? {})[m]),
    hset: (k, f, v) => mut((db) => void ((db.h[k] ??= {})[f] = v)),
    hdel: (k, f) => mut((db) => void delete (db.h[k] ?? {})[f]),
    hgetall: async (k) => (await load()).h[k] ?? {},
    sadd: (k, ...m) => mut((db) => void (db.s[k] = [...new Set([...(db.s[k] ?? []), ...m])])),
    srem: (k, m) => mut((db) => void (db.s[k] = (db.s[k] ?? []).filter((x) => x !== m))),
    smembers: async (k) => (await load()).s[k] ?? [],
  };
}

let _kv: KV | null = null;
const kv = () => {
  if (_kv) return _kv;
  if (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL) return (_kv = redisKV());
  if (process.env.VERCEL) throw new Error("Redis is not configured (KV_REST_API_URL / KV_REST_API_TOKEN)");
  return (_kv = fileKV());
};

const K = {
  resp: (id: string) => `resp:${id}`,
  ana: (id: string) => `ana:${id}`,
  responses: "responses",
  status: "status",
  queue: "queue",
  queueNow: "queue:now",
  settings: "settings",
  workerSeen: "worker:seen",
};

/* ---------------- domain API ---------------- */

const SAFE_ID = /^[a-z0-9-]{6,64}$/;
const assertId = (id: string) => {
  if (!SAFE_ID.test(id)) throw new Error("bad id");
};

/** תשובות שנשמרו עם גרסת ניקוד ישנה מחושבות מחדש לפי המפתח הנוכחי */
function freshen(rec: ResponseRecord | null): ResponseRecord | null {
  if (rec && rec.scoring?.version !== SCORING_VERSION) rec.scoring = score(rec.answers);
  return rec;
}

export async function saveResponse(rec: ResponseRecord) {
  assertId(rec.id);
  await kv().set(K.resp(rec.id), rec);
  await kv().zadd(K.responses, Date.parse(rec.createdAt), rec.id);
}

export async function getResponse(id: string) {
  if (!SAFE_ID.test(id)) return null;
  return freshen(await kv().get<ResponseRecord>(K.resp(id)));
}

export async function listResponses(): Promise<ResponseRecord[]> {
  const ids = await kv().zrevmembers(K.responses);
  const recs = await kv().mget<ResponseRecord>(ids.map(K.resp));
  return recs.map(freshen).filter((r): r is ResponseRecord => Boolean(r));
}

export async function deleteResponse(id: string) {
  assertId(id);
  await kv().del(K.resp(id), K.ana(id));
  await kv().zrem(K.responses, id);
  await kv().hdel(K.status, id);
  await kv().srem(K.queue, id);
  await kv().srem(K.queueNow, id);
}

/**
 * שמירת מצב ניתוח. התור מתעדכן לפי הסטטוס:
 * queued -> נכנס לתור (ולתור "עכשיו" אם המנהל ביקש), אחרת יוצא מהתורים.
 */
export async function saveAnalysis(id: string, rec: AnalysisRecord, opts: { now?: boolean } = {}) {
  assertId(id);
  await kv().set(K.ana(id), rec);
  await kv().hset(K.status, id, rec.status);
  if (rec.status === "queued") {
    await kv().sadd(K.queue, id);
    if (opts.now) await kv().sadd(K.queueNow, id);
  } else {
    await kv().srem(K.queue, id);
    await kv().srem(K.queueNow, id);
  }
}

export async function getAnalysis(id: string) {
  if (!SAFE_ID.test(id)) return null;
  return kv().get<AnalysisRecord>(K.ana(id));
}

/** סטטוס הניתוח של כל התשובות (פקודה אחת) */
export async function listAnalysisStatuses(ids: string[]) {
  const all = await kv().hgetall(K.status);
  const out: Record<string, AnalysisStatus | "none"> = {};
  for (const id of ids) out[id] = (all[id] as AnalysisStatus) ?? "none";
  return out;
}

/** המנהל ביקש לנתח עכשיו את כל מה שממתין */
export async function requestAllQueuedNow() {
  const q = await kv().smembers(K.queue);
  if (q.length) await kv().sadd(K.queueNow, ...q);
  return q.length;
}

const STALE_MS = 20 * 60_000;

/**
 * משימות ל-worker. scope=now: רק מה שהמנהל ביקש עכשיו. scope=all: כל התור
 * (בריצות הבוקר והערב), כולל ריצות שנתקעו.
 */
export async function pendingJobs(scope: "now" | "all") {
  if (scope === "now") return kv().smembers(K.queueNow);
  const queued = await kv().smembers(K.queue);
  const statuses = await kv().hgetall(K.status);
  const running = Object.entries(statuses)
    .filter(([, s]) => s === "running")
    .map(([id]) => id);
  const anas = await kv().mget<AnalysisRecord>(running.map(K.ana));
  const stale = running.filter((_, i) => {
    const a = anas[i];
    return a && Date.now() - Date.parse(a.startedAt) > STALE_MS;
  });
  return [...new Set([...queued, ...stale])];
}

export async function markWorkerSeen() {
  await kv().set(K.workerSeen, new Date().toISOString());
}

export async function getWorkerSeen() {
  return kv().get<string>(K.workerSeen);
}

export async function getSettings(): Promise<Settings> {
  const s = await kv().get<Partial<Settings>>(K.settings);
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}

export async function saveSettings(s: Settings) {
  await kv().set(K.settings, s);
}
