"use client";

import dynamic from "next/dynamic";

/** השאלון נטען רק בדפדפן כדי לשחזר התקדמות שמורה בלי הבהוב */
const Questionnaire = dynamic(() => import("./Questionnaire"), {
  ssr: false,
  loading: () => <div className="min-h-dvh" />,
});

export default Questionnaire;
