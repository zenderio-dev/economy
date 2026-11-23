import { useEffect, useRef, useState } from 'react';
import { rank } from './domain/selection.mjs';
import { Questionnaire } from './questionnaire/Questionnaire.jsx';
import { Results } from './results/Results.jsx';

export function App() {
  const [submission, setSubmission] = useState(null);
  const result = useRef(null);

  useEffect(() => {
    if (submission) result.current.focus();
  }, [submission]);

  return (
    <main className="shell page-main">
      <div className="intro">
        <h1>Как оформить бизнес?</h1>
        <p className="intro-copy">Ответьте на вопросы о проекте и получите рекомендацию по выбору организационно-правовой формы.</p>
      </div>
      <div className="workspace">
        <Questionnaire
          onChange={() => setSubmission(null)}
          onSubmit={answers => setSubmission({ answers, ranking: rank(answers) })}
        />
        {submission && (
          <div className="result-anchor" role="region" aria-labelledby="result-title" ref={result} tabIndex={-1}>
            <Results answers={submission.answers} ranking={submission.ranking} />
          </div>
        )}
      </div>
    </main>
  );
}
