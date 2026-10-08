import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { requestAllQueuedNow } from "@/lib/store";

/** המנהל מבקש לנתח עכשיו את כל השאלונים שממתינים בתור */
export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const count = await requestAllQueuedNow();
  return NextResponse.json({ ok: true, count });
}
