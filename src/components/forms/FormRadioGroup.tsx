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
      <span className="mb-2 block text-sm font-medium text-dark-gray">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      <div className="space-y-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={`${name}-${option.value}`}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
                active
                  ? 'border-sea-green bg-sea-green/8'
                  : 'border-cream-dark bg-white hover:border-sea-green/50'
              }`}
            >
              <input
                type="radio"
                id={`${name}-${option.value}`}
                name={name}
                value={option.value}
                checked={active}
                onChange={(e) => onChange(e.target.value)}
                className="mt-0.5 size-4 shrink-0 accent-sea-green"
                required={required}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-dark-gray">
                  {option.label}
                </span>
                {option.description && (
                  <span className="mt-1 block text-xs text-medium-gray">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
