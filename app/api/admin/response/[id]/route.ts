import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { deleteResponse, getResponse, saveResponse } from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

/** עדכון: שיתוף התוצאה עם המשיב */
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const rec = await getResponse(id);
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.sharedWithRespondent === "boolean") rec.sharedWithRespondent = body.sharedWithRespondent;
  await saveResponse(rec);
  return NextResponse.json({ ok: true, sharedWithRespondent: rec.sharedWithRespondent ?? false });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  await deleteResponse(id);
  return NextResponse.json({ ok: true });
}
