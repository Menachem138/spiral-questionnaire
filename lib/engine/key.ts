import "server-only";
import { COLORS, type Color } from "../colors";

export { COLORS, type Color };

/**
 * מפתח הניקוד הסודי של השאלון (לפי "מפתח ניקוד סודי - מפת המניעים").
 *
 * - נטען רק בצד השרת ולעולם לא נשלח לדפדפן.
 * - כל תשובה היא וקטור קבוע של 8 מדדים [B, P, R, BL, O, G, Y, T] בסולם 0-4.
 *   אין מיפוי "אחד לאחד": תשובה יכולה לתרום לכמה מערכות בו-זמנית.
 * - לכל שאלה יש מטא-דאטה: סוג מדידה, מערכות ראשיות/משניות, קבוצות אימות ומשקל.
 * - המשקל נקבע לפי סדר העדיפות של הראיות:
 *   התנהגות בפועל > בחירה תחת מחיר אישי > בחירה בקונפליקט > תגובה טבעית
 *   > העדפה כללית > הצהרה ישירה על ערכים.
 */

export type Tag =
  | "achievement"
  | "autonomy"
  | "power"
  | "order"
  | "security"
  | "belonging"
  | "care"
  | "understanding"
  | "harmony"
  | "fairness"
  | "efficiency"
  | "evidence"
  | "boundaries"
  | "systems"
  | "holistic"
  | "meaning"
  | "creativity"
  | "selfReflection"
  | "pragmatism"
  | "enjoyment"
  | "time"
  | "consult"
  | "action";

export type Domain =
  | "career"
  | "money"
  | "relationships"
  | "conflict"
  | "authority"
  | "uncertainty"
  | "failure"
  | "difference"
  | "selfImage";

/** סוגי המדידה מהמפרט */
export type QuestionType =
  | "VALUE"
  | "BEHAVIOR"
  | "CONFLICT"
  | "PRESSURE"
  | "AUTHORITY"
  | "UNCERTAINTY"
  | "CHANGE"
  | "RELATIONSHIPS"
  | "SUCCESS"
  | "SYSTEMS";

/** סוג הראיה, שקובע את משקל השאלה */
export type EvidenceKind = "behavior" | "price" | "conflict" | "natural" | "preference" | "declaration";

export const EVIDENCE_WEIGHT: Record<EvidenceKind, number> = {
  behavior: 1.25,
  price: 1.2,
  conflict: 1.1,
  natural: 1.0,
  preference: 0.85,
  declaration: 0.6,
};

/** קבוצות אימות: שאלות שבודקות מניע דומה מזוויות שונות */
export type ValidationGroup =
  | "ACHIEVEMENT_VS_TIME"
  | "SUCCESS_AND_COMPETITION"
  | "RELATIONSHIPS_UNDER_PRICE"
  | "CONFLICT_STYLE"
  | "RULES_AND_AUTHORITY"
  | "UNCERTAINTY_AND_CHANGE"
  | "OPENNESS_TO_DIFFERENCE"
  | "INDEPENDENCE_VS_BELONGING";

/**
 * צירי ערכים לזיהוי סתירות: לכל תשובה אפשר לסמן לאיזה צד של המתח היא נוטה.
 * +1 = הצד הראשון בשם הציר, -1 = הצד השני.
 */
export type Axis =
  | "career_vs_people" // הישג/קריירה/כסף (+1) מול זמן/קשרים/קרובים (-1)
  | "independence_vs_belonging" // עצמאות (+1) מול שייכות/התאמה לקבוצה (-1)
  | "principle_vs_efficiency" // עיקרון/כלל/מחויבות (+1) מול יעילות/פרגמטיות (-1)
  | "stability_vs_change"; // יציבות/שמירה על הקיים (+1) מול שינוי/ניסוי (-1)

export interface OptionKey {
  w: Partial<Record<Color, number>>;
  tags: Tag[];
  axes?: Partial<Record<Axis, 1 | -1>>;
}

