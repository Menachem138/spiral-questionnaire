import { COLOR_META, CONFIDENCE_HE, TAG_HE, type Color } from "@/lib/colors";
import type { Scoring, SubProfile } from "@/lib/engine/score";
import type { AnalysisResult } from "@/lib/engine/analysis-schema";
import { Paragraphs } from "./RichText";

export function ColorChip({ color, pct, size = "md" }: { color: Color; pct?: number; size?: "sm" | "md" | "lg" }) {
  const m = COLOR_META[color];
  const cls =
    size === "lg" ? "px-4 py-2 text-lg gap-2.5" : size === "sm" ? "px-2 py-0.5 text-xs gap-1.5" : "px-3 py-1 text-sm gap-2";
  const dot = size === "lg" ? "h-4 w-4" : size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border border-line bg-surface font-semibold ${cls}`}>
      <span className={`${dot} rounded-full`} style={{ background: m.hex }} />
      {m.he}
      {pct !== undefined && <span className="font-normal text-muted">{pct}%</span>}
    </span>
  );
}

export function ColorBars({ scoring }: { scoring: Scoring }) {
  const max = Math.max(...scoring.colors.map((c) => c.pct), 1);
  return (
    <div className="space-y-2.5">
      {scoring.colors.map((c) => {
        const m = COLOR_META[c.color];
        return (
          <div key={c.color} className="grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.hex }} />
              {m.he}
            </div>
            <div className="h-3.5 overflow-hidden rounded-full bg-bg-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${(c.pct / max) * 100}%`, background: m.hex, minWidth: c.pct > 0 ? 6 : 0 }}
              />
            </div>
            <div className="text-start text-sm tabular-nums text-ink-2">{c.pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

const CONF_STYLE: Record<Scoring["confidence"], string> = {
  high: "bg-ok/15 text-ok",
  mediumHigh: "bg-ok/10 text-ok",
  medium: "bg-gold/15 text-gold",
  low: "bg-danger/10 text-danger",
};

export function ConfidenceBadge({ level }: { level: Scoring["confidence"] }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${CONF_STYLE[level]}`}>
      רמת ביטחון: {CONFIDENCE_HE[level]}
    </span>
  );
}

/** תשובה דטרמיניסטית ל"איזה צבע אני", כשאין (עדיין) ניתוח AI */
export function deterministicHeadline(s: Scoring) {
  const [a, b, c] = s.top3.map((x) => COLOR_META[x].he);
  const mode = s.dominance ?? (s.clearDominant ? "single" : "trio");
  if (mode === "single")
    return `אם צריך לבחור מערכת אחת שמייצגת בצורה הטובה ביותר את הפרופיל בשאלון, המערכת הדומיננטית היא: **${a}**. אבל הפרופיל אינו צבע אחד: בולטות בו גם ${b} ו${c}.`;
  if (mode === "pair")
    return `שתי מערכות מובילות כמעט באותה עוצמה: **${a}** ו**${b}**, כש${a} במקום הראשון בפער קטן. לצידן בולטת גם ${c}.`;
  return `שלוש מערכות בולטות בפרופיל: **${a}**, **${b}** ו**${c}**. אין מערכת אחת ששולטת באופן מובהק.`;
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="card p-6 sm:p-8">
      <h2 className="mb-4 font-display text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function MiniProfile({ p }: { p: SubProfile }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {p.colors
        .filter((c) => c.pct >= 8)
        .slice(0, 3)
        .map((c) => (
          <ColorChip key={c.color} color={c.color} pct={Math.round(c.pct)} size="sm" />
        ))}
    </div>
  );
}

export function ContextProfiles({ scoring }: { scoring: Scoring }) {
  const rows = Object.values(scoring.domains).filter(Boolean) as SubProfile[];
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-bold">פרופיל לפי תחומים</h3>
        <p className="mb-3 text-sm text-muted">
          כל תחום מבוסס על 2-6 שאלות בלבד, ולכן הוא מראה מגמה ולא קביעה.
        </p>
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm font-semibold">
                {r.label} <span className="font-normal text-muted">(שאלות {r.questionIds.join(", ")})</span>
              </div>
              <MiniProfile p={r} />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          [scoring.calm, scoring.pressure],
          [scoring.behavioral, scoring.declared],
        ].map((pair, i) => (
          <div key={i} className="rounded-2xl border border-line p-4">
            {pair.map((p) => (
              <div key={p.label} className="py-2">
                <div className="mb-1.5 text-sm font-semibold">{p.label}</div>
                <MiniProfile p={p} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MotivesList({ scoring }: { scoring: Scoring }) {
  const top = scoring.tags.slice(0, 10);
  const max = Math.max(...top.map((t) => t.score), 1);
  return (
    <div className="space-y-2">
      {top.map((t) => (
        <div key={t.tag} className="grid grid-cols-[1fr_6rem] items-center gap-3 text-sm sm:grid-cols-[13rem_1fr_9rem]">
          <span className="font-semibold">{TAG_HE[t.tag] ?? t.tag}</span>
          <div className="hidden h-2 overflow-hidden rounded-full bg-bg-2 sm:block">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${(t.score / max) * 100}%` }} />
          </div>
          <span className="text-xs text-muted">שאלות {t.questionIds.join(", ")}</span>
        </div>
      ))}
    </div>
  );
}

