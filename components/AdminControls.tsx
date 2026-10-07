"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-ghost px-4 py-2 text-sm"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
      }}
    >
      יציאה
    </button>
  );
}

export function ShowResultsToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ showResultsToRespondent: !on }),
          });
          if (res.ok) setOn(!on);
          setBusy(false);
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all ${on ? "start-[1.4rem]" : "start-0.5"}`}
        />
      </button>
      <span>
        {on ? "המשיבים רואים את התוצאה שלהם מיד בסיום" : "המשיבים רואים רק דף תודה (התוצאות אצלך בלבד)"}
      </span>
    </label>
  );
}

export function ResponseActions({
  id,
  token,
  shared,
  analysisStatus,
  hasKey,
}: {
  id: string;
  token: string;
  shared: boolean;
  analysisStatus: string;
  hasKey: boolean;
}) {
  const router = useRouter();
  const [isShared, setShared] = useState(shared);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/done/${id}?k=${token}` : "";

  async function regenerate() {
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/admin/analyze/${id}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMsg(data.error || "שגיאה");
    router.refresh();
  }

  async function toggleShare() {
    const res = await fetch(`/api/admin/response/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sharedWithRespondent: !isShared }),
    });
    if (res.ok) setShared(!isShared);
  }

  async function remove() {
    if (!confirm("למחוק את התשובה הזו לצמיתות? אי אפשר לשחזר.")) return;
    const res = await fetch(`/api/admin/response/${id}`, { method: "DELETE" });
    if (res.ok) router.replace("/admin");
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary px-4 py-2 text-sm" onClick={regenerate} disabled={busy || analysisStatus === "running" || !hasKey}>
          {analysisStatus === "none" ? "הפקת ניתוח מלא" : "הפקת הניתוח מחדש"}
        </button>
        <button className="btn btn-ghost px-4 py-2 text-sm" onClick={toggleShare}>
          {isShared ? "ביטול השיתוף עם המשיב" : "אפשר למשיב לראות את התוצאה"}
        </button>
        {isShared && (
          <button
            className="btn btn-ghost px-4 py-2 text-sm"
            onClick={async () => {
              await navigator.clipboard.writeText(link);
              setMsg("הקישור הועתק");
            }}
          >
            העתקת קישור לתוצאה
          </button>
        )}
        <button className="btn btn-ghost px-4 py-2 text-sm text-danger" onClick={remove}>
          מחיקה
        </button>
      </div>
      {!hasKey && (
        <p className="text-sm text-muted">
          הניתוח העמוק יופעל ברגע שיוגדר מפתח ה-API של Anthropic בשרת. עד אז מוצגים הציונים והפרופילים המחושבים.
        </p>
      )}
      {msg && <p className="text-sm text-ink-2">{msg}</p>}
    </div>
  );
}
