interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  error,
  disabled = false,
  required = false
}: FormTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-dark-gray mb-2">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue disabled:opacity-50 disabled:cursor-not-allowed"
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
