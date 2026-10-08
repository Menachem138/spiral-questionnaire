import { after, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { analyzeResponse } from "@/lib/jobs";
import { getResponse, saveAnalysis } from "@/lib/store";

export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await getResponse(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!process.env.ANTHROPIC_API_KEY) {
    // אין מפתח API: המשימה חוזרת לתור, וה-worker של Claude Code יפיק אותה בריצה הבאה
    await saveAnalysis(id, { status: "queued", startedAt: new Date().toISOString() }, { now: true });
    return NextResponse.json({ ok: true, queued: true });
  }
  await saveAnalysis(id, { status: "running", startedAt: new Date().toISOString() });
  after(() => analyzeResponse(id));
  return NextResponse.json({ ok: true });
}
