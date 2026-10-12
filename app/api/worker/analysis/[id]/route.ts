import { NextResponse } from "next/server";
import { getAnalysis } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

/** קריאת ניתוח קיים (לבקרת איכות), בלי לשנות את מצבו */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const a = await getAnalysis(id);
  if (!a) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(a);
}
