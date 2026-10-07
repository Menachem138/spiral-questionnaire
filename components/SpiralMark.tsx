const HUES = ["#C9A97A", "#7B4FA0", "#D23A3A", "#2459A8", "#EE8A2A", "#2E9E5B", "#E2B712", "#18A3A8"];

/** סמל ספירלה ארכימדית: שמונה מקטעים בשמונה הצבעים, מבפנים החוצה */
export function SpiralMark({ size = 56, spin = false, muted = false }: { size?: number; spin?: boolean; muted?: boolean }) {
  const turns = 2.6;
  const total = turns * 2 * Math.PI;
  const seg = total / HUES.length;
  const steps = 18;
  const paths = HUES.map((color, i) => {
    const pts: string[] = [];
    for (let s = 0; s <= steps; s++) {
      const t = i * seg + (seg * s) / steps;
      const r = 3 + (t / total) * 43;
      pts.push(`${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`);
    }
    return { color, d: `M${pts.join(" L")}`, w: 2.2 + i * 0.45 };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={spin ? "spin-slow" : undefined}
      style={muted ? { opacity: 0.55, filter: "saturate(0.55)" } : undefined}
    >
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.color} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
