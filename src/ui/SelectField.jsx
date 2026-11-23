import {
  Button, FieldError, Label, ListBox, ListBoxItem, Popover, Select, SelectValue, Text,
} from 'react-aria-components';
import './controls.css';

const placeholder = 'Выберите вариант';

export function SelectField({ name, label, options, help, wide, value, onChange }) {
  return (
    <Select
      className={wide ? 'field field-wide' : 'field'}
      name={name}
      value={value || null}
      onChange={key => onChange(name, key)}
      placeholder={placeholder}
      isRequired
      validationBehavior="native"
    >
      <Label className="field-label">{label}</Label>
      <div className="field-control">
        <Button className="select-trigger" type="button">
          <SelectValue className="select-value">{({ selectedText }) => selectedText || placeholder}</SelectValue>
          <span className="select-chevron" aria-hidden="true" />
        </Button>
        {help && <Text slot="description" className="field-hint">{help}</Text>}
        <FieldError className="field-error">Выберите вариант.</FieldError>
      </div>
      <Popover className="select-popover" placement="bottom start" offset={5}>
        <ListBox className="select-list">
          {options.map(([key, text]) => (
            <ListBoxItem className="select-option" key={key} id={key} textValue={text}>
              <span>{text}</span>
              <span className="select-check" aria-hidden="true" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
