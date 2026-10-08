import { NextResponse } from "next/server";
import { markWorkerSeen, pendingJobs } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

/**
 * רשימת המשימות ל-worker.
 * ?scope=now -> רק מה שהמנהל ביקש לנתח עכשיו (נבדק כל 2 דקות, זול מאוד)
 * ?scope=all -> כל התור (ריצות הבוקר והערב)
 */
export async function GET(req: Request) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const scope = new URL(req.url).searchParams.get("scope") === "all" ? "all" : "now";
  await markWorkerSeen();
  return NextResponse.json({ scope, pending: await pendingJobs(scope) });
}
