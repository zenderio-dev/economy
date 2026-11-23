import { NumberField } from '../ui/NumberField.jsx';
import { SelectField } from '../ui/SelectField.jsx';

export function QuestionSection({ title, fields, answers, onChange, children }) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      {children}
      <div className="form-grid">
        {fields.filter(field => !field.when || field.when(answers)).map(({ when, type, ...field }) => {
          const Control = type === 'number' ? NumberField : SelectField;
          return <Control key={field.name} {...field} value={answers[field.name] ?? ''} onChange={onChange} />;
        })}
      </div>
    </section>
  );
}
