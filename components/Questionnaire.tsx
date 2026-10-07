"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Rich } from "./RichText";
import { SpiralMark } from "./SpiralMark";
import type { Question } from "@/lib/questionnaire";

type Intro = {
  title: string;
  subtitle: string;
  beforeHeading: string;
  paragraphs: string[];
  howHeading: string;
  rules: string[];
};

type Respondent = { name: string; contact: string; address: "m" | "f" | "" };
type Stage = "intro" | "question" | "review";

interface Progress {
  stage: Stage;
  idx: number;
  answers: Record<number, number[]>;
  respondent: Respondent;
  startedAt: number | null;
}

const STORAGE_KEY = "sq-progress-v1";

function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}
function saveProgress(p: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {}
}
function clearProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

const maxSelectFor = (id: number) => (id === 24 ? 1 : 2);

export default function Questionnaire({ intro, questions }: { intro: Intro; questions: Question[] }) {
  const router = useRouter();
  // restore an unfinished questionnaire after refresh (component renders client-only)
  const [saved] = useState(loadProgress);
  const [stage, setStage] = useState<Stage>(saved?.stage ?? "intro");
  const [idx, setIdx] = useState(Math.min(saved?.idx ?? 0, questions.length - 1));
  const [answers, setAnswers] = useState<Record<number, number[]>>(saved?.answers ?? {});
  const [respondent, setRespondent] = useState<Respondent>(saved?.respondent ?? { name: "", contact: "", address: "" });
  const [startedAt, setStartedAt] = useState<number | null>(saved?.startedAt ?? null);
  const [limitHint, setLimitHint] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveProgress({ stage, idx, answers, respondent, startedAt });
  }, [stage, idx, answers, respondent, startedAt]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [stage, idx]);

  const q = questions[idx];
  const selected = answers[q.id] ?? [];
  const answeredCount = useMemo(
    () => questions.filter((x) => (answers[x.id] ?? []).length > 0).length,
    [answers, questions],
  );

  function toggle(optionIndex: number) {
    const max = maxSelectFor(q.id);
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      if (cur.includes(optionIndex)) {
        setLimitHint(false);
        return { ...prev, [q.id]: cur.filter((i) => i !== optionIndex) };
      }
      if (max === 1) return { ...prev, [q.id]: [optionIndex] };
      if (cur.length >= max) {
        setLimitHint(true);
        return prev;
      }
      return { ...prev, [q.id]: [...cur, optionIndex] };
    });
  }

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (!respondent.name.trim()) return;
    if (!startedAt) setStartedAt(Date.now());
    setStage("question");
  }

  function next() {
    if (!selected.length) return;
    setLimitHint(false);
    if (idx < questions.length - 1) setIdx(idx + 1);
    else setStage("review");
  }

  function back() {
    setLimitHint(false);
    if (stage === "review") return setStage("question");
    if (idx > 0) setIdx(idx - 1);
    else setStage("intro");
  }

  async function submit() {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          respondent,
          answers,
          durationSec: startedAt ? Math.round((Date.now() - startedAt) / 1000) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בשליחה");
      clearProgress();
      router.push(`/done/${data.id}?k=${data.token}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בשליחה");
      setSending(false);
    }
  }

  const pct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div ref={topRef} className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 sm:pt-10">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SpiralMark size={40} muted={stage !== "intro"} />
          <div className="leading-tight">
            <div className="font-display text-lg font-bold">{intro.title}</div>
            <div className="text-xs text-muted">{intro.subtitle}</div>
          </div>
        </div>
        {stage !== "intro" && (
          <button onClick={() => setShowGuide(true)} className="text-sm text-muted underline-offset-4 hover:underline">
            הנחיות
          </button>
        )}
      </header>

      {stage !== "intro" && (
        <div className="mb-6">
          <div className="mb-2 flex justify-between text-xs text-muted">
            <span>{stage === "review" ? "סיום" : `שאלה ${idx + 1} מתוך ${questions.length}`}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {stage === "intro" ? (
        <IntroScreen intro={intro} respondent={respondent} setRespondent={setRespondent} onStart={start} resumed={answeredCount > 0} />
      ) : stage === "question" ? (
        <section key={q.id} className="rise">
          <div className="card p-5 sm:p-8">
            <div className="mb-1 text-sm font-semibold text-gold">שאלה {q.id}</div>
            <h2 className="font-display text-2xl font-bold leading-snug sm:text-3xl">{q.title}</h2>
            <div className="mt-5 space-y-2.5 text-[17px] leading-8 text-ink-2">
              {q.scenario.map((p, i) => (
                <p key={i}>
                  <Rich text={p} />
                </p>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-accent-soft px-4 py-3 text-[15px] leading-7 text-ink-2">
              <span className="font-bold text-ink">איך לבחור: </span>
              <Rich text={q.instruction} />
            </div>
          </div>

          <div className="mt-5 space-y-3" role="group" aria-label="תשובות">
            {q.options.map((o, i) => {
              const on = selected.includes(i);
              const order = selected.indexOf(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  aria-pressed={on}
                  className={`flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-start text-[16.5px] leading-7 transition-all sm:px-5 ${
                    on
                      ? "border-accent bg-surface shadow-card ring-2 ring-accent"
                      : "border-line bg-surface/70 hover:border-ink-2/30 hover:bg-surface"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold transition-colors ${
                      on ? "bg-accent text-accent-ink" : "bg-bg-2 text-ink-2"
                    }`}
                  >
                    {o.letter}
                  </span>
                  <span className="flex-1">{o.text}</span>
                  {on && selected.length === 2 && (
                    <span className="mt-1 shrink-0 text-xs text-muted">בחירה {order + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 min-h-6 text-center text-sm text-muted">
            {limitHint
              ? "ניתן לבחור עד שתי תשובות. בטלו אחת מהבחירות כדי לבחור אחרת."
              : selected.length === 2
                ? "בחרתם שתי תשובות. לדיוק מרבי, מומלץ לבחור אחת."
                : maxSelectFor(q.id) === 1
                  ? "בשאלה זו בוחרים משפט אחד בלבד."
                  : ""}
          </div>

          <nav className="mt-6 flex items-center justify-between gap-3">
            <button className="btn btn-ghost" onClick={back}>
              → הקודם
            </button>
            <button className="btn btn-primary min-w-36" onClick={next} disabled={!selected.length}>
              {idx === questions.length - 1 ? "סיום" : "הבא ←"}
            </button>
          </nav>
        </section>
      ) : (
        <section className="rise">
          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-3xl font-bold">כמעט סיימתם</h2>
            <p className="mt-3 leading-8 text-ink-2">
              ענית על {answeredCount} מתוך {questions.length} שאלות. אפשר לחזור לכל שאלה ולשנות את הבחירה לפני
              השליחה.
            </p>
            <ol className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {questions.map((x, i) => {
                const sel = answers[x.id] ?? [];
                return (
                  <li key={x.id}>
                    <button
                      onClick={() => {
                        setIdx(i);
                        setStage("question");
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-start text-sm hover:bg-accent-soft"
                    >
                      <span className="truncate">
                        <span className="text-muted">{x.id}.</span> {x.title}
                      </span>
                      <span className={`shrink-0 font-bold ${sel.length ? "text-accent" : "text-danger"}`}>
                        {sel.length ? sel.map((s) => x.options[s].letter).join(", ") : "חסר"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {error && <p className="mt-5 rounded-xl bg-danger/10 px-4 py-3 text-danger">{error}</p>}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button className="btn btn-ghost" onClick={back} disabled={sending}>
                → חזרה
              </button>
              <button
                className="btn btn-primary min-w-40"
                onClick={submit}
                disabled={sending || answeredCount < questions.length}
              >
                {sending ? "שולח..." : "שליחת השאלון"}
              </button>
            </div>
          </div>
        </section>
      )}

      {showGuide && <GuideModal intro={intro} onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function GuideBody({ intro }: { intro: Intro }) {
  return (
    <>
      <h2 className="font-display text-2xl font-bold">{intro.beforeHeading}</h2>
      <div className="mt-3 space-y-2 leading-8 text-ink-2">
        {intro.paragraphs.map((p, i) => (
          <p key={i}>
            <Rich text={p} />
          </p>
        ))}
      </div>
      <h3 className="mt-6 text-lg font-bold">{intro.howHeading}</h3>
      <ol className="mt-3 space-y-3">
        {intro.rules.map((r, i) => (
          <li key={i} className="flex gap-3 leading-7 text-ink-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
              {i + 1}
            </span>
            <span>
              <Rich text={r} />
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}

function IntroScreen({
  intro,
  respondent,
  setRespondent,
  onStart,
  resumed,
}: {
  intro: Intro;
  respondent: Respondent;
  setRespondent: (r: Respondent) => void;
  onStart: (e: React.FormEvent) => void;
  resumed: boolean;
}) {
  return (
    <div className="rise">
      <div className="hero relative mb-8 overflow-hidden rounded-[1.75rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-16 -top-16 opacity-25">
          <SpiralMark size={300} spin />
        </div>
        <div className="relative">
          <p className="text-sm tracking-wide opacity-80">{intro.subtitle}</p>
          <h1 className="mt-2 font-display text-4xl font-black leading-tight sm:text-5xl">{intro.title}</h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 opacity-85">24 תרחישים</p>
        </div>
      </div>

      <div className="card p-6 sm:p-8">
        <GuideBody intro={intro} />
      </div>

      <form onSubmit={onStart} className="card mt-6 p-6 sm:p-8">
        <h2 className="font-display text-2xl font-bold">פרטים לפני שמתחילים</h2>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">שם מלא *</span>
            <input
              className="field"
              required
              maxLength={80}
              value={respondent.name}
              onChange={(e) => setRespondent({ ...respondent, name: e.target.value })}
              autoComplete="name"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">טלפון או אימייל (לא חובה)</span>
            <input
              className="field"
              maxLength={120}
              value={respondent.contact}
              onChange={(e) => setRespondent({ ...respondent, contact: e.target.value })}
              dir="auto"
            />
          </label>
          <fieldset>
            <legend className="mb-1.5 block text-sm font-semibold">איך לפנות אליך בסיכום? (לא חובה)</legend>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["f", "לשון נקבה"],
                  ["m", "לשון זכר"],
                  ["", "לא משנה"],
                ] as const
              ).map(([v, label]) => (
                <button
                  type="button"
                  key={v || "none"}
                  onClick={() => setRespondent({ ...respondent, address: v })}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                    respondent.address === v ? "border-accent bg-accent text-accent-ink" : "border-line hover:bg-accent-soft"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <button className="btn btn-primary mt-7 w-full sm:w-auto" disabled={!respondent.name.trim()}>
          {resumed ? "להמשיך מאיפה שעצרתי ←" : "התחלת השאלון ←"}
        </button>
      </form>
    </div>
  );
}

function GuideModal({ intro, onClose }: { intro: Intro; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="card rise max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-b-none p-6 sm:rounded-b-[1.25rem] sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <GuideBody intro={intro} />
        <button className="btn btn-primary mt-6 w-full" onClick={onClose}>
          חזרה לשאלון
        </button>
      </div>
    </div>
  );
}
