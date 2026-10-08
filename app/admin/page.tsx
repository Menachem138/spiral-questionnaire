import Link from "next/link";
import { redirect } from "next/navigation";
import { AnalyzeAllButton, LogoutButton, ShowResultsToggle } from "@/components/AdminControls";
import { ColorChip } from "@/components/Report";
import { SpiralMark } from "@/components/SpiralMark";
import { isAdmin } from "@/lib/auth";
import { COLOR_META, CONFIDENCE_HE, COLORS } from "@/lib/colors";
import { getSettings, getWorkerSeen, listAnalysisStatuses, listResponses } from "@/lib/store";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "ניתוח מוכן", cls: "text-ok" },
  running: { label: "בכתיבה...", cls: "text-gold" },
  queued: { label: "ממתין לניתוח", cls: "text-gold" },
  error: { label: "שגיאה", cls: "text-danger" },
  none: { label: "ללא ניתוח", cls: "text-muted" },
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { q = "" } = await searchParams;
  const [all, settings, workerSeen] = await Promise.all([listResponses(), getSettings(), getWorkerSeen()]);
  const rows = q ? all.filter((r) => `${r.respondent.name} ${r.respondent.contact}`.includes(q)) : all;
  const statuses = await listAnalysisStatuses(all.map((r) => r.id));
  const queuedCount = all.filter((r) => statuses[r.id] === "queued").length;
  const seenMin = workerSeen ? Math.round((Date.parse(new Date().toISOString()) - Date.parse(workerSeen)) / 60_000) : null;

  const dist = Object.fromEntries(COLORS.map((c) => [c, 0])) as Record<string, number>;
  all.forEach((r) => dist[r.scoring.dominant]++);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SpiralMark size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold">ניהול השאלון</h1>
            <div className="text-sm text-muted">{all.length} שאלונים מולאו</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" className="btn btn-ghost px-4 py-2 text-sm">
            לשאלון ↗
          </a>
          <a href="/api/admin/export" className="btn btn-ghost px-4 py-2 text-sm">
            ייצוא לאקסל
          </a>
          <LogoutButton />
        </div>
      </header>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="card p-5">
          <div className="mb-3 text-sm font-bold">הגדרות</div>
          <ShowResultsToggle initial={settings.showResultsToRespondent} />
          {process.env.ANTHROPIC_API_KEY ? (
            <p className="mt-4 rounded-xl bg-bg-2/70 px-3 py-2 text-sm text-ink-2">מנוע הניתוח רץ בשרת עם מפתח API.</p>
          ) : (
            <div className="mt-4 space-y-3 rounded-xl bg-bg-2/70 px-3 py-3 text-sm text-ink-2">
              <p>
                הניתוח רץ דרך Claude Code במחשב שלך (מנוי): אוטומטית כל יום ב-08:00 וב-20:00, או תוך כ-2 דקות כשלוחצים
                &quot;נתח עכשיו&quot;.
              </p>
              <p className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${seenMin !== null && seenMin <= 5 ? "bg-ok" : "bg-danger"}`}
                />
                {seenMin === null
                  ? "המחשב עדיין לא התחבר לאתר"
                  : seenMin <= 5
                    ? "המחשב שלך מחובר ומוכן לנתח"
                    : `המחשב לא היה מחובר ב-${seenMin < 120 ? `${seenMin} הדקות` : `${Math.round(seenMin / 60)} השעות`} האחרונות (כנראה כבוי או ישן)`}
              </p>
              <AnalyzeAllButton count={queuedCount} />
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="mb-3 text-sm font-bold">התפלגות הצבע הדומיננטי</div>
          <div className="flex flex-wrap gap-2">
            {COLORS.filter((c) => dist[c] > 0).map((c) => (
              <span key={c} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR_META[c].hex }} />
                {COLOR_META[c].he} <span className="text-muted">{dist[c]}</span>
              </span>
            ))}
            {all.length === 0 && <span className="text-sm text-muted">עדיין אין תשובות</span>}
          </div>
        </div>
      </div>

      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="חיפוש לפי שם או פרטי קשר" className="field max-w-sm" />
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-bg-2/60 text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">שם</th>
                <th className="px-4 py-3 text-start font-semibold">תאריך</th>
                <th className="px-4 py-3 text-start font-semibold">שלוש המערכות המובילות</th>
                <th className="px-4 py-3 text-start font-semibold">ביטחון</th>
                <th className="px-4 py-3 text-start font-semibold">ניתוח</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = STATUS[statuses[r.id]] ?? STATUS.none;
                return (
                  <tr key={r.id} className="border-t border-line hover:bg-accent-soft/40">
                    <td className="px-4 py-3">
                      <Link href={`/admin/r/${r.id}`} className="font-semibold hover:underline">
                        {r.respondent.name}
                      </Link>
                      {r.respondent.contact && <div className="text-xs text-muted" dir="auto">{r.respondent.contact}</div>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-2">
                      {new Date(r.createdAt).toLocaleString("he-IL", {
                        timeZone: "Asia/Jerusalem",
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {r.scoring.colors.slice(0, 3).map((c) => (
                          <ColorChip key={c.color} color={c.color} pct={Math.round(c.pct)} size="sm" />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{CONFIDENCE_HE[r.scoring.confidence]}</td>
                    <td className={`px-4 py-3 whitespace-nowrap font-semibold ${st.cls}`}>{st.label}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    {q ? "לא נמצאו תוצאות" : "עדיין אין שאלונים. שתפו את הקישור לשאלון כדי להתחיל."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
