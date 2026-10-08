// One-time migration: copies responses, analyses and settings from Vercel Blob to Upstash Redis.
// Run with production env vars: node --env-file=<file> scripts/migrate-blob-to-redis.mjs
import { get, list } from "@vercel/blob";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function readJson(pathname) {
  const res = await get(pathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return new Response(res.stream).json();
}

const { blobs } = await list({ limit: 1000 });
let responses = 0;
let analyses = 0;
for (const b of blobs) {
  const m = b.pathname.match(/^(responses|analyses)\/(.+)\.json$/);
  if (m) {
    const data = await readJson(b.pathname);
    if (!data) continue;
    if (m[1] === "responses") {
      await redis.set(`resp:${m[2]}`, data);
      await redis.zadd("responses", { score: Date.parse(data.createdAt), member: m[2] });
      responses++;
    } else {
      await redis.set(`ana:${m[2]}`, data);
      await redis.hset("status", { [m[2]]: data.status });
      if (data.status === "queued") await redis.sadd("queue", m[2]);
      analyses++;
    }
  } else if (b.pathname === "settings/settings.json") {
    await redis.set("settings", await readJson(b.pathname));
  }
}
// responses without any analysis record go to the queue
const ids = await redis.zrange("responses", 0, -1);
const status = (await redis.hgetall("status")) ?? {};
for (const id of ids) {
  if (!status[id]) {
    await redis.hset("status", { [id]: "queued" });
    await redis.set(`ana:${id}`, { status: "queued", startedAt: new Date().toISOString() });
    await redis.sadd("queue", id);
  }
}
console.log(`migrated ${responses} responses, ${analyses} analyses; queue:`, await redis.smembers("queue"));
