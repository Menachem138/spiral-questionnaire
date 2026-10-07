import data from "./questionnaire.generated.json";

export interface QOption {
  letter: string;
  text: string;
}
export interface Question {
  id: number;
  title: string;
  scenario: string[];
  instruction: string;
  options: QOption[];
}

export const INTRO = data.intro;
export const QUESTIONS: Question[] = data.questions;

/** שאלה 24 מבקשת במפורש "רק משפט אחד"; בשאר השאלות ההנחיה מאפשרת עד שתיים */
export const maxSelectFor = (id: number) => (id === 24 ? 1 : 2);
