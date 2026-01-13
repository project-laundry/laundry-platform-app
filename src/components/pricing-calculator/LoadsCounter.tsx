"use client";

import { Minus, Plus } from "lucide-react";

interface LoadsCounterProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function LoadsCounter({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}: LoadsCounterProps) {
  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div>
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-sm text-muted-foreground ml-2">(5kg per vask)</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Reduser ${label}`}
        >
          <Minus className="w-4 h-4 text-slate-600" />
        </button>
        <span className="w-8 text-center font-semibold text-lg text-foreground">
          {value}
        </span>
        <button
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label={`Øk ${label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