type Address = "m" | "f" | "";

/** כותרות בלשון הפנייה שהמשיב בחר */
function titles(addr: Address) {
  const g = (m: string, f: string, p: string) => (addr === "f" ? f : addr === "m" ? m : p);
  return {
    dominant: g("המערכת הדומיננטית שלך", "המערכת הדומיננטית שלך", "המערכת הדומיננטית שלכם"),
    decisions: g("איך אתה מקבל החלטות", "איך את מקבלת החלטות", "איך אתם מקבלים החלטות"),
    pressure: g("איך אתה מתנהג תחת לחץ", "איך את מתנהגת תחת לחץ", "איך אתם מתנהגים תחת לחץ"),
    drives: g("מה מניע אותך", "מה מניע אותך", "מה מניע אתכם"),
    paradoxes: g("הפרדוקסים שלך", "הפרדוקסים שלך", "הפרדוקסים שלכם"),
    strengths: g("החוזקות שלך", "החוזקות שלך", "החוזקות שלכם"),
    why: g("למה אני אומר את זה: ", "למה אני אומר את זה: ", "למה אני אומר את זה: "),
    fits: g("למה זה מתאים לך: ", "למה זה מתאים לך: ", "למה זה מתאים לכם: "),
    seen: g("איך אתה עשוי להיתפס מבחוץ", "איך את עשויה להיתפס מבחוץ", "איך אתם עשויים להיתפס מבחוץ"),
    notSeen: g("מה אולי לא ראית בעצמך", "מה אולי לא ראית בעצמך", "מה אולי לא ראיתם בעצמכם"),
    interesting: g("🔎 מה מעניין במיוחד בפרופיל שלך", "🔎 מה מעניין במיוחד בפרופיל שלך", "🔎 מה מעניין במיוחד בפרופיל שלכם"),
    sentence: g("משפט הסיכום שלך", "משפט הסיכום שלך", "משפט הסיכום שלכם"),
    inYou: g("איך היא מופיעה אצלך", "איך היא מופיעה אצלך", "איך היא מופיעה אצלכם"),
    whyFirst: g(
      "למה הצבע הדומיננטי שלך קיבל את המקום הראשון",
      "למה הצבע הדומיננטי שלך קיבל את המקום הראשון",
      "למה הצבע הדומיננטי שלכם קיבל את המקום הראשון",
    ),
    achieve: g(
      "מה אתה מנסה להשיג וממה אתה מנסה להימנע",
      "מה את מנסה להשיג וממה את מנסה להימנע",
      "מה אתם מנסים להשיג וממה אתם מנסים להימנע",
    ),
    differently: g(
      "באילו מצבים אתה עשוי להתנהג אחרת",
      "באילו מצבים את עשויה להתנהג אחרת",
      "באילו מצבים אתם עשויים להתנהג אחרת",
    ),
  };
}

