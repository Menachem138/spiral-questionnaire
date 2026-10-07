import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/store";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const cur = await getSettings();
  const next = {
    ...cur,
    ...(typeof body.showResultsToRespondent === "boolean" ? { showResultsToRespondent: body.showResultsToRespondent } : {}),
  };
  await saveSettings(next);
  return NextResponse.json(next);
}
