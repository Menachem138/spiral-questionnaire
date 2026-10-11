import { redirect } from "next/navigation";
import { AnalyzeAllButton, LogoutButton, ShowResultsToggle } from "@/components/AdminControls";
import ResponsesTable, { type Row } from "@/components/ResponsesTable";
import { SpiralMark } from "@/components/SpiralMark";
import { isAdmin } from "@/lib/auth";
import { COLOR_META, CONFIDENCE_HE, COLORS } from "@/lib/colors";
import { getSettings, getWorkerIssue, getWorkerSeen, listAnalysisMeta, listResponses } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { q = "" } = await searchParams;
  const [all, settings, workerSeen, workerIssue] = await Promise.all([
    listResponses(),
    getSettings(),
    getWorkerSeen(),
    getWorkerIssue(),
  ]);
  const filtered = q ? all.filter((r) => `${r.respondent.name} ${r.respondent.contact}`.includes(q)) : all;
  const meta = await listAnalysisMeta(all.map((r) => r.id));
  const nowMs = Date.parse(new Date().toISOString());
  const queuedCount = all.filter((r) => meta[r.id].status === "queued" && !meta[r.id].requestedAt).length;
  const seenMin = workerSeen ? Math.round((nowMs - Date.parse(workerSeen)) / 60_000) : null;
  const nextCheckAt = workerSeen && seenMin !== null && seenMin < 120 ? new Date(Date.parse(workerSeen) + 60 * 60_000).toISOString() : null;

  // בדיקת תקינות: מה עלול למנוע מהניתוחים לרוץ עכשיו
  const issues: string[] = [];
  if (!process.env.ANTHROPIC_API_KEY) {
    if (seenMin === null)
      issues.push("מנוע הניתוח (הרוטינה בענן של Claude) עוד לא הצליח להתחבר לאתר אף פעם. הסיבה הסבירה: סביבת הענן חוסמת את כתובת האתר. צריך להוסיף את spiral-questionnaire.vercel.app להרשאות הרשת של הסביבה ב-claude.ai/code.");
    else if (seenMin > 75)
      issues.push(`מנוע הניתוח לא התחבר לאתר כבר ${seenMin < 180 ? `${seenMin} דקות` : `${Math.round(seenMin / 60)} שעות`} (הוא אמור לבדוק כל שעה). כדאי לבדוק את הרוטינה ב-claude.ai/code/routines.`);
  }
  const stuckReq = all.filter((r) => meta[r.id].status === "queued" && meta[r.id].requestedAt && nowMs - Date.parse(meta[r.id].requestedAt!) > 75 * 60_000);
  if (stuckReq.length) issues.push(`${stuckReq.length} שאלונים נשלחו לניתוח לפני יותר משעה ועדיין לא התחילו.`);
  const errored = all.filter((r) => meta[r.id].status === "error");
  if (errored.length) issues.push(`${errored.length} ניתוחים נכשלו. אפשר לשלוח אותם שוב עם "נתח מחדש".`);
  if (workerIssue && nowMs - Date.parse(workerIssue.at) < 24 * 3600_000)
    issues.push(`דיווח אחרון ממנוע הניתוח: ${workerIssue.message}`);

  const rows: Row[] = filtered.map((r) => ({
    id: r.id,
    name: r.respondent.name,
    contact: r.respondent.contact,
    date: new Date(r.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" }),
    top3: r.scoring.colors.slice(0, 3).map((c) => ({ color: c.color, pct: Math.round(c.pct) })),
    confidence: CONFIDENCE_HE[r.scoring.confidence],
    meta: meta[r.id],
  }));

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
                הניתוח רץ בענן של Claude על המנוי שלך, בלי תלות במחשב: כל יום ב-08:00 וב-20:00 הוא מנתח את כל התור,
                ובכל שעה הוא בודק אם ביקשת &quot;נתח עכשיו&quot;.
              </p>
              <p className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${issues.length ? "bg-danger" : "bg-ok"}`} />
                {seenMin === null
                  ? "מנוע הניתוח עוד לא בדק את התור"
                  : `בדיקה אחרונה של מנוע הניתוח: לפני ${seenMin < 120 ? `${seenMin} דק׳` : `${Math.round(seenMin / 60)} שעות`}`}
                {nextCheckAt && Date.parse(nextCheckAt) > nowMs && (
                  <span className="text-muted">
                    {" "}
                    · הבדיקה הבאה בערך ב-
                    {new Date(nextCheckAt).toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </p>
              {issues.length > 0 ? (
                <ul className="space-y-1.5 rounded-lg bg-danger/10 px-3 py-2 text-danger">
                  {issues.map((m, i) => (
                    <li key={i}>⚠ {m}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-ok">✓ לא זוהו בעיות שמונעות ניתוחים</p>
              )}
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

      <ResponsesTable rows={rows} nextCheckAt={nextCheckAt} />
    </main>
  );
}
