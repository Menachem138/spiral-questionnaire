export const COLORS = ["BE", "PU", "RD", "BL", "OR", "GR", "YE", "TU"] as const;
export type Color = (typeof COLORS)[number];

export const COLOR_META: Record<Color, { he: string; en: string; hex: string; theme: string }> = {
  BE: { he: "בז'", en: "Beige", hex: "#C9A97A", theme: "הישרדות וצרכים בסיסיים" },
  PU: { he: "סגול", en: "Purple", hex: "#7B4FA0", theme: "שייכות, נאמנות וביטחון" },
  RD: { he: "אדום", en: "Red", hex: "#D23A3A", theme: "כוח, עצמיות ועמידה על שלי" },
  BL: { he: "כחול", en: "Blue", hex: "#2459A8", theme: "סדר, מחויבות ואמת" },
  OR: { he: "כתום", en: "Orange", hex: "#EE8A2A", theme: "הישג, אסטרטגיה ותוצאות" },
  GR: { he: "ירוק", en: "Green", hex: "#2E9E5B", theme: "קהילה, רגישות והוגנות" },
  YE: { he: "צהוב", en: "Yellow", hex: "#E2B712", theme: "מערכתיות, גמישות ופונקציונליות" },
  TU: { he: "טורקיז", en: "Turquoise", hex: "#18A3A8", theme: "שלמות, קשרים ותמונה כוללת" },
};

export const CONFIDENCE_HE = {
  high: "גבוהה",
  mediumHigh: "בינונית-גבוהה",
  medium: "בינונית",
  low: "נמוכה",
} as const;

export const TAG_HE: Record<string, string> = {
  achievement: "הישג והתקדמות",
  autonomy: "עצמאות וחופש",
  power: "עמידה על שלי וכוח",
  order: "סדר, כללים ומחויבות",
  security: "ביטחון ויציבות",
  belonging: "שייכות ונאמנות לקרובים",
  care: "התחשבות ואכפתיות",
  understanding: "רצון להבין את האחר",
  harmony: "שמירה על שקט והימנעות מעימות",
  fairness: "הוגנות",
  efficiency: "יעילות ותועלת",
  evidence: "נתונים ועובדות",
  boundaries: "הצבת גבולות",
  systems: "חשיבה מערכתית",
  holistic: "תמונה רחבה וקשרים",
  meaning: "משמעות ואותנטיות",
  creativity: "פתרון שלישי ויצירתיות",
  selfReflection: "התבוננות עצמית",
  pragmatism: "פרגמטיות",
  enjoyment: "הנאה מהרגע",
  time: "זמן פנוי ומנוחה",
  consult: "התייעצות והישענות על אחר",
  action: "פעולה מיידית",
};
