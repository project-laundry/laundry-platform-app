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
    <div>
      <label className="block text-sm font-semibold text-dark-gray mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue disabled:opacity-50 disabled:cursor-not-allowed"
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
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
