'use client';

import { Button } from '@/components/ui/button';
import {
  type IroningGroup,
  IRONING_LABELS,
  PRICING,
  formatNok,
} from '@/lib/config/pricing';

interface IroningQuantityInputProps {
  category: IroningGroup;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export function IroningQuantityInput({
  category,
  value,
  onChange,
  disabled = false,
}: IroningQuantityInputProps) {
  const { label, description } = IRONING_LABELS[category];
  const priceOre = PRICING.ironing[category];
  const subtotalOre = value * priceOre;

  const handleDecrement = () => {
    if (value > 0) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= 0) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="font-medium text-dark-gray text-sm">{label}</div>
        <div className="text-xs text-medium-gray/70">{description}</div>
        <div className="text-xs text-nordic-blue mt-1">
          {formatNok(priceOre)} kr/stk
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Subtotal for this category */}
        {value > 0 && (
          <span className="text-sm text-medium-gray mr-2 min-w-[60px] text-right">
            {formatNok(subtotalOre)} kr
          </span>
        )}

        {/* Quantity controls */}
        <div className="flex items-center gap-1 bg-soft-gray rounded-lg p-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={handleDecrement}
            disabled={disabled || value === 0}
          >
            <span className="text-lg">-</span>
          </Button>
          <input
            type="number"
            min="0"
            value={value}
            onChange={handleInputChange}
            disabled={disabled}
            className="w-12 h-8 text-center bg-white rounded-md border-0 text-base font-medium focus:ring-2 focus:ring-nordic-blue/30 disabled:opacity-50"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md"
            onClick={handleIncrement}
            disabled={disabled}
          >
            <span className="text-lg">+</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
