import { useState } from 'react';
import { specialAnswerOptions } from '../domain/special.mjs';
import { QuestionSection } from './QuestionSection.jsx';

const countField = {
  name: 'special_count',
  label: 'Сколько будет участников?',
  type: 'number',
  min: 1,
  max: 100_000,
  step: 1,
};

export function SpecialQuestions({ profile, onChange }) {
  const [answers, setAnswers] = useState({});
  const fields = profile.checks.map(({ id, label, help }) => ({
    name: `special_${id}`, label, help, options: specialAnswerOptions,
  }));
  if (profile.count) fields.push(countField);

  function updateAnswer(name, value) {
    setAnswers(current => ({ ...current, [name]: value }));
    onChange();
  }

  return (
    <QuestionSection title="Условия создания" fields={fields} answers={answers} onChange={updateAnswer}>
      <p>{profile.intro}</p>
    </QuestionSection>
  );
}
