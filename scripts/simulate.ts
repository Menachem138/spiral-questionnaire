// Sanity check for the scoring engine: random respondents should spread evenly,
// "pure" respondents should come out clearly in their own color.
// Run: npm run simulate
import { KEY, COLORS } from "../lib/engine/key";
import { score, type Answers } from "../lib/engine/score";

const N = 3000;
const avg: Record<string, number> = {};
COLORS.forEach((c) => (avg[c] = 0));
const domCount: Record<string, number> = {};
const conf: Record<string, number> = {};
for (let i = 0; i < N; i++) {
  const a: Answers = {};
  for (const q of KEY) a[q.id] = [Math.floor(Math.random() * q.options.length)];
  const s = score(a);
  s.colors.forEach((c) => (avg[c.color] += c.pct / N));
  domCount[s.dominant] = (domCount[s.dominant] || 0) + 1;
  conf[s.confidence] = (conf[s.confidence] || 0) + 1;
}
console.log("RANDOM avg pct", Object.fromEntries(Object.entries(avg).map(([k, v]) => [k, +v.toFixed(1)])));
console.log("RANDOM dominant", domCount);
console.log("RANDOM confidence", conf);

for (const target of COLORS) {
  const a: Answers = {};
  for (const q of KEY) {
    let best = 0;
    let bv = -1;
    q.options.forEach((o, i) => {
      const s = Object.values(o.w).reduce((x, y) => x + (y ?? 0), 0);
      const v = (o.w[target] ?? 0) / s;
      if (v > bv) {
        bv = v;
        best = i;
      }
    });
    a[q.id] = [best];
  }
  const s = score(a);
  console.log(
    "PURE",
    target,
    "->",
    s.colors.slice(0, 4).map((c) => `${c.color} ${c.pct}`).join(", "),
    "|",
    s.confidence,
    "gap",
    s.gapTop2,
  );
}

// sub-profile sanity: one green answer in the 2-question "difference" domain should not read as red
{
  const a: Answers = {};
  for (const q of KEY) a[q.id] = [0];
  a[9] = [3];
  a[22] = [4];
  const d = score(a).domains.difference!;
  console.log("SUB difference (Q9=ד, Q22=ה) ->", d.colors.slice(0, 3).map((c) => `${c.color} ${c.pct}`).join(", "));
}
