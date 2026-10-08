import "server-only";
import { AnalysisNotConfiguredError, runAnalysis } from "./engine/analysis";
import { getResponse, saveAnalysis } from "./store";

/** מריץ את מנוע הניתוח עבור תשובה ושומר את התוצאה. לא זורק שגיאות. */
export async function analyzeResponse(id: string) {
  const rec = await getResponse(id);
  if (!rec) return;
  if (!process.env.ANTHROPIC_API_KEY) return; // הניתוח יופעל ידנית מדף הניהול כשהמפתח יוגדר
  const startedAt = new Date().toISOString();
  await saveAnalysis(id, { status: "running", startedAt });
  try {
    const { result, model, usage } = await runAnalysis(rec);
    await saveAnalysis(id, { status: "done", startedAt, finishedAt: new Date().toISOString(), model, result, usage, engine: "api" });
  } catch (err) {
    const message =
      err instanceof AnalysisNotConfiguredError
        ? "מפתח ה-API של Anthropic לא מוגדר"
        : err instanceof Error
          ? err.message
          : String(err);
    console.error("analysis failed", id, err);
    await saveAnalysis(id, { status: "error", startedAt, finishedAt: new Date().toISOString(), error: message });
  }
}
