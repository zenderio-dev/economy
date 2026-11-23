import { FieldError, Input, Label, TextField } from 'react-aria-components';
import './controls.css';

const number = new Intl.NumberFormat('ru-RU');

export function NumberField({ name, label, min, max, step, value, onChange }) {
  return (
    <TextField
      className="field"
      name={name}
      type="number"
      inputMode="numeric"
      value={value}
      onChange={nextValue => onChange(name, nextValue)}
      isRequired
      validationBehavior="native"
    >
      <Label className="field-label">{label}</Label>
      <div className="field-control">
        <Input className="number-input" min={min} max={max} step={step} />
        <FieldError className="field-error">{({ validationDetails }) => {
          if (validationDetails.rangeUnderflow) return `Введите число от ${number.format(min)}.`;
          if (validationDetails.rangeOverflow) return `Введите число до ${number.format(max)}.`;
          if (validationDetails.stepMismatch) return 'Введите целое число.';
          return 'Введите число.';
        }}</FieldError>
      </div>
    </TextField>
  );
}
