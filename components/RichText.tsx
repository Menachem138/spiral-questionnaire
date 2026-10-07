import { Fragment } from "react";

/** מציג טקסט עם הדגשות **...** כמו בטקסט המקורי */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-bold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

/** פסקאות מטקסט של הניתוח (שורה ריקה = פסקה חדשה) */
export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`prose-he ${className}`}>
      {paras.map((p, i) => (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              <Rich text={line} />
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
