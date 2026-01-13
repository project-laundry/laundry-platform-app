"use client";

import { Check, Sparkles } from "lucide-react";
import { calculateOrderPrice, formatNok } from "@/lib/config/pricing";
import type { PackagePreset } from "./PriceCalculator";

interface PackageSelectorProps {
  packages: PackagePreset[];
  selectedPackage: string | null;
  onSelect: (pkg: PackagePreset) => void;
}

export function PackageSelector({
  packages,
  selectedPackage,
  onSelect,
}: PackageSelectorProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {packages.map((pkg) => {
        const isSelected = selectedPackage === pkg.id;
        const breakdown = calculateOrderPrice({
          dark_loads: pkg.dark_loads,
          white_loads: pkg.white_loads,
          ironing_details: pkg.ironing_details,
        });

        return (
          <button
            key={pkg.id}
            onClick={() => onSelect(pkg)}
            className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 ${
              isSelected
                ? "border-teal-600 bg-teal-50/50 shadow-md"
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Package icon */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                isSelected ? "bg-teal-100" : "bg-slate-100"
              }`}
            >
              <Sparkles
                className={`w-5 h-5 ${
                  isSelected ? "text-teal-600" : "text-slate-500"
                }`}
              />
            </div>

            {/* Package name */}
            <h4 className="font-semibold text-foreground mb-1">{pkg.name}</h4>

            {/* Package description */}
            <p className="text-sm text-muted-foreground mb-3">
              {pkg.description}
            </p>

            {/* Estimated price */}
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-teal-600">
                {formatNok(breakdown.total_ore)} kr
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
