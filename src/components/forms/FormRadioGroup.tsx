interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface FormRadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  name: string;
  label: string;
  error?: string;
  required?: boolean;
}

export function FormRadioGroup({
  value,
  onChange,
  options,
  name,
  label,
  error,
  required = false
}: FormRadioGroupProps) {
  return (
    <div>
      <label className="block text-sm font-semibold text-dark-gray mb-3">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.value} className="flex items-start">
            <input
              type="radio"
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-4 h-4 text-nordic-blue border-gray-300 focus:ring-nordic-blue mt-1"
              required={required}
            />
            <div className="ml-2">
              <label
                htmlFor={`${name}-${option.value}`}
                className="text-sm font-medium text-dark-gray cursor-pointer"
              >
                {option.label}
              </label>
              {option.description && (
                <p className="text-xs text-gray-500 mt-1">{option.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
