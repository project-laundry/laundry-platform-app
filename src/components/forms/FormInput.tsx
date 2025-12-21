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
    <div>
      <label className="block text-sm font-semibold text-dark-gray mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
