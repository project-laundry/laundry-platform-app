'use client';

import { Minus, Plus } from 'lucide-react';
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
    <div className="flex items-center justify-between gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-dark-gray">{label}</p>
        <p className="text-xs text-medium-gray">{description}</p>
        <p className="mt-1 text-xs tabular-nums text-nordic-blue">
          {formatNok(priceOre)} kr/stk
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Subtotal for this category */}
        {value > 0 && (
          <span className="mr-1.5 min-w-[3.75rem] text-right text-sm tabular-nums text-medium-gray">
            {formatNok(subtotalOre)} kr
          </span>
        )}

        {/* Quantity controls — mirrors the order-flow MiniStep look */}
        <button
          type="button"
          aria-label="Færre"
          onClick={handleDecrement}
          disabled={disabled || value === 0}
          className="flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className="h-9 w-12 rounded-xl border border-cream-dark bg-white text-center font-serif text-lg font-semibold tabular-nums text-dark-gray outline-none transition-colors focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray"
        />
        <button
          type="button"
          aria-label="Flere"
          onClick={handleIncrement}
          disabled={disabled}
          className="flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
