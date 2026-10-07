"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SpiralMark } from "@/components/SpiralMark";

export default function LoginPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setErr((await res.json().catch(() => ({}))).error || "שגיאה");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={submit} className="card rise w-full max-w-sm p-8">
        <div className="mb-5 flex items-center gap-3">
          <SpiralMark size={40} />
          <div>
            <div className="font-display text-xl font-bold">ניהול השאלון</div>
            <div className="text-sm text-muted">כניסה למנהל הראשי</div>
          </div>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">סיסמה</span>
          <input className="field" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus dir="ltr" />
        </label>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
        <button className="btn btn-primary mt-5 w-full" disabled={busy || !pw}>
          {busy ? "נכנס..." : "כניסה"}
        </button>
      </form>
    </main>
  );
}
