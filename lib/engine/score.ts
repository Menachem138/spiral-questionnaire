import "server-only";
import { COLOR_META } from "../colors";
import { AXIS_HE, COLORS, GROUP_HE, KEY, keyFor, type Axis, type Color, type Domain, type Tag, type ValidationGroup } from "./key";

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

export type DominanceMode = "single" | "pair" | "trio";
export type Level3 = "high" | "medium" | "low";

export interface GroupConsistency {
  group: ValidationGroup;
  label: string;
  questionIds: number[];
  lead: Color;
  /** חלקה של המערכת המובילה בקבוצה (0-1) */
  leadShare: number;
  level: Level3;
}

export interface AxisReading {
  axis: Axis;
  sides: [string, string];
  /** שאלות התנהגות שבהן הבחירה נטתה לצד הראשון / השני */
  behavioralFirst: number[];
  behavioralSecond: number[];
  declaredFirst: number[];
  declaredSecond: number[];
}

export type ContradictionKind =
  | "DECLARED_VS_BEHAVIOR"
  | "CONTEXT_DIFFERENCE"
  | "INTERNAL_CONTRADICTION"
  | "CALM_VS_PRESSURE"
  | "PRICE_VS_NO_PRICE";

export interface Contradiction {
  kind: ContradictionKind;
  /** 0 = אין, 5 = פער חזק ועקבי (פנימי, לא מוצג למשתמש כמספר) */
  strength: number;
  description: string;
  questionIds: number[];
}

export interface Scoring {
  version: number;
  /** מצב הדומיננטיות: מערכת אחת, שתיים או שלוש מערכות צמודות */
  dominance: DominanceMode;
  consistency: { score: number; level: Level3; groups: GroupConsistency[] };
  axes: AxisReading[];
  contradictions: Contradiction[];
  unpriced: SubProfile;
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
const GAMMA = 0.9;
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

export const SCORING_VERSION = 2;

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

  // מצב דומיננטיות (סעיף 13 במפרט): 31/17/14 -> מערכת אחת; 25/24/22 -> שלוש מערכות בולטות
  const third = colors[2];
  const dominance: DominanceMode = gap >= 4 ? "single" : first.pct - third.pct <= 4 ? "trio" : "pair";
  const clearDominant = dominance === "single";

  const consistency = computeConsistency(answers);

  // רמת ביטחון: אינה אותו דבר כמו האחוז. משלבת פער, תמיכה ועקביות בין שאלות אימות.
  const reasons: string[] = [];
  let points = 0;
  points += gap >= 9 ? 3 : gap >= 5 ? 2 : gap >= 2.5 ? 1 : 0;
  points += first.support >= 12 ? 2 : first.support >= 8 ? 1 : 0;
  points += consistency.level === "high" ? 2 : consistency.level === "medium" ? 1 : 0;
  reasons.push(`פער של ${gap} נקודות אחוז בין המערכת הראשונה לשנייה`);
  reasons.push(`המערכת המובילה הופיעה באופן משמעותי ב-${first.support} מתוך ${answeredCount} שאלות`);
  reasons.push(`עקביות בין שאלות שבודקות מניע דומה: ${LEVEL_HE[consistency.level]}`);
  if (doublePicks >= 8) {
    points -= 1;
    reasons.push(`נבחרו שתי תשובות ב-${doublePicks} שאלות, מה שמטשטש מעט את התמונה`);
  }
  let confidence: ConfidenceLevel = points >= 6 ? "high" : points >= 4 ? "mediumHigh" : points >= 2 ? "medium" : "low";
  if (answeredCount < 24) {
    reasons.push(`נענו ${answeredCount} מתוך 24 שאלות`);
    if (answeredCount < 20) confidence = "low";
  }

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

