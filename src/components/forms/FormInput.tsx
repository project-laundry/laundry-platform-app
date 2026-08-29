interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'number';
  disabled?: boolean;
}

export function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error,
  type = 'text',
  disabled = false
}: FormInputProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-dark-gray">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-2xl border bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray ${
          error ? 'border-red-300' : 'border-cream-dark'
        }`}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </label>
  );
}
