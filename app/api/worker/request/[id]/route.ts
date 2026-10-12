import { NextResponse } from "next/server";
import { requestNow } from "@/lib/store";
import { isWorker } from "@/lib/worker-auth";

/** מסמן שאלון ל"נתח עכשיו" (כמו הכפתור בדף הניהול) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isWorker(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ ok: true, count: await requestNow([id]) });
}
