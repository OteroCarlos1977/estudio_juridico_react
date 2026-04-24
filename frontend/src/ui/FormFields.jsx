export function FormField({
  label,
  name,
  value,
  error,
  hint,
  onChange,
  type = "text",
  inputMode,
  min,
  max,
  className,
}) {
  return (
    <label className={className}>
      {label}
      <input
        name={name}
        type={type}
        value={value}
        inputMode={inputMode}
        min={min}
        max={max}
        onChange={onChange}
      />
      {hint ? <span className="field-hint">{hint}</span> : null}
      <FormError value={error} />
    </label>
  );
}

export function FormSelect({
  label,
  name,
  value,
  error,
  hint,
  onChange,
  options,
  placeholder,
  className,
}) {
  return (
    <label className={className}>
      {label}
      <select name={name} value={value} onChange={onChange}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="field-hint">{hint}</span> : null}
      <FormError value={error} />
    </label>
  );
}

export function FormTextarea({
  label,
  name,
  value,
  error,
  hint,
  onChange,
  rows = 3,
  className,
}) {
  return (
    <label className={className}>
      {label}
      <textarea name={name} rows={rows} value={value} onChange={onChange} />
      {hint ? <span className="field-hint">{hint}</span> : null}
      <FormError value={error} />
    </label>
  );
}

export function FormCheckbox({ name, checked, onChange, children, className = "checkbox-field" }) {
  return (
    <label className={className}>
      <input name={name} type="checkbox" checked={checked} onChange={onChange} />
      {children}
    </label>
  );
}

export function FormError({ value }) {
  if (!value?.length) {
    return null;
  }

  return <span className="error-text">{value[0]}</span>;
}