  const calm = subProfile("מצבים רגועים", byFlag((q) => !q.pressure && !q.declared), answers);
  const pressure = subProfile("תחת לחץ, כעס, עייפות או כישלון", byFlag((q) => q.pressure), answers);
  const priced = subProfile("כשיש מחיר ממשי לבחירה", byFlag((q) => q.price && !q.declared), answers);
  const unpriced = subProfile("כשאין מחיר ממשי", byFlag((q) => !q.price && !q.declared), answers);
  const declared = subProfile("ערכים מוצהרים (שאלות 23-24)", byFlag((q) => q.declared), answers);
  const behavioral = subProfile("בחירות בתרחישים (שאלות 1-22)", byFlag((q) => !q.declared), answers);
  const axes = readAxes(answers);
  const contradictions = findContradictions({ axes, consistency, calm, pressure, priced, unpriced, declared, behavioral });

  return {
    version: SCORING_VERSION,
    dominance,
    consistency,
    axes,
    contradictions,
    unpriced,
    colors,
    dominant: first.color,
    top3: colors.slice(0, 3).map((c) => c.color),
    clearDominant,
    confidence,
    confidenceReasons: reasons,
    gapTop2: gap,
    domains,
    calm,
    pressure,
    priced,
    declared,
    behavioral,
    tags,
    doublePicks,
    spread,
  };
}


const he = (c: Color) => COLOR_META[c].he;

const LEVEL_HE: Record<Level3, string> = { high: "גבוהה", medium: "בינונית", low: "נמוכה" };

/** וקטור הבחירה המנורמל בשאלה (ממוצע אם נבחרו שתי תשובות) */
function selectionVector(id: number, answers: Answers) {
  const sel = answers[id];
  const per = emptyColors();
  if (!sel?.length) return null;
  const q = keyFor(id);
  for (const idx of sel) {
    const nw = normalizedWeights(q.options[idx].w);
    for (const c of COLORS) per[c] += (nw[c] ?? 0) / sel.length;
  }
  return per;
}

/**
 * מדד עקביות (סעיף 15): האם שאלות שבודקות מניע דומה מזוויות שונות מצביעות לאותו כיוון.
 * לכל קבוצת אימות: חלקה של המערכת המובילה בקבוצה.
 */
function computeConsistency(answers: Answers): Scoring["consistency"] {
  const groups = Object.keys(GROUP_HE) as ValidationGroup[];
  const out: GroupConsistency[] = [];
  for (const g of groups) {
    const ids = KEY.filter((q) => q.groups.includes(g) && answers[q.id]?.length).map((q) => q.id);
    if (ids.length < 2) continue;
    const sum = emptyColors();
    for (const id of ids) {
      const v = selectionVector(id, answers)!;
      for (const c of COLORS) sum[c] += v[c];
    }
    const lead = [...COLORS].sort((a, b) => sum[b] - sum[a])[0];
    const leadShare = sum[lead] / ids.length;
    const level: Level3 = leadShare >= 0.55 ? "high" : leadShare >= 0.4 ? "medium" : "low";
    out.push({ group: g, label: GROUP_HE[g], questionIds: ids, lead, leadShare: Math.round(leadShare * 100) / 100, level });
  }
  const score = out.length ? out.reduce((a, g) => a + g.leadShare, 0) / out.length : 0;
  const level: Level3 = score >= 0.5 ? "high" : score >= 0.4 ? "medium" : "low";
  return { score: Math.round(score * 100) / 100, level, groups: out };
}

function readAxes(answers: Answers): AxisReading[] {
  return (Object.keys(AXIS_HE) as Axis[]).map((axis) => {
    const r: AxisReading = {
      axis,
      sides: AXIS_HE[axis],
      behavioralFirst: [],
      behavioralSecond: [],
      declaredFirst: [],
      declaredSecond: [],
    };
    for (const q of KEY) {
      for (const idx of answers[q.id] ?? []) {
        const v = q.options[idx].axes?.[axis];
        if (!v) continue;
        const list = q.declared
          ? v > 0 ? r.declaredFirst : r.declaredSecond
          : v > 0 ? r.behavioralFirst : r.behavioralSecond;
        if (!list.includes(q.id)) list.push(q.id);
      }
    }
    return r;
  });
}

/**
 * מנגנון זיהוי סתירות (סעיפים 7-16 במפרט הסתירות).
 * מבחין בין הבדל הקשר לבין סתירה פנימית, ובין הצהרה לבחירה בפועל.
 * סתירה מוצגת למשתמש רק כשיש לה כמה סימנים בלתי תלויים (strength >= 3).
 */
