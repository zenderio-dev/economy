import { forms, isEligible } from '../domain/selection.mjs';
import { guidance } from '../domain/guidance.mjs';
import { FinanceExample } from './FinanceExample.jsx';
import './results.css';

const assessmentTitles = {
  blocked: 'Есть препятствия для создания',
  pending: 'Нужно уточнить условия',
  preliminary: 'Базовые условия предварительно выполнены',
};

const conditionLabels = {
  confirmed: 'Указано «да»',
  blocked: 'Препятствие',
  pending: 'Нужно уточнить',
};

function formatScore(score) {
  return score > 0 ? `+${score}` : String(score);
}

function NextSteps({ steps, source: [label, url] }) {
  return (
    <>
      <h3>Что делать дальше</h3>
      <ol>{steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p><a href={url}>{label}</a></p>
    </>
  );
}

function SpecialResult({ form, assessment }) {
  const [name, description] = form;

  return (
    <article className="panel result-panel" aria-labelledby="result-title">
      <h2 id="result-title">{name}</h2>
      <p className="result-lead">{description}</p>
      <h3>{assessmentTitles[assessment.status]}</h3>
      <ul className="assessment-list">
        {assessment.checks.map(check => (
          <li key={check.label}>
            <span className="status-label" data-status={check.status}>{conditionLabels[check.status]}</span>
            <div><strong>{check.label}</strong> {check.help}</div>
          </li>
        ))}
      </ul>
      <div className="result-guidance">
        <p>{assessment.economic}</p>
        <NextSteps steps={assessment.steps} source={assessment.source} />
        <p className="result-note">Подтвердите ответы документами и проверьте отраслевые условия перед регистрацией.</p>
      </div>
    </article>
  );
}

function Comparison({ ranking, expanded }) {
  return (
    <details className="comparison" open={expanded || undefined}>
      <summary>Сравнить формы и посмотреть ограничения</summary>
      <div className="comparison-grid">
        {ranking.map(row => (
          <article className="comparison-card" key={row.key}>
            <h3>{forms[row.key][0]}</h3>
            <p>{row.excluded.length ? 'Есть ограничения' : row.pending.length ? 'Нужно уточнить условия' : `Баллы: ${formatScore(row.score)}`}</p>
            <ul>{[...row.excluded, ...row.pending, ...row.reasons].map(reason => <li key={reason}>{reason}</li>)}</ul>
          </article>
        ))}
      </div>
    </details>
  );
}

function Recommendation({ best, needsClarification }) {
  if (!best) {
    return (
      <>
        <h2 id="result-title">{needsClarification ? 'Нужно уточнить условия' : 'При этих условиях подходящей формы нет'}</h2>
        <p className="result-lead">
          {needsClarification ? 'В сравнении ниже указано, какие сведения нужны для рекомендации.' : 'В сравнении ниже указаны причины, по которым формы не подходят.'}
        </p>
      </>
    );
  }

  const [name, description] = forms[best.key];
  const info = guidance[best.key];

  return (
    <>
      <h2 id="result-title">Рекомендация: {name}</h2>
      <p className="result-lead">{description}</p>
      {best.top.length > 0 && <p>Наибольший вклад в оценку дали критерии: {best.top.join(', ').toLocaleLowerCase('ru-RU')}.</p>}
      <div className="result-guidance">
        <p>{info.economics}</p>
        <NextSteps steps={info.steps} source={info.source} />
      </div>
    </>
  );
}

export function Results({ answers, ranking }) {
  const [first] = ranking;
  if (first.assessment) {
    return (
      <div className="result-stack">
        <SpecialResult form={forms[first.key]} assessment={first.assessment} />
      </div>
    );
  }

  const best = isEligible(first) ? first : null;
  const needsClarification = first.excluded.length === 0 && first.pending.length > 0;

  return (
    <div className="result-stack">
      <article className="panel result-panel" aria-labelledby="result-title">
        <Recommendation best={best} needsClarification={needsClarification} />
        {answers.activity === 'special' && (
          <p className="result-note">Проверьте, нужны ли для выбранной деятельности лицензия или специальная форма.</p>
        )}
        <Comparison ranking={ranking} expanded={!best} />
      </article>
      <FinanceExample answers={answers} ranking={ranking} />
    </div>
  );
}
