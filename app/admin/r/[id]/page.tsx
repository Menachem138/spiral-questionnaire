import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ResponseActions } from "@/components/AdminControls";
import AutoRefresh from "@/components/AutoRefresh";
import { AnalysisSections, ContextProfiles, EvidenceTable, MotivesList, ResultHeader } from "@/components/Report";
import { isAdmin } from "@/lib/auth";
import { COLOR_META, type Color } from "@/lib/colors";
import { KEY } from "@/lib/engine/key";
import { QUESTIONS } from "@/lib/questionnaire";
import { getAnalysis, getResponse } from "@/lib/store";

export const dynamic = "force-dynamic";

const ADDRESS_HE = { m: "לשון זכר", f: "לשון נקבה", "": "לא צוין" } as const;

export default async function ResponsePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const { id } = await params;
  const [rec, analysis] = await Promise.all([getResponse(id), getAnalysis(id)]);
  if (!rec) notFound();
  const status = analysis?.status ?? "none";
  const s = rec.scoring;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8">
      <Link href="/admin" className="text-sm text-muted hover:underline">
        → חזרה לכל התשובות
      </Link>
      <header className="mb-6 mt-3">
        <h1 className="font-display text-3xl font-bold">{rec.respondent.name}</h1>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {rec.respondent.contact && <span dir="auto">{rec.respondent.contact}</span>}
          <span>
            {new Date(rec.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "medium", timeStyle: "short" })}
          </span>
          {rec.durationSec && <span>משך מילוי: {Math.round(rec.durationSec / 60)} דק׳</span>}
          <span>פנייה: {ADDRESS_HE[rec.respondent.address]}</span>
          {s.doublePicks > 0 && <span>שתי בחירות ב-{s.doublePicks} שאלות</span>}
        </div>
      </header>

      <div className="space-y-6">
        <ResponseActions
          id={rec.id}
          token={rec.token}
          shared={Boolean(rec.sharedWithRespondent)}
          analysisStatus={status}
          hasKey={Boolean(process.env.ANTHROPIC_API_KEY)}
        />

        <ResultHeader scoring={s} analysis={analysis?.result} />

        <section className="card p-6 sm:p-8">
          <h2 className="mb-1 font-display text-2xl font-bold">פרופילים לפי הקשר</h2>
          <p className="mb-5 text-sm text-muted">{s.confidenceReasons.join(" · ")}</p>
          <ContextProfiles scoring={s} />
        </section>

        <section className="card p-6 sm:p-8">
          <h2 className="mb-4 font-display text-2xl font-bold">מניעים שחוזרים בבחירות</h2>
          <MotivesList scoring={s} />
        </section>

        {status === "running" && (
          <div className="card flex items-center gap-3 p-6">
            <span className="h-3 w-3 animate-pulse rounded-full bg-gold" />
            <div>
              <div className="font-bold">הניתוח העמוק נכתב עכשיו</div>
              <div className="text-sm text-muted">בדרך כלל 2-4 דקות. הדף יתרענן לבד.</div>
            </div>
            <AutoRefresh seconds={10} />
          </div>
        )}
        {status === "error" && (
          <div className="card border-danger/40 p-6 text-danger">
            <div className="font-bold">הפקת הניתוח נכשלה</div>
            <div className="mt-1 text-sm">{analysis?.error}</div>
          </div>
        )}

        {analysis?.status === "done" && analysis.result && (
          <>
            <AnalysisSections a={analysis.result} address={rec.respondent.address} />
            <details className="card p-6 sm:p-8">
              <summary className="cursor-pointer font-display text-xl font-bold">טבלת הראיות של המנוע (למנהל בלבד)</summary>
              <div className="mt-4">
                <EvidenceTable a={analysis.result} />
              </div>
              <p className="mt-4 text-xs text-muted">
                מודל: {analysis.model} · {analysis.usage?.input?.toLocaleString()} טוקנים נכנסים ·{" "}
                {analysis.usage?.output?.toLocaleString()} יוצאים
              </p>
            </details>
          </>
        )}

        <details className="card p-6 sm:p-8">
          <summary className="cursor-pointer font-display text-xl font-bold">כל התשובות (עם מפתח הניקוד, למנהל בלבד)</summary>
          <ol className="mt-5 space-y-6">
            {QUESTIONS.map((q) => {
              const k = KEY.find((x) => x.id === q.id)!;
              const sel = rec.answers[q.id] ?? [];
              return (
                <li key={q.id}>
                  <div className="font-bold">
                    {q.id}. {q.title}
                  </div>
                  <div className="text-xs text-muted">{k.tension}</div>
                  <ul className="mt-2 space-y-1">
                    {q.options.map((o, i) => {
                      const on = sel.includes(i);
                      return (
                        <li
                          key={i}
                          className={`flex items-start justify-between gap-3 rounded-lg px-3 py-1.5 text-sm ${
                            on ? "bg-accent-soft font-semibold text-ink" : "text-muted"
                          }`}
                        >
                          <span>
                            {on ? "✔ " : ""}
                            {o.letter}. {o.text}
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {Object.entries(k.options[i].w).map(([c, v]) => (
                              <span
                                key={c}
                                title={`${COLOR_META[c as Color].he} ${v}`}
                                className="h-2.5 rounded-full"
                                style={{ background: COLOR_META[c as Color].hex, width: `${(v ?? 1) * 6}px` }}
                              />
                            ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        </details>
      </div>
    </main>
  );
}
