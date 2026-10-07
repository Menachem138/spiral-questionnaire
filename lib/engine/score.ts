import "server-only";
import { COLORS, KEY, keyFor, type Color, type Domain, type Tag } from "./key";

/** בחירות המשיב: מזהה שאלה -> אינדקסים של התשובות שנבחרו (1-2) */
export type Answers = Record<number, number[]>;

export type ConfidenceLevel = "high" | "mediumHigh" | "medium" | "low";

export interface ColorScore {
  color: Color;
  /** מסת הראיות הגולמית שהצבע קיבל */
  raw: number;
  /** אחוז מתוקן (משקל יחסי בפרופיל) */
  pct: number;
  /** בכמה שאלות הצבע הופיע בבחירה בצורה משמעותית */
  support: number;
}

export interface SubProfile {
  label: string;
  questionIds: number[];
  colors: { color: Color; pct: number }[];
  lead: Color[];
}

export interface Scoring {
  version: number;
  colors: ColorScore[];
  dominant: Color;
  top3: Color[];
  clearDominant: boolean;
  confidence: ConfidenceLevel;
  confidenceReasons: string[];
  gapTop2: number;
  domains: Partial<Record<Domain, SubProfile>>;
  calm: SubProfile;
  pressure: SubProfile;
  priced: SubProfile;
  declared: SubProfile;
  behavioral: SubProfile;
  tags: { tag: Tag; score: number; questionIds: number[] }[];
  doublePicks: number;
  /** פיזור הפרופיל: 0 = מרוכז בצבע אחד, 1 = מפוזר לגמרי */
  spread: number;
}

/**
 * תיקון לזמינות: לא כל צבע מופיע באותה תדירות באפשרויות התשובה.
 * בלי תיקון, צבע שמופיע בהרבה אפשרויות יקבל ציון גבוה גם אצל מי שעונה באקראי.
 * מחלקים את הציון הגולמי בבסיס הצפוי בבחירה אקראית (בחזקה GAMMA, עם רצפה
 * שמונעת מצבע נדיר "להתפוצץ" מבחירה אחת).
 */
const GAMMA = 1;
const BASE_FLOOR_SHARE = 0.07;
const SUB_GAMMA = 0.5;
const SUB_FLOOR_SHARE = 0.12;

function normalizedWeights(w: Partial<Record<Color, number>>) {
  const sum = Object.values(w).reduce((a, b) => a + (b ?? 0), 0);
  const out: Partial<Record<Color, number>> = {};
  for (const [c, v] of Object.entries(w)) out[c as Color] = (v ?? 0) / sum;
  return out;
}

function emptyColors(): Record<Color, number> {
  return Object.fromEntries(COLORS.map((c) => [c, 0])) as Record<Color, number>;
}

/** בסיס צפוי (בחירה אקראית) לסט שאלות */
function baselineFor(ids: number[]) {
  const base = emptyColors();
  for (const id of ids) {
    const q = keyFor(id);
    for (const o of q.options) {
      const nw = normalizedWeights(o.w);
      for (const c of COLORS) base[c] += (q.weight * (nw[c] ?? 0)) / q.options.length;
    }
  }
  return base;
}

function observedFor(ids: number[], answers: Answers) {
  const obs = emptyColors();
  for (const id of ids) {
    const sel = answers[id];
    if (!sel?.length) continue;
    const q = keyFor(id);
    for (const idx of sel) {
      const nw = normalizedWeights(q.options[idx].w);
      for (const c of COLORS) obs[c] += (q.weight * (nw[c] ?? 0)) / sel.length;
    }
  }
  return obs;
}

function correctedPct(ids: number[], answers: Answers, gamma = GAMMA, floorShare = BASE_FLOOR_SHARE) {
  const base = baselineFor(ids);
  const obs = observedFor(ids, answers);
  const totalBase = COLORS.reduce((a, c) => a + base[c], 0);
  const floor = totalBase * floorShare;
  const idx = emptyColors();
  for (const c of COLORS) idx[c] = obs[c] / Math.pow(Math.max(base[c], floor), gamma);
  const sum = COLORS.reduce((a, c) => a + idx[c], 0) || 1;
  const pct = emptyColors();
  for (const c of COLORS) pct[c] = (idx[c] / sum) * 100;
  return { pct, obs };
}

