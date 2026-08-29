import React from 'react';

interface FormCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  description?: string;
  required?: boolean;
  error?: string;
}

export function FormCheckbox({
  checked,
  onChange,
  label,
  description,
  required = false,
  error
}: FormCheckboxProps) {
  return (
    <div>
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
          checked
            ? 'border-sea-green bg-sea-green/8'
            : 'border-cream-dark bg-white hover:border-sea-green/50'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-sea-green"
          required={required}
        />
        <span className="min-w-0">
          <span className="block text-sm text-dark-gray">
            {label}
            {required && <span className="ml-1 text-red-600">*</span>}
          </span>
          {description && (
            <span className="mt-1 block text-xs text-medium-gray">{description}</span>
          )}
        </span>
      </label>
      {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
    </div>
  );
}
