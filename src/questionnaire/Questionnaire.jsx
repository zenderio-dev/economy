import { useState } from 'react';
import { Form } from 'react-aria-components';
import { specialProfiles } from '../domain/special.mjs';
import { Button } from '../ui/Button.jsx';
import { initialAnswers, sectionsByPurpose } from './fields.js';
import { PurposeChoices } from './PurposeChoices.jsx';
import { QuestionSection } from './QuestionSection.jsx';
import { SpecialQuestions } from './SpecialQuestions.jsx';
import './questionnaire.css';

export function Questionnaire({ onChange, onSubmit }) {
  const [answers, setAnswers] = useState(initialAnswers);
  const { purpose, specialType } = answers;
  const specialProfile = purpose === 'specialGoal' && specialProfiles[specialType];

  function updateAnswer(name, value) {
    setAnswers(current => ({ ...current, [name]: value }));
    onChange();
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <Form className="panel questionnaire" onSubmit={submit}>
      <h2 className="panel-heading">Ваш проект</h2>
      <PurposeChoices value={purpose} onChange={updateAnswer} />
      {sectionsByPurpose[purpose].map(section => (
        <QuestionSection key={section.title} {...section} answers={answers} onChange={updateAnswer} />
      ))}
      {specialProfile && <SpecialQuestions key={specialType} profile={specialProfile} onChange={onChange} />}
      <div className="form-actions">
        <Button type="submit">Получить рекомендацию</Button>
      </div>
    </Form>
  );
}
