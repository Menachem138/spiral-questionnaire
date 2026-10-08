import { get, list } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { isWorker } from "@/lib/worker-auth";

/** One-time migration from Vercel Blob to Upstash Redis (runs on the server). Remove after use. */
export async function POST(req: Request) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
  const readJson = async (pathname: string) => {
    const res = await get(pathname, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return new Response(res.stream).json();
  };
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
  const ids = await redis.zrange<string[]>("responses", 0, -1);
  const status = (await redis.hgetall<Record<string, string>>("status")) ?? {};
  for (const id of ids) {
    if (!status[id]) {
      await redis.hset("status", { [id]: "queued" });
      await redis.set(`ana:${id}`, { status: "queued", startedAt: new Date().toISOString() });
      await redis.sadd("queue", id);
    }
  }
  return NextResponse.json({ responses, analyses, queue: await redis.smembers("queue") });
}
