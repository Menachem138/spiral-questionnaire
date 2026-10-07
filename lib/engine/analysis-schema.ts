/** מבנה הדוח האישי שמנוע הניתוח מחזיר (לפי המבנה הסופי שהוגדר בהנחיות). */

export type EvidenceLevel = "עובדה" | "פרשנות מבוססת" | "השערה";
export type ConfidenceHe = "גבוהה" | "בינונית-גבוהה" | "בינונית" | "נמוכה";

export interface EvidenceRow {
  conclusion: string;
  supporting_questions: number[];
  contradicting_questions: number[];
  level: EvidenceLevel;
  confidence: ConfidenceHe;
}

export interface TopSystem {
  color: string;
  what_it_represents: string;
  how_it_shows_in_you: string;
  strength: string;
  possible_cost: string;
  when_it_gets_stronger: string;
  when_another_takes_over: string;
}

export interface AnalysisResult {
  evidence_table: EvidenceRow[];
  short_summary: string;
  which_color_am_i: string;
  percentages_note: string;
  big_picture: string;
  dominant_system: string;
  top_three: TopSystem[];
  decision_making: string;
  value_conflicts: string;
  under_pressure: string;
  what_drives_you: string;
  money_success_freedom: string;
  relationships_belonging: string;
  authority_rules_independence: string;
  change_uncertainty: string;
  failure_competition: string;
  context_differences: string;
  paradoxes: { title: string; text: string }[];
  declared_vs_chosen: string;
  strengths: { title: string; text: string; why_we_say_this: string }[];
  blind_spots: { title: string; what_seems_to_happen: string; based_on: string; why_it_matters: string; what_to_do: string }[];
  tips: { tip: string; why_it_fits_you: string }[];
  how_others_may_see_you: string;
  what_you_might_not_see: string;
  most_interesting: string;
  one_sentence: string;
  closing_paragraph: string;
  confidence_level: ConfidenceHe;
  confidence_explanation: string;
}

const str = { type: "string" } as const;
const intArr = { type: "array", items: { type: "integer" } } as const;
const conf = { type: "string", enum: ["גבוהה", "בינונית-גבוהה", "בינונית", "נמוכה"] } as const;

function obj(props: Record<string, unknown>) {
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}

export const ANALYSIS_JSON_SCHEMA = obj({
  evidence_table: {
    type: "array",
    items: obj({
      conclusion: str,
      supporting_questions: intArr,
      contradicting_questions: intArr,
      level: { type: "string", enum: ["עובדה", "פרשנות מבוססת", "השערה"] },
      confidence: conf,
    }),
  },
  short_summary: str,
  which_color_am_i: str,
  percentages_note: str,
  big_picture: str,
  dominant_system: str,
  top_three: {
    type: "array",
    items: obj({
      color: { type: "string", enum: ["BE", "PU", "RD", "BL", "OR", "GR", "YE", "TU"] },
      what_it_represents: str,
      how_it_shows_in_you: str,
      strength: str,
      possible_cost: str,
      when_it_gets_stronger: str,
      when_another_takes_over: str,
    }),
  },
  decision_making: str,
  value_conflicts: str,
  under_pressure: str,
  what_drives_you: str,
  money_success_freedom: str,
  relationships_belonging: str,
  authority_rules_independence: str,
  change_uncertainty: str,
  failure_competition: str,
  context_differences: str,
  paradoxes: { type: "array", items: obj({ title: str, text: str }) },
  declared_vs_chosen: str,
  strengths: { type: "array", items: obj({ title: str, text: str, why_we_say_this: str }) },
  blind_spots: {
    type: "array",
    items: obj({ title: str, what_seems_to_happen: str, based_on: str, why_it_matters: str, what_to_do: str }),
  },
  tips: { type: "array", items: obj({ tip: str, why_it_fits_you: str }) },
  how_others_may_see_you: str,
  what_you_might_not_see: str,
  most_interesting: str,
  one_sentence: str,
  closing_paragraph: str,
  confidence_level: conf,
  confidence_explanation: str,
});
