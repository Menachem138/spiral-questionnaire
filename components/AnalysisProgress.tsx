"use client";

import { useEffect, useState } from "react";
import type { StatusMeta } from "@/lib/store";

/** זמן ניתוח טיפוסי, להערכת ההתקדמות */
const TYPICAL_MIN = 6;

function minutesSince(iso: string | undefined, now: number) {
  return iso ? Math.max(0, Math.round((now - Date.parse(iso)) / 60_000)) : 0;
}

function hhmm(ms: number) {
  return new Date(ms).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" });
}

/** מחוון התקדמות לשלבי הניתוח: בתור -> נשלח -> בניתוח -> מוכן */
export function AnalysisProgress({
  meta,
  nextCheckAt,
  compact = false,
}: {
  meta: StatusMeta;
  /** הערכה מתי מנוע הניתוח יבדוק שוב את התור (ISO), אם ידוע */
  nextCheckAt?: string | null;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const steps = ["נשלח", "בניתוח", "מוכן"];
  let step = -1;
  let label = "";
  let tone = "text-muted";
  let bar: number | null = null;

  if (meta.status === "done") {
    step = 2;
    label = "✓ הניתוח מוכן";
    tone = "text-ok";
  } else if (meta.status === "running") {
    step = 1;
    const m = minutesSince(meta.startedAt, now);
    bar = Math.min(95, Math.round((m / TYPICAL_MIN) * 100));
    label = m > 20 ? `בניתוח כבר ${m} דק׳ (ארוך מהרגיל, יינסה שוב אם ייתקע)` : `בניתוח · ${m} מתוך כ-${TYPICAL_MIN} דק׳`;
    tone = m > 20 ? "text-danger" : "text-gold";
  } else if (meta.status === "queued" && meta.requestedAt) {
    step = 0;
    const waited = minutesSince(meta.requestedAt, now);
    const next = nextCheckAt ? Date.parse(nextCheckAt) : null;
    label =
      next && next > now
        ? `נשלח לניתוח · יתחיל בבדיקה הבאה (בערך ${hhmm(next)})`
        : `נשלח לניתוח לפני ${waited} דק׳ · ממתין למנוע הניתוח`;
    tone = waited > 75 ? "text-danger" : "text-gold";
  } else if (meta.status === "queued") {
    label = "בתור · ינותח ב-08:00 או ב-20:00, או לחצו נתח עכשיו";
  } else if (meta.status === "error") {
    label = "שגיאה בניתוח";
    tone = "text-danger";
  } else {
    label = "ללא ניתוח";
  }

  return (
    <div className={compact ? "min-w-48" : "w-full"}>
      <div className={`text-sm font-semibold ${tone}`} title={meta.error}>
        {label}
      </div>
      {step >= 0 && (
        <div className="mt-1.5 flex items-center gap-1" aria-hidden>
          {steps.map((s, i) => (
            <div key={s} className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${i < step || step === 2 ? "bg-ok" : i === step ? "bg-gold" : ""} ${i === step && meta.status === "queued" ? "animate-pulse" : ""}`}
                  style={{ width: i < step || step === 2 ? "100%" : i === step ? (bar !== null ? `${bar}%` : "100%") : "0%" }}
                />
              </div>
              {!compact && <div className="mt-1 text-center text-[11px] text-muted">{s}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
