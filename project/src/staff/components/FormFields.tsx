import { Field, Input, Select, Textarea } from '@/staff/components/ui';

interface CommonFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export function TextField({
  type = 'text',
  placeholder,
  min,
  max,
  step,
  ...common
}: CommonFieldProps & { type?: string; placeholder?: string; min?: string; max?: string; step?: string }) {
  return (
    <Field label={common.label} htmlFor={common.id} required={common.required} error={common.error} hint={common.hint} className={common.className}>
      <Input
        id={common.id}
        type={type}
        disabled={common.disabled}
        value={common.value}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        invalid={!!common.error}
        onChange={(event) => common.onChange(event.target.value)}
      />
    </Field>
  );
}

export function SelectField({
  options,
  placeholder,
  ...common
}: CommonFieldProps & { options: string[]; placeholder?: string }) {
  return (
    <Field label={common.label} htmlFor={common.id} required={common.required} error={common.error} hint={common.hint} className={common.className}>
      <Select id={common.id} value={common.value} disabled={common.disabled} invalid={!!common.error} onChange={(event) => common.onChange(event.target.value)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function TextAreaField({
  maxLength,
  rows = 3,
  ...common
}: CommonFieldProps & { maxLength?: number; rows?: number; placeholder?: string }) {
  const counter = maxLength ? `${common.value.length} / ${maxLength}` : undefined;
  return (
    <Field
      label={common.label}
      htmlFor={common.id}
      required={common.required}
      error={common.error}
      hint={common.error ? undefined : common.hint ?? counter}
      className={common.className}
    >
      <Textarea
        id={common.id}
        rows={rows}
        disabled={common.disabled}
        value={common.value}
        placeholder={common.placeholder}
        maxLength={maxLength}
        invalid={!!common.error}
        onChange={(event) => common.onChange(event.target.value)}
      />
    </Field>
  );
}
