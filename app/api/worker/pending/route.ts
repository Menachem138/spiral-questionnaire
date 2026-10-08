import { NextResponse } from "next/server";
import { getAnalysis, listResponses } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

const STALE_MS = 20 * 60_000;

/** רשימת התשובות שממתינות לניתוח (חדשות, בתור, או ריצה שנתקעה) */
export async function GET(req: Request) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const all = await listResponses();
  const pending: string[] = [];
  for (const r of all) {
    const a = await getAnalysis(r.id);
    const stale = a?.status === "running" && Date.now() - Date.parse(a.startedAt) > STALE_MS;
    if (!a || a.status === "queued" || stale) pending.push(r.id);
  }
  return NextResponse.json({ pending: pending.reverse() });
}
