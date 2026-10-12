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
const BASIS = /^\*\*על מה זה מבוסס:?\*\*:?\s*/;

export function Paragraphs({ text, className = "" }: { text: string; className?: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <div className={`prose-he ${className}`}>
      {paras.map((p, i) =>
        BASIS.test(p) ? (
          // הביסוס מוצג בנפרד וקטן, כדי לא לקטוע את הקריאה
          <p key={i} className="!mt-5 rounded-xl bg-bg-2/70 px-4 py-3 text-[13.5px] leading-6 text-muted">
            <span className="font-semibold text-ink-2">על מה זה מבוסס: </span>
            <Rich text={p.replace(BASIS, "")} />
          </p>
        ) : (
        <p key={i}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              <Rich text={line} />
            </Fragment>
          ))}
        </p>
        ),
      )}
    </div>
  );
}
