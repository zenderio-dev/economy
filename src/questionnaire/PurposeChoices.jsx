import { purposeOptions } from './fields.js';

export function PurposeChoices({ value, onChange }) {
  return (
    <fieldset className="choice-group">
      <legend>Какая у вас цель?</legend>
      <div className="choice-grid">
        {purposeOptions.map(([key, label]) => (
          <label className="choice-option" key={key}>
            <input type="radio" name="purpose" value={key} checked={value === key} onChange={() => onChange('purpose', key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
