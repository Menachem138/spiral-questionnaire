import { isAdmin } from "@/lib/auth";
import { COLOR_META, COLORS, CONFIDENCE_HE } from "@/lib/colors";
import { QUESTIONS } from "@/lib/questionnaire";
import { listResponses } from "@/lib/store";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** ייצוא כל התשובות לקובץ CSV (נפתח באקסל עם עברית תקינה) */
export async function GET() {
  if (!(await isAdmin())) return new Response("unauthorized", { status: 401 });
  const rows = await listResponses();
  const header = [
    "תאריך",
    "שם",
    "פרטי קשר",
    "צבע דומיננטי",
    "שלושה מובילים",
    "רמת ביטחון",
    ...COLORS.map((c) => `${COLOR_META[c].he} %`),
    ...QUESTIONS.map((q) => `ש${q.id}`),
    "משך (דקות)",
  ];
  const lines = [header.map(esc).join(",")];
  for (const r of rows) {
    const s = r.scoring;
    lines.push(
      [
        new Date(r.createdAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" }),
        r.respondent.name,
        r.respondent.contact,
        COLOR_META[s.dominant].he,
        s.top3.map((c) => COLOR_META[c].he).join(" / "),
        CONFIDENCE_HE[s.confidence],
        ...COLORS.map((c) => s.colors.find((x) => x.color === c)?.pct ?? 0),
        ...QUESTIONS.map((q) => (r.answers[q.id] ?? []).map((i) => q.options[i].letter).join("+")),
        r.durationSec ? Math.round(r.durationSec / 60) : "",
      ]
        .map(esc)
        .join(","),
    );
  }
  return new Response("﻿" + lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="spiral-responses.csv"`,
    },
  });
}
