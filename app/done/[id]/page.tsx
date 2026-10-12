import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import AutoRefresh from "@/components/AutoRefresh";
import { AnalysisSections, ContextProfiles, ResultHeader } from "@/components/Report";
import { Paragraphs } from "@/components/RichText";
import { SpiralMark } from "@/components/SpiralMark";
import { getAnalysis, getResponse, getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

const safeEq = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export default async function DonePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ k?: string }>;
}) {
  const { id } = await params;
  const { k } = await searchParams;
  const rec = await getResponse(id);
  if (!rec || !k || !safeEq(k, rec.token)) notFound();

  const settings = await getSettings();
  const show = settings.showResultsToRespondent || rec.sharedWithRespondent;
  const first = rec.respondent.name.split(" ")[0];

  if (!show) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="rise card w-full p-8 sm:p-12">
          <div className="mx-auto mb-6 w-fit">
            <SpiralMark size={88} spin />
          </div>
          <h1 className="font-display text-3xl font-bold">תודה{first ? `, ${first}` : ""}!</h1>
          <p className="mt-4 leading-8 text-ink-2">
            התשובות נשמרו בהצלחה והועברו לניתוח.
            <br />
            אפשר לסגור את הדף.
          </p>
        </div>
      </main>
    );
  }

  const analysis = await getAnalysis(id);
  const running = analysis?.status === "running" || analysis?.status === "queued";

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8">
      <header className="mb-8 flex items-center gap-3">
        <SpiralMark size={44} />
        <div>
          <div className="text-sm text-muted">שאלון התפתחות התודעה</div>
          <h1 className="font-display text-2xl font-bold">הפרופיל של {rec.respondent.name}</h1>
        </div>
      </header>
      {/* המשיב מקבל את אותו דוח מלא שהמנהל רואה (בלי כלי הניהול והמפתח הסודי) */}
      <div className="space-y-6">
        {analysis?.status === "done" && analysis.result?.reader_version?.what_is_this && (
          <section className="rounded-[1.25rem] bg-bg-2/70 p-6 sm:p-8">
            <h2 className="mb-3 font-display text-2xl font-bold">רגע לפני: מה בעצם בדקנו?</h2>
            <Paragraphs text={analysis.result.reader_version.what_is_this} className="text-[16.5px] text-ink-2" />
          </section>
        )}
        <ResultHeader scoring={rec.scoring} analysis={analysis?.result} />
        {analysis?.status === "done" && analysis.result ? (
          <>
            <section className="card p-6 sm:p-8">
              <h2 className="mb-1 font-display text-2xl font-bold">פרופיל לפי הקשר</h2>
              <p className="mb-5 text-sm text-muted">איך הצבעים מתחלקים בתחומים שונים של החיים ובמצבים שונים.</p>
              <ContextProfiles scoring={rec.scoring} />
            </section>
            <AnalysisSections a={analysis.result} address={rec.respondent.address} />
          </>
        ) : running ? (
          <div className="card flex items-center gap-4 p-6">
            <SpiralMark size={40} spin />
            <div>
              <div className="font-bold">הניתוח המלא נכתב עכשיו</div>
              <div className="text-sm text-muted">זה יכול לקחת זמן מה. הדף יתעדכן אוטומטית.</div>
            </div>
            <AutoRefresh seconds={30} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
