import { NextResponse } from "next/server";
import { SYSTEM_PROMPT, buildEvidencePack } from "@/lib/engine/analysis";
import { ANALYSIS_JSON_SCHEMA, type AnalysisResult } from "@/lib/engine/analysis-schema";
import { getAnalysis, getResponse, saveAnalysis } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

type Ctx = { params: Promise<{ id: string }> };

/** ה-worker לוקח משימה: מקבל את ההנחיה, חבילת הראיות והסכמה, והמשימה מסומנת כרצה */
export async function GET(req: Request, { params }: Ctx) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getResponse(id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  await saveAnalysis(id, { status: "running", startedAt: new Date().toISOString() });
  return NextResponse.json({ id, system: SYSTEM_PROMPT, prompt: buildEvidencePack(rec), schema: ANALYSIS_JSON_SCHEMA });
}

const REQUIRED = (ANALYSIS_JSON_SCHEMA as { required: string[] }).required;

/** ה-worker מחזיר תוצאה (או שגיאה) */
export async function POST(req: Request, { params }: Ctx) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await getResponse(id))) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as {
    result?: AnalysisResult;
    error?: string;
    engine?: string;
    model?: string;
    usage?: { input: number; output: number };
    requeue?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const prev = await getAnalysis(id);
  const startedAt = prev?.startedAt ?? new Date().toISOString();

  if (body.requeue) {
    await saveAnalysis(id, { status: "queued", startedAt: new Date().toISOString(), error: String(body.error ?? "").slice(0, 300) });
    return NextResponse.json({ ok: true });
  }
  if (body.error || !body.result) {
    await saveAnalysis(id, {
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      error: String(body.error ?? "no result").slice(0, 500),
      engine: body.engine,
    });
    return NextResponse.json({ ok: true });
  }
  const missing = REQUIRED.filter((k) => !(k in (body.result as object)));
  if (missing.length) return NextResponse.json({ error: `missing fields: ${missing.join(", ")}` }, { status: 422 });

  await saveAnalysis(id, {
    status: "done",
    startedAt,
    finishedAt: new Date().toISOString(),
    result: body.result,
    model: body.model,
    engine: body.engine,
    usage: body.usage,
  });
  return NextResponse.json({ ok: true });
}
