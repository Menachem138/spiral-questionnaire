import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { requestAllQueuedNow, requestNow } from "@/lib/store";

/** המנהל מבקש לנתח עכשיו: שאלונים נבחרים ({ids}) או את כל הממתינים */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 200) : null;
  const count = ids ? await requestNow(ids) : await requestAllQueuedNow();
  return NextResponse.json({ ok: true, count });
}