function findContradictions(p: {
  axes: AxisReading[];
  consistency: Scoring["consistency"];
  calm: SubProfile;
  pressure: SubProfile;
  priced: SubProfile;
  unpriced: SubProfile;
  declared: SubProfile;
  behavioral: SubProfile;
}): Contradiction[] {
  const out: Contradiction[] = [];

  for (const a of p.axes) {
    const [first, second] = a.sides;
    const bF = a.behavioralFirst.length;
    const bS = a.behavioralSecond.length;
    const dF = a.declaredFirst.length;
    const dS = a.declaredSecond.length;
    if (dF + dS > 0) {
      const declaredSide = dF >= dS ? 1 : -1;
      const opposite = declaredSide > 0 ? bS : bF;
      const same = declaredSide > 0 ? bF : bS;
      if (opposite >= 2 && opposite > same) {
        out.push({
          kind: "DECLARED_VS_BEHAVIOR",
          strength: Math.min(5, 1 + opposite + (same === 0 ? 1 : 0)),
          description: `בהצהרה נטייה ל"${declaredSide > 0 ? first : second}", אבל בבחירות בתרחישים נבחר יותר "${declaredSide > 0 ? second : first}"`,
          questionIds: [...a.declaredFirst, ...a.declaredSecond, ...a.behavioralFirst, ...a.behavioralSecond].sort((x, y) => x - y),
        });
      }
    }
    if (bF >= 1 && bS >= 1 && bF + bS >= 3) {
      out.push({
        kind: "CONTEXT_DIFFERENCE",
        strength: Math.min(3, Math.min(bF, bS) + 1),
        description: `בציר "${first}" מול "${second}": ${bF} בחירות לצד הראשון (שאלות ${a.behavioralFirst.join(", ")}) ו-${bS} לצד השני (שאלות ${a.behavioralSecond.join(", ")}). כדאי לבדוק מה השתנה בין המצבים.`,
        questionIds: [...a.behavioralFirst, ...a.behavioralSecond].sort((x, y) => x - y),
      });
    }
  }

  // ערכים מוצהרים מול בחירות בפועל, ברמת המערכות
  const declaredLead = p.declared.colors[0];
  if (declaredLead && declaredLead.pct > 0) {
    const rank = p.behavioral.colors.findIndex((c) => c.color === declaredLead.color) + 1;
    if (rank >= 4) {
      out.push({
        kind: "DECLARED_VS_BEHAVIOR",
        strength: rank >= 6 ? 3 : 2,
        description: `המערכת המובילה בהצהרה (${he(declaredLead.color)}) נמצאת רק במקום ${rank} בבחירות בתרחישים (המובילה שם: ${he(p.behavioral.colors[0].color)})`,
        questionIds: [...p.declared.questionIds],
      });
    }
  }

  const shift = (x: SubProfile, y: SubProfile, kind: ContradictionKind, text: string) => {
    const a = x.colors[0];
    const b = y.colors[0];
    if (!a || !b || a.color === b.color) return;
    const bInX = x.colors.find((c) => c.color === b.color)?.pct ?? 0;
    const diff = b.pct - bInX;
    if (diff < 8) return;
    out.push({
      kind,
      strength: diff >= 20 ? 3 : diff >= 12 ? 2 : 1,
      description: `${text}: ${he(a.color)} מוביל ב"${x.label}", ו${he(b.color)} מוביל ב"${y.label}" (הפרש של ${round1(diff)} נקודות)`,
      questionIds: [...y.questionIds],
    });
  };
  shift(p.calm, p.pressure, "CALM_VS_PRESSURE", "שינוי תחת לחץ");
  shift(p.unpriced, p.priced, "PRICE_VS_NO_PRICE", "שינוי כשיש מחיר");

  for (const g of p.consistency.groups) {
    if (g.level === "low" && g.questionIds.length >= 3) {
      out.push({
        kind: "INTERNAL_CONTRADICTION",
        strength: 1,
        description: `שאלות שבודקות "${g.label}" מצביעות לכיוונים שונים`,
        questionIds: g.questionIds,
      });
    }
  }

  return out.sort((a, b) => b.strength - a.strength);
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
