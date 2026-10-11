"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COLOR_META, type Color } from "@/lib/colors";
import type { StatusMeta } from "@/lib/store";
import { AnalysisProgress } from "./AnalysisProgress";

export interface Row {
  id: string;
  name: string;
  contact: string;
  date: string;
  top3: { color: Color; pct: number }[];
  confidence: string;
  meta: StatusMeta;
}

export default function ResponsesTable({ rows, nextCheckAt }: { rows: Row[]; nextCheckAt: string | null }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const selectable = (r: Row) => r.meta.status !== "running" && !(r.meta.status === "queued" && r.meta.requestedAt);
  const active = useMemo(
    () => rows.some((r) => r.meta.status === "running" || (r.meta.status === "queued" && r.meta.requestedAt)),
    [rows],
  );

  // כשיש ניתוח בדרך, הטבלה מתעדכנת לבד
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [active, router]);

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  async function analyze(ids: string[]) {
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/analyze-all", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setPicked(new Set());
    setMsg(res.ok ? `נשלחו ${data.count} שאלונים לניתוח. ההתקדמות מופיעה בטבלה.` : "שגיאה בשליחה");
    router.refresh();
  }

  const pickable = rows.filter(selectable);
  const allPicked = pickable.length > 0 && pickable.every((r) => picked.has(r.id));

  return (
    <>
      <div className="mb-3 flex min-h-10 flex-wrap items-center gap-3">
        <button
          className="btn btn-primary px-4 py-2 text-sm"
          disabled={busy || picked.size === 0}
          onClick={() => analyze([...picked])}
        >
          נתח עכשיו את הנבחרים ({picked.size})
        </button>
        {msg && <span className="text-sm text-ink-2">{msg}</span>}
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-bg-2/60 text-muted">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="בחירת כולם"
                    checked={allPicked}
                    onChange={() => setPicked(allPicked ? new Set() : new Set(pickable.map((r) => r.id)))}
                  />
                </th>
                <th className="px-4 py-3 text-start font-semibold">שם</th>
                <th className="px-4 py-3 text-start font-semibold">תאריך</th>
                <th className="px-4 py-3 text-start font-semibold">שלוש המערכות המובילות</th>
                <th className="px-4 py-3 text-start font-semibold">ביטחון</th>
                <th className="px-4 py-3 text-start font-semibold">מצב הניתוח</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top hover:bg-accent-soft/40">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={`בחירת ${r.name}`}
                      disabled={!selectable(r)}
                      checked={picked.has(r.id)}
                      onChange={() => toggle(r.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/r/${r.id}`} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    {r.contact && (
                      <div className="text-xs text-muted" dir="auto">
                        {r.contact}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.top3.map((c) => (
                        <span
                          key={c.color}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ background: COLOR_META[c.color].hex }} />
                          {COLOR_META[c.color].he}
                          <span className="font-normal text-muted">{c.pct}%</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{r.confidence}</td>
                  <td className="px-4 py-3">
                    <AnalysisProgress meta={r.meta} nextCheckAt={nextCheckAt} compact />
                    {selectable(r) && (
                      <button
                        className="mt-1.5 text-xs font-semibold text-accent hover:underline disabled:opacity-40"
                        disabled={busy}
                        onClick={() => analyze([r.id])}
                      >
                        {r.meta.status === "done" ? "נתח מחדש" : "נתח עכשיו"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    עדיין אין שאלונים. שתפו את הקישור לשאלון כדי להתחיל.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
