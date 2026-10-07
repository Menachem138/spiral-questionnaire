import { after, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { score, validateAnswers } from "@/lib/engine/score";
import { analyzeResponse } from "@/lib/jobs";
import { getSettings, saveResponse, type Respondent } from "@/lib/store";

export const maxDuration = 300;

function cleanRespondent(input: unknown): Respondent {
  const r = (input ?? {}) as Record<string, unknown>;
  const name = String(r.name ?? "").trim().slice(0, 80);
  if (!name) throw new Error("נא למלא שם");
  const contact = String(r.contact ?? "").trim().slice(0, 120);
  const address = r.address === "m" || r.address === "f" ? r.address : "";
  return { name, contact, address };
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  let respondent: Respondent;
  let answers;
  try {
    respondent = cleanRespondent(body.respondent);
    answers = validateAnswers(body.answers);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "נתונים לא תקינים" }, { status: 400 });
  }

  const id = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
  const token = randomBytes(18).toString("base64url");
  const durationSec = typeof body.durationSec === "number" && body.durationSec > 0 ? Math.round(body.durationSec) : null;

  await saveResponse({
    id,
    token,
    createdAt: new Date().toISOString(),
    durationSec,
    respondent,
    answers,
    scoring: score(answers),
  });

  // הניתוח העמוק רץ ברקע אחרי שהמשיב כבר קיבל אישור
  after(() => analyzeResponse(id));

  const settings = await getSettings();
  return NextResponse.json({ id, token, showResults: settings.showResultsToRespondent });
}
