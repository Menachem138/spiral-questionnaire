import "server-only";

/**
 * מפתח הניקוד הסודי של השאלון.
 *
 * הקובץ הזה נטען רק בצד השרת ולעולם לא נשלח לדפדפן, כך שהמשיבים לא יכולים
 * לגלות איזו תשובה קשורה לאיזה צבע ולענות "לפי התוצאה".
 *
 * כל תשובה מקבלת משקלות לצבע אחד או יותר (בדרך כלל 2+1: מערכת עיקרית ומשנית).
 * המשקלות מנורמלים כך שכל תשובה תורמת "יחידת ראיה" אחת בדיוק.
 * tags = המניעים/ההתנהגויות שהתשובה מבטאת (משמשים לניתוח המניעים, לא לצבעים).
 */

import { COLORS, type Color } from "../colors";

export { COLORS, type Color };

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

export interface OptionKey {
  w: Partial<Record<Color, number>>;
  tags: Tag[];
}

export interface QuestionKey {
  id: number;
  /** תחומי חיים שהשאלה בודקת */
  domains: Domain[];
  /** שאלה שבה המשאבים של האדם יורדים: כעס, עייפות, פגיעה, כישלון */
  pressure: boolean;
  /** שאלה שבה יש מחיר ממשי לבחירה (זמן, כסף, קשר, הישג) */
  price: boolean;
  /** שאלה שבודקת ערכים מוצהרים (משיכה/הגדרה עצמית) ולא התנהגות בתרחיש */
  declared: boolean;
  /** משקל השאלה בציון הכולל */
  weight: number;
  /** כמה תשובות מותר לבחור */
  maxSelect: number;
  /** המתח המרכזי בשאלה: מה מתנגש במה */
  tension: string;
  options: OptionKey[];
}

