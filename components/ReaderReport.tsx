import { COLOR_META, type Color } from "@/lib/colors";
import type { ReaderVersion } from "@/lib/engine/analysis-schema";
import type { Scoring } from "@/lib/engine/score";
import { ColorBars } from "./Report";
import { Paragraphs } from "./RichText";

type Address = "m" | "f" | "";

function t(addr: Address) {
  const g = (m: string, f: string, p: string) => (addr === "f" ? f : addr === "m" ? m : p);
  return {
    whatIs: "רגע לפני: מה בעצם בדקנו?",
    colors: g("שלושת הצבעים החזקים אצלך", "שלושת הצבעים החזקים אצלך", "שלושת הצבעים החזקים אצלכם"),
    map: "כל שמונת הצבעים",
    mapNote: "ככל שהפס ארוך יותר, כך הצבע הזה השפיע יותר על הבחירות בשאלון. זו תמונה של התקופה הנוכחית, לא ציון.",
    story: g("מי אתה, לפי הבחירות שלך", "מי את, לפי הבחירות שלך", "מי אתם, לפי הבחירות שלכם"),
    insights: "תובנות",
    selfStory: g("הסיפור שאתה מספר לעצמך", "הסיפור שאת מספרת לעצמך", "הסיפור שאתם מספרים לעצמכם"),
    strengths: g("החוזקות שלך", "החוזקות שלך", "החוזקות שלכם"),
    watch: "כדאי לשים לב",
    tips: g("מה אפשר לעשות עם זה", "מה אפשר לעשות עם זה", "מה אפשר לעשות עם זה"),
    why: g("למה דווקא לך: ", "למה דווקא לך: ", "למה דווקא לכם: "),
    inYou: g("אצלך: ", "אצלך: ", "אצלכם: "),
  };
}

function Block({ title, children, tone = "card" }: { title: string; children: React.ReactNode; tone?: "card" | "soft" }) {
  return (
    <section className={tone === "card" ? "card p-6 sm:p-8" : "rounded-[1.25rem] bg-bg-2/70 p-6 sm:p-8"}>
      <h2 className="mb-4 font-display text-2xl font-bold leading-snug">{title}</h2>
      {children}
    </section>
  );
}

/** הגרסה שהמשיב עצמו קורא: ברורה, מסודרת ומרתקת, גם בלי ידע מוקדם */
export function ReaderReport({ r, scoring, address = "" }: { r: ReaderVersion; scoring: Scoring; address?: Address }) {
  const T = t(address);
  return (
    <div className="space-y-6 text-[17px] leading-8">
      <section className="hero rounded-[1.5rem] p-7 sm:p-10">
        <p className="font-display text-2xl leading-10 sm:text-3xl sm:leading-[3rem]">{r.headline}</p>
      </section>

      <Block title={T.whatIs} tone="soft">
        <Paragraphs text={r.what_is_this} className="text-ink-2" />
      </Block>

      <Block title={T.colors}>
        <div className="space-y-5">
          {r.your_colors.map((c) => {
            const m = COLOR_META[c.color as Color];
            return (
              <div
                key={c.color}
                className="rounded-2xl border border-line p-5"
                style={{ borderInlineStartWidth: 6, borderInlineStartColor: m?.hex }}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-lg font-bold" style={{ color: m?.hex }}>
                    {m?.he}
                  </span>
                  <span className="font-display text-xl font-bold text-ink">{c.nickname}</span>
                </div>
                <p className="mt-2 text-ink-2">{c.in_simple_words}</p>
                <p className="mt-2 text-ink">
                  <span className="font-bold">{T.inYou}</span>
                  {c.in_you}
                </p>
              </div>
            );
          })}
        </div>
      </Block>

      <Block title={T.map}>
        <p className="mb-5 text-sm text-muted">{T.mapNote}</p>
        <ColorBars scoring={scoring} />
      </Block>

      <Block title={T.story}>
        <Paragraphs text={r.your_story} className="text-ink-2" />
      </Block>

      {r.insights.length > 0 && (
        <Block title={T.insights}>
          <div className="grid gap-4 sm:grid-cols-2">
            {r.insights.map((x, i) => (
              <div key={i} className="rounded-2xl bg-bg-2/60 p-5">
                <div className="mb-1 font-display text-3xl font-black text-gold">{i + 1}</div>
                <h3 className="font-bold text-ink">{x.title}</h3>
                <Paragraphs text={x.text} className="mt-1 text-[16px] text-ink-2" />
              </div>
            ))}
          </div>
        </Block>
      )}

      <section className="card border-2 border-ink/15 p-6 sm:p-8">
        <h2 className="mb-4 font-display text-2xl font-bold">{T.selfStory}</h2>
        <Paragraphs text={r.the_story_you_tell_yourself} className="text-ink-2" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Block title={T.strengths}>
          <ul className="space-y-4">
            {r.strengths.map((x, i) => (
              <li key={i}>
                <div className="font-bold text-ok">✓ {x.title}</div>
                <p className="text-[16px] text-ink-2">{x.text}</p>
              </li>
            ))}
          </ul>
        </Block>
        <Block title={T.watch}>
          <ul className="space-y-4">
            {r.watch_out.map((x, i) => (
              <li key={i}>
                <div className="font-bold text-gold">! {x.title}</div>
                <p className="text-[16px] text-ink-2">{x.text}</p>
              </li>
            ))}
          </ul>
        </Block>
      </div>

      <Block title={T.tips}>
        <ol className="space-y-4">
          {r.tips.map((x, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                {i + 1}
              </span>
              <div>
                <div className="font-semibold text-ink">{x.tip}</div>
                <p className="text-[15.5px] text-ink-2">
                  <span className="font-semibold">{T.why}</span>
                  {x.why}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <section className="hero rounded-[1.5rem] p-7 sm:p-10">
        <Paragraphs text={r.closing} className="font-display text-xl leading-9" />
      </section>
    </div>
  );
}
