// Converts content/questionnaire.md (the original text, untouched) into structured JSON.
// The text itself is never rewritten: only markdown/HTML wrappers are stripped.
// Bold segments are kept as **...** so the UI can render the original emphasis.
import { readFileSync, writeFileSync } from "node:fs";

const src = readFileSync(new URL("../content/questionnaire.md", import.meta.url), "utf8");

const clean = (line) =>
  line
    .replace(/<div dir="rtl">/g, "")
    .replace(/<\/div>/g, "")
    .replace(/\s+$/g, "")
    .replace(/^\s+/g, "");

const lines = src.split("\n").map(clean);
const sepIdx = lines.findIndex((l) => l === "⸻");
const introLines = lines.slice(0, sepIdx).filter((l) => l !== "");
const body = lines.slice(sepIdx);

// ---- intro ----
const intro = {
  title: introLines[0],
  subtitle: introLines[1].replace(/\*\*/g, ""),
  beforeHeading: introLines[2].replace(/\*\*/g, "").replace(/\s+/g, " ").trim(),
  paragraphs: [],
  howHeading: "",
  rules: [],
};
for (const l of introLines.slice(3)) {
  const m = l.match(/^(\*\*)?\s*(\d+)\.\s*(.*)$/);
  if (/^\*\*חשוב/.test(l)) intro.howHeading = l.replace(/\*\*/g, "");
  else if (m) {
    let text = (m[1] ? "**" : "") + m[3];
    text = text.replace(/^\*\*\s+/, "**");
    intro.rules.push(text.trim());
  } else intro.paragraphs.push(l);
}

// ---- questions ----
const LETTERS = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח"];
const questions = [];
let cur = null;
for (const l of body) {
  if (l === "" || l === "⸻") continue;
  const qm = l.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);
  if (qm) {
    cur = { id: Number(qm[1]), title: qm[2].trim(), scenario: [], instruction: "", options: [] };
    questions.push(cur);
    continue;
  }
  if (!cur) throw new Error("text before first question: " + l);
  if (l.startsWith("**איך לבחור:**")) {
    cur.instruction = l.replace("**איך לבחור:**", "").trim();
    continue;
  }
  const om = l.match(/^([א-ח])\.\s+(.+)$/);
  if (om && cur.instruction) {
    cur.options.push({ letter: om[1], text: om[2] });
    continue;
  }
  cur.scenario.push(l);
}

// sanity checks
if (questions.length !== 24) throw new Error("expected 24 questions, got " + questions.length);
for (const q of questions) {
  q.options.forEach((o, i) => {
    if (o.letter !== LETTERS[i]) throw new Error(`Q${q.id}: bad letter order`);
  });
  if (!q.instruction) throw new Error(`Q${q.id}: missing instruction`);
  if (q.options.length < 6) throw new Error(`Q${q.id}: only ${q.options.length} options`);
}

writeFileSync(
  new URL("../lib/questionnaire.generated.json", import.meta.url),
  JSON.stringify({ intro, questions }, null, 2) + "\n",
);
console.log("ok:", questions.length, "questions,", intro.rules.length, "rules");
