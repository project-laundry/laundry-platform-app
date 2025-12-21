interface FormCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
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
      <div className="flex items-start">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 text-nordic-blue border-gray-300 rounded focus:ring-nordic-blue mt-1"
          required={required}
        />
        <div className="ml-2">
          <label className="text-sm text-medium-gray cursor-pointer">
            {label}
            {required && <span className="text-red-600 ml-1">*</span>}
          </label>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 ml-6">{error}</p>
      )}
    </div>
  );
}
