"use client";

import { Minus, Plus } from "lucide-react";
import { formatNok } from "@/lib/config/pricing";

interface IroningCounterProps {
  category: string;
  count: number;
  onChange: (value: number) => void;
  label: string;
  description: string;
  priceOre: number;
  min?: number;
  max?: number;
}

export function IroningCounter({
  count,
  onChange,
  label,
  description,
  priceOre,
  min = 0,
  max = 20,
}: IroningCounterProps) {
  const handleDecrement = () => {
    if (count > min) {
      onChange(count - 1);
    }
  };

  const handleIncrement = () => {
    if (count < max) {
      onChange(count + 1);
    }
  };

  const subtotal = count * priceOre;

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      {/* Header with label and price */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 pr-2">
          <p className="font-medium text-foreground text-sm leading-tight">
            {label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <span className="text-teal-600 font-semibold text-sm whitespace-nowrap">
          {formatNok(priceOre)} kr
        </span>
      </div>

      {/* Counter controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={count <= min}
            className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={`Reduser ${label}`}
          >
            <Minus className="w-3 h-3 text-slate-600" />
          </button>
          <span className="w-6 text-center font-semibold text-foreground">
            {count}
          </span>
          <button
            onClick={handleIncrement}
            disabled={count >= max}
            className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label={`Øk ${label}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Subtotal */}
        {count > 0 && (
          <span className="text-sm font-medium text-slate-600">
            = {formatNok(subtotal)} kr
          </span>
        )}
      </div>
    </div>
  );
}