function subProfile(label: string, ids: number[], answers: Answers): SubProfile {
  const answered = ids.filter((id) => answers[id]?.length);
  // פרופיל-משנה מבוסס על מעט שאלות, ולכן התיקון לזמינות מתון יותר
  const { pct } = correctedPct(answered, answers, SUB_GAMMA, SUB_FLOOR_SHARE);
  const colors = COLORS.map((c) => ({ color: c, pct: round1(pct[c]) })).sort((a, b) => b.pct - a.pct);
  const lead = colors.filter((c) => c.pct >= colors[0].pct - 4 && c.pct > 0).slice(0, 3).map((c) => c.color);
  return { label, questionIds: answered, colors, lead };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const DOMAIN_LABELS: Record<Domain, string> = {
  career: "קריירה והישגים",
  money: "כסף ומשאבים",
  relationships: "מערכות יחסים וקרובים",
  conflict: "קונפליקט וויכוח",
  authority: "סמכות, כללים ואחריות",
  uncertainty: "אי ודאות וקבלת החלטות",
  failure: "כישלון וטעויות",
  difference: "שוני ואנשים אחרים",
  selfImage: "דימוי עצמי וערך עצמי",
};

export const SCORING_VERSION = 1;

export function score(answers: Answers): Scoring {
  const allIds = KEY.map((q) => q.id);
  const { pct, obs } = correctedPct(allIds, answers);

  // support: בכמה שאלות הצבע קיבל לפחות שליש מהמשקל של הבחירה
  const support = emptyColors();
  for (const q of KEY) {
    const sel = answers[q.id];
    if (!sel?.length) continue;
    const per = emptyColors();
    for (const idx of sel) {
      const nw = normalizedWeights(q.options[idx].w);
      for (const c of COLORS) per[c] += (nw[c] ?? 0) / sel.length;
    }
    for (const c of COLORS) if (per[c] >= 0.33) support[c] += 1;
  }

  const colors: ColorScore[] = COLORS.map((c) => ({
    color: c,
    raw: round1(obs[c]),
    pct: round1(pct[c]),
    support: support[c],
  })).sort((a, b) => b.pct - a.pct);

  // rounding fix so the displayed numbers sum to 100
  const drift = round1(100 - colors.reduce((a, c) => a + c.pct, 0));
  colors[0].pct = round1(colors[0].pct + drift);

  const [first, second] = colors;
  const gap = round1(first.pct - second.pct);
  const answeredCount = Object.values(answers).filter((s) => s?.length).length;
  const doublePicks = Object.values(answers).filter((s) => s?.length === 2).length;

  // spread = normalized entropy
  const ps = colors.map((c) => c.pct / 100).filter((p) => p > 0);
  const spread = round1((-ps.reduce((a, p) => a + p * Math.log(p), 0) / Math.log(COLORS.length)) * 100) / 100;

  const reasons: string[] = [];
  let confidence: ConfidenceLevel;
  if (gap >= 9 && first.support >= 10) confidence = "high";
  else if (gap >= 5 && first.support >= 8) confidence = "mediumHigh";
  else if (gap >= 2.5) confidence = "medium";
  else confidence = "low";

  reasons.push(`פער של ${gap} נקודות אחוז בין המערכת הראשונה לשנייה`);
  reasons.push(`המערכת המובילה הופיעה באופן משמעותי ב-${first.support} מתוך ${answeredCount} שאלות`);
  if (doublePicks >= 8) {
    reasons.push(`נבחרו שתי תשובות ב-${doublePicks} שאלות, מה שמטשטש מעט את התמונה`);
    if (confidence === "high") confidence = "mediumHigh";
    else if (confidence === "mediumHigh") confidence = "medium";
  }
  if (answeredCount < 24) {
    reasons.push(`נענו ${answeredCount} מתוך 24 שאלות`);
    if (answeredCount < 20) confidence = "low";
  }

  const clearDominant = gap >= 4;

  const domains: Partial<Record<Domain, SubProfile>> = {};
  for (const d of Object.keys(DOMAIN_LABELS) as Domain[]) {
    const ids = KEY.filter((q) => q.domains.includes(d)).map((q) => q.id);
    if (ids.length) domains[d] = subProfile(DOMAIN_LABELS[d], ids, answers);
  }

  // tags
  const tagMap = new Map<Tag, { score: number; ids: Set<number> }>();
  for (const q of KEY) {
    const sel = answers[q.id];
    if (!sel?.length) continue;
    for (const idx of sel) {
      for (const t of q.options[idx].tags) {
        const e = tagMap.get(t) ?? { score: 0, ids: new Set<number>() };
        e.score += 1 / sel.length;
        e.ids.add(q.id);
        tagMap.set(t, e);
      }
    }
  }
  const tags = [...tagMap.entries()]
    .map(([tag, e]) => ({ tag, score: round1(e.score), questionIds: [...e.ids].sort((a, b) => a - b) }))
    .sort((a, b) => b.score - a.score);

  const byFlag = (f: (q: (typeof KEY)[number]) => boolean) => KEY.filter(f).map((q) => q.id);

  return {
    version: SCORING_VERSION,
    colors,
    dominant: first.color,
    top3: colors.slice(0, 3).map((c) => c.color),
    clearDominant,
    confidence,
    confidenceReasons: reasons,
    gapTop2: gap,
    domains,
    calm: subProfile("מצבים רגועים", byFlag((q) => !q.pressure && !q.declared), answers),
    pressure: subProfile("תחת לחץ, כעס, עייפות או כישלון", byFlag((q) => q.pressure), answers),
    priced: subProfile("כשיש מחיר ממשי לבחירה", byFlag((q) => q.price && !q.declared), answers),
    declared: subProfile("ערכים מוצהרים (שאלות 23-24)", byFlag((q) => q.declared), answers),
    behavioral: subProfile("בחירות בתרחישים (שאלות 1-22)", byFlag((q) => !q.declared), answers),
    tags,
    doublePicks,
    spread,
  };
}

/** בדיקת תקינות של תשובות שהגיעו מהדפדפן */
export function validateAnswers(input: unknown): Answers {
  if (!input || typeof input !== "object") throw new Error("חסרות תשובות");
  const out: Answers = {};
  for (const q of KEY) {
    const v = (input as Record<string, unknown>)[String(q.id)];
    if (!Array.isArray(v) || v.length === 0) throw new Error(`יש לענות על שאלה ${q.id}`);
    const uniq = [...new Set(v)];
    if (uniq.length > q.maxSelect) throw new Error(`בשאלה ${q.id} נבחרו יותר מדי תשובות`);
    for (const idx of uniq) {
      if (!Number.isInteger(idx) || idx < 0 || idx >= q.options.length) throw new Error(`בשאלה ${q.id} נבחרה תשובה לא תקינה`);
    }
    out[q.id] = uniq as number[];
  }
  return out;
}
