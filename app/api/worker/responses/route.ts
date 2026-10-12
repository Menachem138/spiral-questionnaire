import { NextResponse } from "next/server";
import { listAnalysisMeta, listResponses } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

/** רשימת המשיבים ומצב הניתוח שלהם (לכלי התפעול של המנהל) */
export async function GET(req: Request) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const all = await listResponses();
  const meta = await listAnalysisMeta(all.map((r) => r.id));
  return NextResponse.json({
    responses: all.map((r) => ({ id: r.id, name: r.respondent.name, createdAt: r.createdAt, status: meta[r.id].status })),
  });
}
