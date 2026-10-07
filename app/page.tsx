import Questionnaire from "@/components/QuestionnaireClient";
import { INTRO, QUESTIONS } from "@/lib/questionnaire";

export default function Home() {
  return (
    <main>
      <Questionnaire intro={INTRO} questions={QUESTIONS} />
    </main>
  );
}
