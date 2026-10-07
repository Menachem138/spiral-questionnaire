import { NextResponse } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "סיסמת מנהל לא הוגדרה בשרת (ADMIN_PASSWORD)" }, { status: 500 });
  }
  if (!checkPassword(String(password ?? ""))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "סיסמה שגויה" }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