export interface QuestionKey {
  id: number;
  type: QuestionType[];
  evidence: EvidenceKind;
  primary: Color[];
  secondary: Color[];
  groups: ValidationGroup[];
  domains: Domain[];
  /** שאלה שבה המשאבים של האדם יורדים: כעס, עייפות, פגיעה, כישלון */
  pressure: boolean;
  /** שאלה שבה יש מחיר ממשי לבחירה */
  price: boolean;
  /** שאלה שבודקת ערכים מוצהרים (משיכה/הגדרה עצמית) ולא התנהגות בתרחיש */
  declared: boolean;
  weight: number;
  maxSelect: number;
  /** המתח המרכזי בשאלה */
  tension: string;
  options: OptionKey[];
}

const o = (w: OptionKey["w"], tags: Tag[], axes?: OptionKey["axes"]): OptionKey => ({ w, tags, axes });

type Def = Omit<QuestionKey, "weight" | "maxSelect"> & { maxSelect?: number };
const q = (d: Def): QuestionKey => ({ ...d, weight: EVIDENCE_WEIGHT[d.evidence], maxSelect: d.maxSelect ?? 2 });

export const KEY: QuestionKey[] = [
  q({
    id: 1,
    type: ["CONFLICT", "SUCCESS"],
    evidence: "price",
    primary: ["OR", "GR"],
    secondary: ["YE", "PU", "RD"],
    groups: ["ACHIEVEMENT_VS_TIME"],
    domains: ["career", "money"],
    pressure: false,
    price: true,
    declared: false,
    tension: "כסף והתקדמות מול זמן פנוי ואיכות חיים",
    options: [
      o({ OR: 4, BL: 1, RD: 1 }, ["achievement"], { career_vs_people: 1 }),
      o({ OR: 3, YE: 2 }, ["efficiency", "pragmatism"]),
      o({ GR: 3, PU: 2 }, ["care", "belonging"], { career_vs_people: -1 }),
      o({ GR: 3, YE: 2 }, ["time"], { career_vs_people: -1 }),
      o({ YE: 4, OR: 2 }, ["creativity", "pragmatism"]),
      o({ OR: 2, YE: 2, RD: 1 }, ["autonomy", "achievement"], { career_vs_people: 1, independence_vs_belonging: 1 }),
    ],
  }),
  q({
    id: 2,
    type: ["PRESSURE", "RELATIONSHIPS"],
    evidence: "natural",
    primary: ["RD", "GR"],
    secondary: ["OR", "BL", "PU", "YE"],
    groups: ["CONFLICT_STYLE"],
    domains: ["conflict", "selfImage"],
    pressure: true,
    price: false,
    declared: false,
    tension: "הגנה על הכבוד והשם מול שמירה על הקשר והאווירה",
    options: [
      o({ RD: 4, BL: 1 }, ["power"], { independence_vs_belonging: 1 }),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ OR: 3, BL: 2 }, ["evidence", "action"]),
      o({ PU: 3, GR: 2 }, ["belonging", "harmony"], { independence_vs_belonging: -1 }),
      o({ YE: 3, RD: 1, BL: 1 }, ["boundaries", "systems"]),
      o({ BL: 3, GR: 2 }, ["harmony", "order"]),
    ],
  }),
  q({
    id: 3,
    type: ["SUCCESS"],
    evidence: "natural",
    primary: ["OR", "GR", "YE"],
    secondary: ["RD", "TU"],
    groups: ["SUCCESS_AND_COMPETITION"],
    domains: ["career", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    tension: "השוואה ותחרות מול ערך עצמי פנימי",
    options: [
      o({ OR: 4, RD: 2 }, ["achievement"]),
      o({ OR: 4, YE: 1 }, ["achievement", "pragmatism"]),
      o({ GR: 3, YE: 2 }, ["selfReflection"]),
      o({ YE: 3, GR: 2 }, ["autonomy", "selfReflection"]),
      o({ GR: 3, BL: 1 }, ["care"]),
      o({ YE: 3, TU: 2 }, ["meaning", "selfReflection"]),
    ],
  }),
  q({
    id: 4,
    type: ["AUTHORITY", "CONFLICT"],
    evidence: "conflict",
    primary: ["OR", "GR", "YE"],
    secondary: ["RD", "PU", "TU"],
    groups: ["CONFLICT_STYLE", "INDEPENDENCE_VS_BELONGING"],
    domains: ["conflict", "authority"],
    pressure: false,
    price: false,
    declared: false,
    tension: "עמידה על דעה עצמאית מול התאמה לקבוצה",
    options: [
      o({ OR: 2, RD: 2, YE: 1 }, ["autonomy", "power"], { independence_vs_belonging: 1 }),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ PU: 2, GR: 2, YE: 1 }, ["harmony", "belonging", "pragmatism"], { independence_vs_belonging: -1 }),
      o({ OR: 4, YE: 1 }, ["evidence"]),
      o({ YE: 4, GR: 2 }, ["creativity"]),
      o({ YE: 3, TU: 2 }, ["systems"]),
    ],
  }),
  q({
    id: 5,
    type: ["BEHAVIOR", "AUTHORITY"],
    evidence: "behavior",
    primary: ["BL", "OR"],
    secondary: ["YE", "RD", "PU"],
    groups: ["RULES_AND_AUTHORITY"],
    domains: ["authority", "career"],
    pressure: false,
    price: true,
    declared: false,
    tension: "מחויבות ויושרה מול יעילות ונוחות כשאף אחד לא רואה",
    options: [
      o({ BL: 4, PU: 1 }, ["order"], { principle_vs_efficiency: 1 }),
      o({ YE: 3, OR: 2 }, ["efficiency", "pragmatism"], { principle_vs_efficiency: -1 }),
      o({ OR: 4, YE: 1 }, ["efficiency"], { principle_vs_efficiency: -1 }),
      o({ RD: 2, OR: 2, YE: 1 }, ["pragmatism", "time"], { principle_vs_efficiency: -1 }),
      o({ BL: 4, PU: 2 }, ["order"], { principle_vs_efficiency: 1 }),
      o({ YE: 3, OR: 3 }, ["systems", "efficiency"], { principle_vs_efficiency: -1 }),
    ],
  }),
  q({
    id: 6,
    type: ["RELATIONSHIPS", "CONFLICT"],
    evidence: "price",
    primary: ["PU", "GR", "BL"],
    secondary: ["OR", "YE", "TU"],
    groups: ["RELATIONSHIPS_UNDER_PRICE", "INDEPENDENCE_VS_BELONGING"],
    domains: ["relationships", "money"],
    pressure: false,
    price: true,
    declared: false,
    tension: "נאמנות ועזרה לאדם קרוב מול גבולות ואחריות אישית",
    options: [
      o({ PU: 4, GR: 2 }, ["belonging", "care"], { independence_vs_belonging: -1 }),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ BL: 3, OR: 2, RD: 1 }, ["order", "boundaries"], { principle_vs_efficiency: 1, independence_vs_belonging: 1 }),
      o({ OR: 4, YE: 1 }, ["pragmatism", "efficiency"]),
      o({ YE: 3, BL: 2 }, ["boundaries"]),
      o({ TU: 3, YE: 2, GR: 1 }, ["holistic", "systems"]),
    ],
  }),
  q({
    id: 7,
    type: ["AUTHORITY", "VALUE"],
    evidence: "preference",
    primary: ["RD", "BL", "OR", "GR", "YE"],
    secondary: ["TU"],
    groups: ["RULES_AND_AUTHORITY"],
    domains: ["authority", "career"],
    pressure: false,
    price: false,
    declared: false,
    tension: "שימוש בכוח ובסמכות מול שיתוף, כללים ותוצאה",
    options: [
      o({ RD: 4, OR: 1 }, ["power"]),
      o({ BL: 4, PU: 1 }, ["order"], { principle_vs_efficiency: 1 }),
      o({ OR: 4, YE: 1 }, ["achievement", "efficiency"], { principle_vs_efficiency: -1 }),
      o({ GR: 4, YE: 1 }, ["care", "fairness"]),
      o({ YE: 4, BL: 1 }, ["boundaries", "selfReflection"]),
      o({ TU: 3, YE: 2, GR: 1 }, ["holistic", "systems"]),
    ],
  }),
  q({
    id: 8,
    type: ["BEHAVIOR", "SUCCESS"],
    evidence: "behavior",
    primary: ["BL", "OR", "YE"],
    secondary: ["RD", "GR"],
    groups: ["SUCCESS_AND_COMPETITION", "RULES_AND_AUTHORITY"],
    domains: ["failure", "authority"],
    pressure: true,
    price: true,
    declared: false,
    tension: "לקיחת אחריות ושקיפות מול הגנה עצמית ותיקון שקט",
    options: [
      o({ OR: 3, YE: 2 }, ["action", "pragmatism"], { principle_vs_efficiency: -1 }),
      o({ BL: 4, GR: 1 }, ["order"], { principle_vs_efficiency: 1 }),
      o({ OR: 3, RD: 2 }, ["evidence"]),
      o({ YE: 4, OR: 2 }, ["systems"]),
      o({ YE: 3, RD: 1, BE: 1 }, ["pragmatism"], { principle_vs_efficiency: -1 }),
      o({ GR: 3, YE: 2 }, ["selfReflection"]),
    ],
  }),
  q({
    id: 9,
    type: ["RELATIONSHIPS", "SYSTEMS"],
    evidence: "natural",
    primary: ["GR", "YE", "BL"],
    secondary: ["OR", "PU", "TU"],
    groups: ["OPENNESS_TO_DIFFERENCE"],
    domains: ["difference"],
    pressure: false,
    price: false,
    declared: false,
    tension: "פתיחות לשונה מול שמירה על נורמות הקבוצה",
    options: [
      o({ OR: 3, YE: 2 }, ["autonomy", "pragmatism"]),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ YE: 4, GR: 1 }, ["selfReflection", "systems"]),
      o({ GR: 4, PU: 1 }, ["care", "belonging"]),
      o({ BL: 4, PU: 2 }, ["order", "belonging"], { independence_vs_belonging: -1, principle_vs_efficiency: 1 }),
      o({ YE: 3, TU: 2 }, ["understanding", "holistic"]),
    ],
  }),
  q({
    id: 10,
    type: ["PRESSURE", "RELATIONSHIPS"],
    evidence: "natural",
    primary: ["RD", "GR", "YE"],
    secondary: ["OR", "PU", "TU", "BE"],
    groups: ["CONFLICT_STYLE"],
    domains: ["conflict", "relationships"],
    pressure: true,
    price: false,
    declared: false,
    tension: "עמידה על שלי תחת כעס מול שמירה על הקשר",
    options: [
      o({ RD: 4, OR: 1 }, ["power"], { independence_vs_belonging: 1 }),
      o({ PU: 2, GR: 2, BE: 1 }, ["harmony"]),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ OR: 3, RD: 2, BL: 1 }, ["power", "evidence"]),
      o({ YE: 3, RD: 2 }, ["boundaries"]),
      o({ TU: 3, YE: 2, GR: 1 }, ["holistic", "selfReflection"]),
    ],
  }),
  q({
    id: 11,
    type: ["UNCERTAINTY", "BEHAVIOR"],
    evidence: "conflict",
    primary: ["OR", "YE"],
    secondary: ["PU", "RD", "BL"],
    groups: ["UNCERTAINTY_AND_CHANGE"],
    domains: ["uncertainty", "money"],
    pressure: false,
    price: true,
    declared: false,
    tension: "צורך בוודאות מול יכולת להחליט בלי לדעת הכול",
    options: [
      o({ PU: 3, BL: 2 }, ["consult"], { independence_vs_belonging: -1 }),
      o({ YE: 4, OR: 2 }, ["pragmatism", "evidence"]),
      o({ RD: 3, BE: 1, PU: 1 }, ["action"]),
      o({ OR: 4, YE: 1 }, ["evidence", "efficiency"]),
      o({ YE: 3, OR: 2 }, ["pragmatism", "action"]),
      o({ BL: 3, OR: 2 }, ["security"], { stability_vs_change: 1 }),
    ],
  }),
  q({
    id: 12,
    type: ["AUTHORITY", "SYSTEMS"],
    evidence: "conflict",
    primary: ["BL", "YE", "GR"],
    secondary: ["RD", "OR", "TU"],
    groups: ["RULES_AND_AUTHORITY"],
    domains: ["authority"],
    pressure: false,
    price: false,
    declared: false,
    tension: "כבוד לנוהל ולסדר מול שינוי, שיפור ואוטונומיה",
    options: [
      o({ BL: 4, PU: 1 }, ["order"], { principle_vs_efficiency: 1, stability_vs_change: 1 }),
      o({ YE: 3, OR: 1, BL: 1 }, ["understanding", "systems"]),
      o({ RD: 3, OR: 2 }, ["autonomy", "power"], { independence_vs_belonging: 1, principle_vs_efficiency: -1 }),
      o({ OR: 3, BL: 2 }, ["order", "action"], { stability_vs_change: -1 }),
      o({ GR: 4, PU: 1 }, ["fairness", "belonging"]),
      o({ YE: 3, TU: 2 }, ["systems"]),
    ],
  }),
  q({
    id: 13,
    type: ["SUCCESS", "AUTHORITY"],
    evidence: "natural",
    primary: ["OR", "BL", "YE"],
    secondary: ["RD", "GR", "TU"],
    groups: ["SUCCESS_AND_COMPETITION"],
    domains: ["career", "authority"],
    pressure: true,
    price: false,
    declared: false,
    tension: "תחושת עוול ותחרות מול הבנה מערכתית ובחירה אישית",
    options: [
      o({ OR: 4, RD: 2 }, ["achievement", "power"]),
      o({ BL: 4, OR: 1 }, ["fairness", "order"], { principle_vs_efficiency: 1 }),
      o({ OR: 3, YE: 2 }, ["evidence"]),
      o({ YE: 3, TU: 1, GR: 1 }, ["systems"]),
      o({ OR: 3, YE: 2 }, ["pragmatism", "achievement"], { principle_vs_efficiency: -1 }),
      o({ GR: 3, YE: 2 }, ["meaning", "autonomy"], { stability_vs_change: -1 }),
    ],
  }),
  q({
    id: 14,
    type: ["CONFLICT", "RELATIONSHIPS", "SUCCESS"],
    evidence: "price",
    primary: ["OR", "PU", "GR"],
    secondary: ["YE", "RD", "TU"],
    groups: ["ACHIEVEMENT_VS_TIME", "RELATIONSHIPS_UNDER_PRICE"],
    domains: ["career", "relationships"],
    pressure: false,
    price: true,
    declared: false,
    tension: "קריירה והתקדמות מול זמן עם הקרובים",
    options: [
      o({ OR: 4, RD: 1 }, ["achievement"], { career_vs_people: 1 }),
      o({ PU: 3, GR: 3 }, ["belonging", "care"], { career_vs_people: -1 }),
      o({ OR: 3, YE: 2 }, ["pragmatism", "efficiency"]),
      o({ YE: 4, OR: 1 }, ["creativity"]),
      o({ YE: 3, TU: 1, GR: 1 }, ["meaning"]),
      o({ OR: 2, YE: 2, RD: 1 }, ["autonomy", "achievement"], { career_vs_people: 1, independence_vs_belonging: 1 }),
    ],
  }),
  q({
    id: 15,
    type: ["PRESSURE", "RELATIONSHIPS", "BEHAVIOR"],
    evidence: "price",
    primary: ["PU", "YE", "BL"],
    secondary: ["GR", "RD", "OR", "BE"],
    groups: ["RELATIONSHIPS_UNDER_PRICE"],
    domains: ["relationships"],
    pressure: true,
    price: true,
    declared: false,
    tension: "צורך אישי במנוחה מול היענות לאדם קרוב",
    options: [
      o({ PU: 3, GR: 2, BL: 1 }, ["belonging", "care"], { career_vs_people: -1, independence_vs_belonging: -1 }),
      o({ YE: 3, RD: 2 }, ["boundaries"], { independence_vs_belonging: 1 }),
      o({ BE: 3, RD: 2 }, ["time"]),
      o({ YE: 3, GR: 2 }, ["creativity", "care"]),
      o({ OR: 3, RD: 2 }, ["evidence"]),
      o({ BL: 3, OR: 2 }, ["order", "achievement"]),
    ],
  }),
  q({
    id: 16,
    type: ["CHANGE", "BEHAVIOR"],
    evidence: "conflict",
    primary: ["OR", "YE"],
    secondary: ["BL", "GR", "RD", "TU"],
    groups: ["UNCERTAINTY_AND_CHANGE", "SUCCESS_AND_COMPETITION"],
    domains: ["failure", "uncertainty"],
    pressure: true,
    price: false,
    declared: false,
    tension: "התמדה בדרך מוכרת מול שינוי שיטה ושינוי מטרה",
    options: [
      o({ OR: 3, RD: 2 }, ["action"], { stability_vs_change: -1 }),
      o({ BL: 3, PU: 2 }, ["security", "order"], { stability_vs_change: 1 }),
      o({ OR: 4, YE: 2 }, ["evidence", "efficiency"], { stability_vs_change: -1 }),
      o({ GR: 3, PU: 2 }, ["consult", "understanding"], { independence_vs_belonging: -1 }),
      o({ YE: 3, GR: 2 }, ["meaning", "selfReflection"], { stability_vs_change: -1 }),
      o({ YE: 3, TU: 2 }, ["systems"]),
    ],
  }),
  q({
    id: 17,
    type: ["CHANGE", "CONFLICT"],
    evidence: "natural",
    primary: ["BL", "GR", "OR", "YE"],
    secondary: ["RD", "PU", "TU"],
    groups: ["CONFLICT_STYLE", "OPENNESS_TO_DIFFERENCE"],
    domains: ["conflict", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    tension: "הגנה על העמדה מול פתיחות לטעות",
    options: [
      o({ BL: 3, RD: 2 }, ["power", "order"], { stability_vs_change: 1 }),
      o({ GR: 3, YE: 2 }, ["understanding"]),
      o({ OR: 4, YE: 1 }, ["evidence"]),
      o({ PU: 2, BL: 1, YE: 2 }, ["consult", "selfReflection"]),
      o({ YE: 3, GR: 2 }, ["harmony", "pragmatism"]),
      o({ YE: 3, TU: 2 }, ["systems", "understanding"]),
    ],
  }),
  q({
    id: 18,
    type: ["SUCCESS", "BEHAVIOR"],
    evidence: "conflict",
    primary: ["OR", "BL", "RD", "PU"],
    secondary: ["YE", "GR"],
    groups: ["ACHIEVEMENT_VS_TIME"],
    domains: ["money"],
    pressure: false,
    price: true,
    declared: false,
    tension: "צמיחה, ביטחון, הנאה ונתינה",
    options: [
      o({ OR: 4, YE: 1 }, ["achievement"], { career_vs_people: 1 }),
      o({ BL: 3, PU: 2 }, ["security"], { stability_vs_change: 1 }),
      o({ RD: 4, BE: 1 }, ["enjoyment"]),
      o({ OR: 3, YE: 2 }, ["achievement"], { career_vs_people: 1 }),
      o({ PU: 3, GR: 2 }, ["belonging", "care"], { career_vs_people: -1 }),
      o({ YE: 3, OR: 2, RD: 1 }, ["autonomy", "time"], { independence_vs_belonging: 1 }),
    ],
  }),
  q({
    id: 19,
    type: ["SYSTEMS", "AUTHORITY"],
    evidence: "natural",
    primary: ["BL", "GR", "OR", "YE"],
    secondary: ["RD", "TU"],
    groups: ["RULES_AND_AUTHORITY"],
    domains: ["authority", "uncertainty"],
    pressure: false,
    price: true,
    declared: false,
    tension: "אחריות, הוגנות ומניעת נזק כשאין פתרון מושלם",
    options: [
      o({ BL: 4, PU: 1 }, ["order"], { principle_vs_efficiency: 1 }),
      o({ GR: 4, BL: 1 }, ["fairness", "care"]),
      o({ OR: 3, YE: 2 }, ["pragmatism", "evidence"], { principle_vs_efficiency: -1 }),
      o({ BL: 3, RD: 2 }, ["autonomy", "order"], { independence_vs_belonging: 1, principle_vs_efficiency: 1 }),
      o({ YE: 3, OR: 2 }, ["creativity"]),
      o({ YE: 3, TU: 2 }, ["systems"]),
    ],
  }),
  q({
    id: 20,
    type: ["CHANGE", "UNCERTAINTY"],
    evidence: "natural",
    primary: ["BL", "OR", "GR", "YE"],
    secondary: ["TU"],
    groups: ["UNCERTAINTY_AND_CHANGE", "OPENNESS_TO_DIFFERENCE"],
    domains: ["uncertainty", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    tension: "יציבות של דעה מול שינוי עמדה",
    options: [
      o({ BL: 3, OR: 2 }, ["evidence", "security"], { stability_vs_change: 1 }),
      o({ OR: 3, YE: 2 }, ["evidence", "pragmatism"], { stability_vs_change: -1 }),
      o({ YE: 3, GR: 2 }, ["selfReflection"]),
      o({ OR: 4, YE: 1 }, ["evidence"]),
      o({ GR: 4, YE: 1 }, ["understanding"]),
      o({ TU: 3, YE: 2 }, ["holistic", "systems"]),
    ],
  }),
  q({
    id: 21,
    type: ["UNCERTAINTY", "BEHAVIOR"],
    evidence: "behavior",
    primary: ["RD", "PU", "OR", "YE"],
    secondary: ["BL", "GR", "TU"],
    groups: ["UNCERTAINTY_AND_CHANGE", "INDEPENDENCE_VS_BELONGING"],
    domains: ["failure", "uncertainty"],
    pressure: false,
    price: false,
    declared: false,
    tension: "עצמאות מול התייעצות כשאין פתרון מיידי",
    options: [
      o({ RD: 3, OR: 2 }, ["autonomy"], { independence_vs_belonging: 1 }),
      o({ PU: 3, BL: 2 }, ["consult"], { independence_vs_belonging: -1 }),
      o({ YE: 3, OR: 2 }, ["understanding", "evidence"]),
      o({ OR: 3, YE: 2 }, ["action", "pragmatism"]),
      o({ GR: 4, PU: 1 }, ["care"], { independence_vs_belonging: -1 }),
      o({ YE: 3, TU: 2 }, ["systems"]),
    ],
  }),
  q({
    id: 22,
    type: ["RELATIONSHIPS", "BEHAVIOR"],
    evidence: "conflict",
    primary: ["BL", "GR", "YE"],
    secondary: ["PU", "OR", "RD", "TU"],
    groups: ["RELATIONSHIPS_UNDER_PRICE", "OPENNESS_TO_DIFFERENCE"],
    domains: ["relationships", "difference"],
    pressure: false,
    price: false,
    declared: false,
    tension: "רצון להגן על אדם אהוב מול כבוד לחירות שלו",
    options: [
      o({ BL: 3, PU: 2, RD: 1 }, ["power", "care"]),
      o({ YE: 3, GR: 2 }, ["autonomy"]),
      o({ OR: 3, BL: 2 }, ["evidence"]),
      o({ GR: 4, YE: 1 }, ["understanding"]),
      o({ YE: 3, RD: 2 }, ["boundaries"]),
      o({ YE: 3, GR: 2, TU: 1 }, ["creativity", "care"]),
    ],
  }),
  q({
    id: 23,
    type: ["VALUE", "SUCCESS"],
    evidence: "preference",
    primary: ["OR", "BL", "GR", "YE"],
    secondary: ["RD", "TU"],
    groups: ["ACHIEVEMENT_VS_TIME", "UNCERTAINTY_AND_CHANGE"],
    domains: ["career", "money"],
    pressure: false,
    price: true,
    declared: true,
    tension: "הישג ומעמד מול זמן, יציבות ומשמעות",
    options: [
      o({ OR: 4, RD: 1 }, ["achievement"], { career_vs_people: 1 }),
      o({ BL: 3, PU: 2 }, ["security"], { stability_vs_change: 1 }),
      o({ GR: 3, RD: 1 }, ["time"], { career_vs_people: -1 }),
      o({ OR: 2, YE: 2, RD: 1 }, ["autonomy"], { career_vs_people: 1, independence_vs_belonging: 1 }),
      o({ YE: 4, OR: 1 }, ["creativity"]),
      o({ YE: 3, TU: 2 }, ["meaning"]),
    ],
  }),
  q({
    id: 24,
    type: ["VALUE"],
    evidence: "declaration",
    primary: ["PU", "RD", "OR", "GR", "YE", "TU", "BL"],
    secondary: [],
    groups: ["INDEPENDENCE_VS_BELONGING"],
    domains: ["selfImage"],
    pressure: false,
    price: false,
    declared: true,
    maxSelect: 1,
    tension: "המניע המרכזי בתקופה הנוכחית (הגדרה עצמית)",
    options: [
      o({ PU: 4, BE: 1 }, ["belonging", "security"], { independence_vs_belonging: -1 }),
      o({ RD: 4 }, ["power", "autonomy"], { independence_vs_belonging: 1 }),
      o({ OR: 4 }, ["achievement"], { career_vs_people: 1 }),
      o({ GR: 4 }, ["fairness", "care"]),
      o({ YE: 3, OR: 2 }, ["understanding", "efficiency"]),
      o({ TU: 4 }, ["holistic"]),
      o({ BL: 4 }, ["order", "security"], { principle_vs_efficiency: 1, stability_vs_change: 1 }),
      o({ YE: 3, GR: 1 }, ["meaning", "autonomy"], { independence_vs_belonging: 1 }),
    ],
  }),
];

export function keyFor(id: number): QuestionKey {
  const k = KEY.find((x) => x.id === id);
  if (!k) throw new Error(`no key for question ${id}`);
  return k;
}

export const GROUP_HE: Record<ValidationGroup, string> = {
  ACHIEVEMENT_VS_TIME: "הישג וכסף מול זמן וחיים אישיים",
  SUCCESS_AND_COMPETITION: "הצלחה, תחרות וכישלון",
  RELATIONSHIPS_UNDER_PRICE: "קרובים כשיש מחיר",
  CONFLICT_STYLE: "סגנון קונפליקט",
  RULES_AND_AUTHORITY: "כללים, סמכות ואחריות",
  UNCERTAINTY_AND_CHANGE: "אי ודאות ושינוי",
  OPENNESS_TO_DIFFERENCE: "פתיחות לשונה ולדעה אחרת",
  INDEPENDENCE_VS_BELONGING: "עצמאות מול שייכות",
};

export const AXIS_HE: Record<Axis, [string, string]> = {
  career_vs_people: ["הישג, קריירה וכסף", "זמן, קשרים וקרובים"],
  independence_vs_belonging: ["עצמאות", "שייכות והתאמה לקבוצה"],
  principle_vs_efficiency: ["עיקרון, כלל ומחויבות", "יעילות ופרגמטיות"],
  stability_vs_change: ["יציבות ושמירה על הקיים", "שינוי וניסוי"],
};
