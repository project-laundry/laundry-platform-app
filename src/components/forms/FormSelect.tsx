interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  error,
  disabled = false
}: FormSelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-dark-gray">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-dark-gray outline-none transition-colors focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray ${
          error ? 'border-red-300' : 'border-cream-dark'
        }`}
        required={required}
        disabled={disabled}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </label>
  );
}