export const KEY: QuestionKey[] = [
  {
    id: 1,
    domains: ["career", "money"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "כסף והתקדמות מול זמן פנוי ואיכות חיים",
    options: [
      { w: { OR: 3 }, tags: ["achievement"] },
      { w: { OR: 2, YE: 1 }, tags: ["efficiency", "pragmatism"] },
      { w: { GR: 2, PU: 1 }, tags: ["care", "belonging"] },
      { w: { GR: 2, YE: 1 }, tags: ["time"] },
      { w: { YE: 2, OR: 1 }, tags: ["creativity", "pragmatism"] },
      { w: { OR: 1, RD: 1, YE: 1 }, tags: ["autonomy", "achievement"] },
    ],
  },
  {
    id: 2,
    domains: ["conflict", "selfImage"],
    pressure: true,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "הגנה על הכבוד והשם מול שמירה על הקשר והאווירה",
    options: [
      { w: { RD: 3 }, tags: ["power"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { OR: 2, BL: 1 }, tags: ["evidence", "action"] },
      { w: { PU: 2, GR: 1 }, tags: ["belonging", "harmony"] },
      { w: { YE: 2, RD: 1 }, tags: ["boundaries", "systems"] },
      { w: { BL: 2, GR: 1 }, tags: ["harmony", "order"] },
    ],
  },
  {
    id: 3,
    domains: ["career", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "השוואה ותחרות מול ערך עצמי פנימי",
    options: [
      { w: { OR: 2, RD: 1 }, tags: ["achievement"] },
      { w: { OR: 2, YE: 1 }, tags: ["achievement", "pragmatism"] },
      { w: { GR: 2, YE: 1 }, tags: ["selfReflection"] },
      { w: { YE: 2, GR: 1 }, tags: ["autonomy", "selfReflection"] },
      { w: { GR: 2, BL: 1 }, tags: ["care"] },
      { w: { YE: 2, TU: 1 }, tags: ["meaning", "selfReflection"] },
    ],
  },
  {
    id: 4,
    domains: ["conflict", "authority"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "עמידה על דעה עצמאית מול התאמה לקבוצה",
    options: [
      { w: { OR: 2, RD: 1 }, tags: ["autonomy", "power"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { GR: 1, PU: 1, YE: 1 }, tags: ["harmony", "belonging", "pragmatism"] },
      { w: { OR: 3 }, tags: ["evidence"] },
      { w: { YE: 2, GR: 1 }, tags: ["creativity"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
    ],
  },
  {
    id: 5,
    domains: ["authority", "career"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "מחויבות ויושרה מול יעילות ונוחות כשאף אחד לא רואה",
    options: [
      { w: { BL: 3 }, tags: ["order"] },
      { w: { YE: 2, OR: 1 }, tags: ["efficiency", "pragmatism"] },
      { w: { OR: 3 }, tags: ["efficiency"] },
      { w: { RD: 1, OR: 1, YE: 1 }, tags: ["pragmatism", "time"] },
      { w: { BL: 2, PU: 1 }, tags: ["order"] },
      { w: { YE: 2, OR: 1 }, tags: ["systems", "efficiency"] },
    ],
  },
  {
    id: 6,
    domains: ["relationships", "money"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "נאמנות ועזרה לאדם קרוב מול גבולות ואחריות אישית",
    options: [
      { w: { PU: 2, GR: 1 }, tags: ["belonging", "care"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { BL: 2, OR: 1 }, tags: ["order", "boundaries"] },
      { w: { OR: 3 }, tags: ["pragmatism", "efficiency"] },
      { w: { YE: 2, BL: 1 }, tags: ["boundaries"] },
      { w: { TU: 2, YE: 1 }, tags: ["holistic", "systems"] },
    ],
  },
  {
    id: 7,
    domains: ["authority", "career"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "שימוש בכוח ובסמכות מול שיתוף, כללים ותוצאה",
    options: [
      { w: { RD: 3 }, tags: ["power"] },
      { w: { BL: 3 }, tags: ["order"] },
      { w: { OR: 3 }, tags: ["achievement", "efficiency"] },
      { w: { GR: 3 }, tags: ["care", "fairness"] },
      { w: { YE: 3 }, tags: ["boundaries", "selfReflection"] },
      { w: { TU: 2, YE: 1 }, tags: ["holistic", "systems"] },
    ],
  },
  {
    id: 8,
    domains: ["failure", "authority"],
    pressure: true,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "לקיחת אחריות ושקיפות מול הגנה עצמית ותיקון שקט",
    options: [
      { w: { OR: 2, YE: 1 }, tags: ["action", "pragmatism"] },
      { w: { BL: 3 }, tags: ["order"] },
      { w: { OR: 2, RD: 1 }, tags: ["evidence"] },
      { w: { YE: 2, OR: 1 }, tags: ["systems"] },
      { w: { YE: 2, RD: 1 }, tags: ["pragmatism"] },
      { w: { GR: 2, YE: 1 }, tags: ["selfReflection"] },
    ],
  },
  {
    id: 9,
    domains: ["difference"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "פתיחות לשונה מול שמירה על נורמות הקבוצה",
    options: [
      { w: { OR: 2, YE: 1 }, tags: ["autonomy", "pragmatism"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { YE: 3 }, tags: ["selfReflection", "systems"] },
      { w: { GR: 3 }, tags: ["care", "belonging"] },
      { w: { BL: 2, PU: 1 }, tags: ["order", "belonging"] },
      { w: { YE: 2, TU: 1 }, tags: ["understanding", "holistic"] },
    ],
  },
  {
    id: 10,
    domains: ["conflict", "relationships"],
    pressure: true,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "עמידה על שלי תחת כעס מול שמירה על הקשר",
    options: [
      { w: { RD: 3 }, tags: ["power"] },
      { w: { GR: 1, PU: 1, BE: 1 }, tags: ["harmony"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { OR: 2, RD: 1 }, tags: ["power", "evidence"] },
      { w: { YE: 2, RD: 1 }, tags: ["boundaries"] },
      { w: { TU: 2, YE: 1 }, tags: ["holistic", "selfReflection"] },
    ],
  },
  {
    id: 11,
    domains: ["uncertainty", "money"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "צורך בוודאות מול יכולת להחליט בלי לדעת הכול",
    options: [
      { w: { PU: 2, BL: 1 }, tags: ["consult"] },
      { w: { YE: 3 }, tags: ["pragmatism", "evidence"] },
      { w: { RD: 2, BE: 1 }, tags: ["action"] },
      { w: { OR: 3 }, tags: ["evidence", "efficiency"] },
      { w: { YE: 2, OR: 1 }, tags: ["pragmatism", "action"] },
      { w: { BL: 2, OR: 1 }, tags: ["security"] },
    ],
  },
  {
    id: 12,
    domains: ["authority"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "כבוד לנוהל ולסדר מול שינוי, שיפור ואוטונומיה",
    options: [
      { w: { BL: 3 }, tags: ["order"] },
      { w: { YE: 2, OR: 1 }, tags: ["understanding", "systems"] },
      { w: { RD: 2, OR: 1 }, tags: ["autonomy", "power"] },
      { w: { OR: 2, BL: 1 }, tags: ["order", "action"] },
      { w: { GR: 3 }, tags: ["fairness", "belonging"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
    ],
  },
  {
    id: 13,
    domains: ["career", "authority"],
    pressure: true,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "תחושת עוול ותחרות מול הבנה מערכתית ובחירה אישית",
    options: [
      { w: { OR: 2, RD: 1 }, tags: ["achievement", "power"] },
      { w: { BL: 2, OR: 1 }, tags: ["fairness", "order"] },
      { w: { OR: 2, YE: 1 }, tags: ["evidence"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
      { w: { OR: 2, YE: 1 }, tags: ["pragmatism", "achievement"] },
      { w: { GR: 2, YE: 1 }, tags: ["meaning", "autonomy"] },
    ],
  },
  {
    id: 14,
    domains: ["career", "relationships"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "קריירה והתקדמות מול זמן עם הקרובים",
    options: [
      { w: { OR: 3 }, tags: ["achievement"] },
      { w: { PU: 2, GR: 1 }, tags: ["belonging", "care"] },
      { w: { OR: 2, YE: 1 }, tags: ["pragmatism", "efficiency"] },
      { w: { YE: 3 }, tags: ["creativity"] },
      { w: { YE: 2, TU: 1 }, tags: ["meaning"] },
      { w: { OR: 1, RD: 1, YE: 1 }, tags: ["autonomy", "achievement"] },
    ],
  },
  {
    id: 15,
    domains: ["relationships"],
    pressure: true,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "צורך אישי במנוחה מול היענות לאדם קרוב",
    options: [
      { w: { PU: 2, GR: 1 }, tags: ["belonging", "care"] },
      { w: { YE: 2, RD: 1 }, tags: ["boundaries"] },
      { w: { BE: 2, RD: 1 }, tags: ["time"] },
      { w: { YE: 2, GR: 1 }, tags: ["creativity", "care"] },
      { w: { OR: 2, RD: 1 }, tags: ["evidence"] },
      { w: { BL: 2, OR: 1 }, tags: ["order", "achievement"] },
    ],
  },
  {
    id: 16,
    domains: ["failure", "uncertainty"],
    pressure: true,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "התמדה בדרך מוכרת מול שינוי שיטה ושינוי מטרה",
    options: [
      { w: { OR: 2, RD: 1 }, tags: ["action"] },
      { w: { BL: 2, PU: 1 }, tags: ["security", "order"] },
      { w: { OR: 2, YE: 1 }, tags: ["evidence", "efficiency"] },
      { w: { GR: 2, PU: 1 }, tags: ["consult", "understanding"] },
      { w: { YE: 2, GR: 1 }, tags: ["meaning", "selfReflection"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
    ],
  },
  {
    id: 17,
    domains: ["conflict", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "הגנה על העמדה מול פתיחות לטעות",
    options: [
      { w: { BL: 2, RD: 1 }, tags: ["power", "order"] },
      { w: { GR: 2, YE: 1 }, tags: ["understanding"] },
      { w: { OR: 3 }, tags: ["evidence"] },
      { w: { BL: 1, PU: 1, YE: 1 }, tags: ["consult", "selfReflection"] },
      { w: { YE: 2, GR: 1 }, tags: ["harmony", "pragmatism"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems", "understanding"] },
    ],
  },
  {
    id: 18,
    domains: ["money"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "צמיחה, ביטחון, הנאה ונתינה",
    options: [
      { w: { OR: 3 }, tags: ["achievement"] },
      { w: { BL: 2, PU: 1 }, tags: ["security"] },
      { w: { RD: 3 }, tags: ["enjoyment"] },
      { w: { OR: 2, YE: 1 }, tags: ["achievement"] },
      { w: { PU: 2, GR: 1 }, tags: ["belonging", "care"] },
      { w: { YE: 2, OR: 1 }, tags: ["autonomy", "time"] },
    ],
  },
  {
    id: 19,
    domains: ["authority", "uncertainty"],
    pressure: false,
    price: true,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "אחריות, הוגנות ומניעת נזק כשאין פתרון מושלם",
    options: [
      { w: { BL: 3 }, tags: ["order"] },
      { w: { GR: 3 }, tags: ["fairness", "care"] },
      { w: { OR: 2, YE: 1 }, tags: ["pragmatism", "evidence"] },
      { w: { BL: 2, RD: 1 }, tags: ["autonomy", "order"] },
      { w: { YE: 2, OR: 1 }, tags: ["creativity"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
    ],
  },
  {
    id: 20,
    domains: ["uncertainty", "selfImage"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "יציבות של דעה מול שינוי עמדה",
    options: [
      { w: { BL: 2, OR: 1 }, tags: ["evidence", "security"] },
      { w: { OR: 2, YE: 1 }, tags: ["evidence", "pragmatism"] },
      { w: { YE: 2, GR: 1 }, tags: ["selfReflection"] },
      { w: { OR: 3 }, tags: ["evidence"] },
      { w: { GR: 3 }, tags: ["understanding"] },
      { w: { TU: 2, YE: 1 }, tags: ["holistic", "systems"] },
    ],
  },
  {
    id: 21,
    domains: ["failure", "uncertainty"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "עצמאות מול התייעצות כשאין פתרון מיידי",
    options: [
      { w: { RD: 2, OR: 1 }, tags: ["autonomy"] },
      { w: { PU: 2, BL: 1 }, tags: ["consult"] },
      { w: { YE: 2, OR: 1 }, tags: ["understanding", "evidence"] },
      { w: { OR: 2, YE: 1 }, tags: ["action", "pragmatism"] },
      { w: { GR: 3 }, tags: ["care"] },
      { w: { YE: 2, TU: 1 }, tags: ["systems"] },
    ],
  },
  {
    id: 22,
    domains: ["relationships", "difference"],
    pressure: false,
    price: false,
    declared: false,
    weight: 1,
    maxSelect: 2,
    tension: "רצון להגן על אדם אהוב מול כבוד לחירות שלו",
    options: [
      { w: { BL: 2, PU: 1 }, tags: ["power", "care"] },
      { w: { YE: 2, GR: 1 }, tags: ["autonomy"] },
      { w: { OR: 2, BL: 1 }, tags: ["evidence"] },
      { w: { GR: 3 }, tags: ["understanding"] },
      { w: { YE: 2, RD: 1 }, tags: ["boundaries"] },
      { w: { YE: 2, GR: 1 }, tags: ["creativity", "care"] },
    ],
  },
  {
    id: 23,
    domains: ["career", "money"],
    pressure: false,
    price: true,
    declared: true,
    weight: 1,
    maxSelect: 2,
    tension: "הישג ומעמד מול זמן, יציבות ומשמעות",
    options: [
      { w: { OR: 3 }, tags: ["achievement"] },
      { w: { BL: 2, PU: 1 }, tags: ["security"] },
      { w: { GR: 2, RD: 1 }, tags: ["time"] },
      { w: { OR: 1, RD: 1, YE: 1 }, tags: ["autonomy"] },
      { w: { YE: 3 }, tags: ["creativity"] },
      { w: { YE: 2, TU: 1 }, tags: ["meaning"] },
    ],
  },
  {
    id: 24,
    domains: ["selfImage"],
    pressure: false,
    price: false,
    declared: true,
    weight: 1.5,
    maxSelect: 1,
    tension: "המניע המרכזי בתקופה הנוכחית (הגדרה עצמית)",
    options: [
      { w: { PU: 3 }, tags: ["belonging", "security"] },
      { w: { RD: 3 }, tags: ["power", "autonomy"] },
      { w: { OR: 3 }, tags: ["achievement"] },
      { w: { GR: 3 }, tags: ["fairness", "care"] },
      { w: { YE: 2, OR: 1 }, tags: ["understanding", "efficiency"] },
      { w: { TU: 3 }, tags: ["holistic"] },
      { w: { BL: 3 }, tags: ["order", "security"] },
      { w: { YE: 2, GR: 1 }, tags: ["meaning", "autonomy"] },
    ],
  },
];

export function keyFor(id: number): QuestionKey {
  const k = KEY.find((q) => q.id === id);
  if (!k) throw new Error(`no key for question ${id}`);
  return k;
}