export function AnalysisSections({ a, address = "" }: { a: AnalysisResult; address?: Address }) {
  const T = titles(address);
  const prose = (title: string, text: string) =>
    text?.trim() ? (
      <Section title={title} key={title}>
        <Paragraphs text={text} className="text-[16.5px] text-ink-2" />
      </Section>
    ) : null;

  return (
    <div className="space-y-6">
      {prose("התמונה הגדולה", a.big_picture)}
      {prose(T.whyFirst, a.why_dominant_first)}
      {prose(T.dominant, a.dominant_system)}

      <Section title="שלוש המערכות המובילות">
        <div className="space-y-6">
          {a.top_three.map((t) => {
            const c = t.color as Color;
            return (
              <div key={t.color} className="rounded-2xl border border-line p-5" style={{ borderInlineStartWidth: 5, borderInlineStartColor: COLOR_META[c]?.hex }}>
                <div className="mb-3 flex items-center gap-3">
                  {COLOR_META[c] && <ColorChip color={c} />}
                </div>
                <dl className="grid gap-3 text-[15.5px] leading-7">
                  {(
                    [
                      ["מה המערכת מייצגת", t.what_it_represents],
                      [T.inYou, t.how_it_shows_in_you],
                      ["החוזקה", t.strength],
                      ["המחיר האפשרי", t.possible_cost],
                      ["מתי היא מתחזקת", t.when_it_gets_stronger],
                      ["מתי מערכת אחרת משתלטת", t.when_another_takes_over],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm font-bold text-ink">{k}</dt>
                      <dd className="text-ink-2">
                        <Paragraphs text={v} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })}
        </div>
      </Section>

      {prose(T.decisions, a.decision_making)}
      {prose("מה קורה כאשר שני ערכים מתנגשים", a.value_conflicts)}
      {prose(T.pressure, a.under_pressure)}
      {prose(T.drives, a.what_drives_you)}
      {prose(T.achieve, a.achieve_and_avoid)}
      {prose("כסף, הצלחה וחופש", a.money_success_freedom)}
      {prose("מערכות יחסים ושייכות", a.relationships_belonging)}
      {prose("סמכות, כללים ועצמאות", a.authority_rules_independence)}
      {prose("שינוי ואי ודאות", a.change_uncertainty)}
      {prose("כישלון ותחרות", a.failure_competition)}
      {prose("מה משותף לכל התחומים", a.common_across_domains)}
      {prose(T.differently, a.context_differences)}

      {a.paradoxes.length > 0 && (
        <Section title={T.paradoxes}>
          <div className="space-y-4">
            {a.paradoxes.map((p, i) => (
              <div key={i}>
                <h3 className="font-bold">{p.title}</h3>
                <Paragraphs text={p.text} className="mt-1 text-ink-2" />
              </div>
            ))}
          </div>
        </Section>
      )}

      {prose("הסתירות המעניינות ביותר", a.interesting_contradictions)}
      {prose("הפערים בין ערכים מוצהרים לבחירות", a.declared_vs_chosen)}

      <Section title={T.strengths}>
        <div className="grid gap-4 sm:grid-cols-2">
          {a.strengths.map((s, i) => (
            <div key={i} className="rounded-2xl bg-bg-2/60 p-4">
              <h3 className="font-bold">{s.title}</h3>
              <Paragraphs text={s.text} className="mt-1 text-[15px] text-ink-2" />
              <p className="mt-2 text-sm text-muted">
                <span className="font-semibold">{T.why}</span>
                {s.why_we_say_this}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {a.blind_spots.length > 0 && (
        <Section title="נקודות עיוורות אפשריות">
          <div className="space-y-5">
            {a.blind_spots.map((b, i) => (
              <div key={i} className="rounded-2xl border border-line p-4">
                <h3 className="font-bold">{b.title}</h3>
                <dl className="mt-2 grid gap-2 text-[15px] leading-7">
                  {(
                    [
                      ["מה נראה שקורה", b.what_seems_to_happen],
                      ["על מה זה מבוסס", b.based_on],
                      ["למה זה חשוב", b.why_it_matters],
                      ["מה אפשר לעשות", b.what_to_do],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-sm font-semibold text-ink">{k}</dt>
                      <dd className="text-ink-2">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="טיפים אישיים">
        <ol className="space-y-4">
          {a.tips.map((t, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                {i + 1}
              </span>
              <div className="leading-7">
                <Paragraphs text={t.tip} className="font-semibold text-ink" />
                <p className="mt-1 text-[15px] text-ink-2">
                  <span className="font-semibold">{T.fits}</span>
                  {t.why_it_fits_you}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {prose(T.seen, a.how_others_may_see_you)}
      {prose(T.notSeen, a.what_you_might_not_see)}
      {prose(T.interesting, a.most_interesting)}

      <section className="hero rounded-[1.5rem] p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">{T.sentence}</h2>
        <p className="mt-3 font-display text-xl leading-9">{a.one_sentence}</p>
        <div className="mt-5 border-t border-white/20 pt-5 opacity-95">
          <Paragraphs text={a.closing_paragraph} className="text-[16px]" />
        </div>
      </section>

      <Section title="רמת הביטחון בתוצאה">
        <p className="mb-2 font-bold">{a.confidence_level}</p>
        <Paragraphs text={a.confidence_explanation} className="text-ink-2" />
      </Section>
    </div>
  );
}

const KIND_HE: Record<string, string> = {
  DECLARED_VS_BEHAVIOR: "הצהרה מול בחירה",
  CONTEXT_DIFFERENCE: "הבדל הקשר",
  INTERNAL_CONTRADICTION: "סתירה פנימית",
  CALM_VS_PRESSURE: "רגוע מול לחץ",
  PRICE_VS_NO_PRICE: "עם מחיר מול בלי מחיר",
};

/** סימני הסתירה שחושבו מהמפתח (דטרמיניסטי, למנהל) */
export function ScoringSignals({ scoring }: { scoring: Scoring }) {
  const c = scoring.consistency;
  if (!c) return null;
  return (
    <div className="space-y-5 text-sm">
      <div>
        <div className="mb-2 font-bold">
          עקביות בין שאלות אימות: {c.level === "high" ? "גבוהה" : c.level === "medium" ? "בינונית" : "נמוכה"} ({c.score})
        </div>
        <div className="divide-y divide-line rounded-2xl border border-line">
          {c.groups.map((g) => (
            <div key={g.group} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
              <span>
                {g.label} <span className="text-muted">(שאלות {g.questionIds.join(", ")})</span>
              </span>
              <span className="flex items-center gap-2">
                <ColorChip color={g.lead} size="sm" />
                <span className="text-muted">{Math.round(g.leadShare * 100)}%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 font-bold">סימני סתירה שזוהו במפתח</div>
        {scoring.contradictions.length === 0 ? (
          <p className="text-muted">לא זוהו.</p>
        ) : (
          <ul className="space-y-2">
            {scoring.contradictions.map((x, i) => (
              <li key={i} className="rounded-xl bg-bg-2/60 px-3 py-2 leading-6">
                <span className="font-semibold">
                  {KIND_HE[x.kind]} · עוצמה {x.strength}/5:
                </span>{" "}
                {x.description}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function InternalContradictions({ a }: { a: AnalysisResult }) {
  if (!a.contradictions_internal?.length) return <p className="text-sm text-muted">המנוע לא רשם סתירות.</p>;
  return (
    <ul className="space-y-3 text-sm">
      {a.contradictions_internal.map((x, i) => (
        <li key={i} className="rounded-xl border border-line px-4 py-3 leading-6">
          <div className="font-semibold">
            {KIND_HE[x.kind] ?? x.kind} · עוצמה {x.strength}/5 · שאלות {x.questions.join(", ")}
            {x.show_to_user ? " · מוצג למשיב" : " · למנהל בלבד"}
          </div>
          <div className="mt-1 text-ink-2">{x.description}</div>
          <div className="mt-1 text-muted">מה השתנה בין המצבים: {x.what_changed_between_situations}</div>
        </li>
      ))}
    </ul>
  );
}

export function EvidenceTable({ a }: { a: AnalysisResult }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-start text-muted">
            <th className="py-2 text-start font-semibold">מסקנה</th>
            <th className="py-2 text-start font-semibold">תומכות</th>
            <th className="py-2 text-start font-semibold">סותרות</th>
            <th className="py-2 text-start font-semibold">רמה</th>
            <th className="py-2 text-start font-semibold">ביטחון</th>
          </tr>
        </thead>
        <tbody>
          {a.evidence_table.map((r, i) => (
            <tr key={i} className="border-b border-line/60 align-top">
              <td className="py-2 pe-3 leading-6">{r.conclusion}</td>
              <td className="py-2 pe-3 tabular-nums">{r.supporting_questions.join(", ")}</td>
              <td className="py-2 pe-3 tabular-nums">{r.contradicting_questions.join(", ") || "-"}</td>
              <td className="py-2 pe-3 whitespace-nowrap">{r.level}</td>
              <td className="py-2 whitespace-nowrap">{r.confidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** החלק העליון של התוצאה: איזה צבע אני + מפת הצבעים */
export function ResultHeader({ scoring, analysis }: { scoring: Scoring; analysis?: AnalysisResult | null }) {
  const dom = COLOR_META[scoring.dominant];
  return (
    <div className="space-y-6">
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: dom.hex }} />
        <p className="text-sm font-semibold text-gold">אז איזה צבע אני?</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {scoring.top3.map((c, i) => (
            <ColorChip key={c} color={c} size={i === 0 ? "lg" : "md"} pct={scoring.colors.find((x) => x.color === c)?.pct} />
          ))}
        </div>
        <Paragraphs
          text={analysis?.which_color_am_i || deterministicHeadline(scoring)}
          className="mt-5 text-[17px] text-ink-2"
        />
        {analysis?.short_summary && (
          <div className="mt-5 rounded-2xl bg-bg-2/70 p-4">
            <div className="mb-1 text-sm font-bold">בקצרה</div>
            <Paragraphs text={analysis.short_summary} className="text-[15.5px] text-ink-2" />
          </div>
        )}
        <div className="mt-5">
          <ConfidenceBadge level={scoring.confidence} />
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <h2 className="mb-1 font-display text-2xl font-bold">מפת שמונת הצבעים</h2>
        <p className="mb-5 text-sm text-muted">
          {analysis?.percentages_note ||
            "האחוזים מייצגים את המשקל היחסי של המערכות בפרופיל שהתקבל מהשאלון, ולא מדד פסיכולוגי מוחלט."}
        </p>
        <ColorBars scoring={scoring} />
      </section>
    </div>
  );
}
