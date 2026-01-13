"use client";

import { useState, useMemo } from "react";
import {
  PRICING,
  IRONING_LABELS,
  calculateOrderPrice,
  formatNok,
  getEmptyIroningDetails,
  type IroningDetails,
  type IroningCategory,
} from "@/lib/config/pricing";
import { PackageSelector } from "./PackageSelector";
import { LoadsCounter } from "./LoadsCounter";
import { IroningCounter } from "./IroningCounter";
import { PriceBreakdownDisplay } from "./PriceBreakdownDisplay";
import { PriceListSection } from "./PriceListSection";

export interface CalculatorState {
  dark_loads: number;
  white_loads: number;
  ironing_details: IroningDetails;
}

export interface PackagePreset {
  id: string;
  name: string;
  description: string;
  dark_loads: number;
  white_loads: number;
  ironing_details: IroningDetails;
}

export const COMMON_PACKAGES: PackagePreset[] = [
  {
    id: "ukesvask",
    name: "Ukesvask for én",
    description: "Perfekt for en person, en ukes klær",
    dark_loads: 1,
    white_loads: 1,
    ironing_details: {
      kids_pillow: 0,
      tshirts_shorts: 0,
      business_shirts: 3,
      single_bedding: 0,
      complex_dresses: 0,
      double_bedding: 0,
      king_bedding: 0,
    },
  },
  {
    id: "skjortepakka",
    name: "Skjortepakka",
    description: "For kontorhverdagen - skjorter og bluser",
    dark_loads: 0,
    white_loads: 1,
    ironing_details: {
      kids_pillow: 0,
      tshirts_shorts: 0,
      business_shirts: 5,
      single_bedding: 0,
      complex_dresses: 0,
      double_bedding: 0,
      king_bedding: 0,
    },
  },
  {
    id: "familievasken",
    name: "Familievasken",
    description: "For hele familien, inkludert sengetøy",
    dark_loads: 2,
    white_loads: 2,
    ironing_details: {
      kids_pillow: 0,
      tshirts_shorts: 4,
      business_shirts: 0,
      single_bedding: 2,
      complex_dresses: 0,
      double_bedding: 0,
      king_bedding: 0,
    },
  },
  {
    id: "storvasken",
    name: "Storvasken",
    description: "Stor vask med sengetøy og skjorter",
    dark_loads: 3,
    white_loads: 3,
    ironing_details: {
      kids_pillow: 0,
      tshirts_shorts: 0,
      business_shirts: 2,
      single_bedding: 0,
      complex_dresses: 0,
      double_bedding: 3,
      king_bedding: 0,
    },
  },
];

const IRONING_CATEGORIES: IroningCategory[] = [
  "kids_pillow",
  "tshirts_shorts",
  "business_shirts",
  "single_bedding",
  "complex_dresses",
  "double_bedding",
  "king_bedding",
];

export function PriceCalculator() {
  const [state, setState] = useState<CalculatorState>({
    dark_loads: 0,
    white_loads: 0,
    ironing_details: getEmptyIroningDetails(),
  });
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Calculate price breakdown whenever state changes
  const priceBreakdown = useMemo(() => {
    return calculateOrderPrice({
      dark_loads: state.dark_loads,
      white_loads: state.white_loads,
      ironing_details: state.ironing_details,
    });
  }, [state]);

  // Handle package selection
  const handleSelectPackage = (pkg: PackagePreset) => {
    setState({
      dark_loads: pkg.dark_loads,
      white_loads: pkg.white_loads,
      ironing_details: { ...pkg.ironing_details },
    });
    setSelectedPackage(pkg.id);
  };

  // Handle loads change
  const handleLoadsChange = (type: "dark" | "white", value: number) => {
    setState((prev) => ({
      ...prev,
      [type === "dark" ? "dark_loads" : "white_loads"]: value,
    }));
    setSelectedPackage(null); // Clear package selection when manually adjusting
  };

  // Handle ironing change
  const handleIroningChange = (category: IroningCategory, value: number) => {
    setState((prev) => ({
      ...prev,
      ironing_details: {
        ...prev.ironing_details,
        [category]: value,
      },
    }));
    setSelectedPackage(null); // Clear package selection when manually adjusting
  };

  // Reset calculator
  const handleReset = () => {
    setState({
      dark_loads: 0,
      white_loads: 0,
      ironing_details: getEmptyIroningDetails(),
    });
    setSelectedPackage(null);
  };

  const hasAnySelection =
    state.dark_loads > 0 ||
    state.white_loads > 0 ||
    Object.values(state.ironing_details).some((v) => v > 0);

  return (
    <div className="space-y-12">
      {/* Package Presets */}
      <section>
        <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground mb-6 text-center">
          Populære pakker
        </h2>
        <PackageSelector
          packages={COMMON_PACKAGES}
          selectedPackage={selectedPackage}
          onSelect={handleSelectPackage}
        />
      </section>

      {/* Calculator and Breakdown */}
      <div className="grid lg:grid-cols-5 gap-8">
        {/* Calculator Controls */}
        <div className="lg:col-span-3 space-y-8">
          {/* Loads Section */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl md:text-2xl font-medium text-foreground">
                Antall vask
              </h3>
              <span className="text-sm text-muted-foreground">
                {formatNok(PRICING.price_per_load_ore)} kr per 5kg vask
              </span>
            </div>
            <div className="space-y-4">
              <LoadsCounter
                label="Mørke klær"
                value={state.dark_loads}
                onChange={(value) => handleLoadsChange("dark", value)}
              />
              <LoadsCounter
                label="Lyse klær"
                value={state.white_loads}
                onChange={(value) => handleLoadsChange("white", value)}
              />
            </div>
          </div>

          {/* Ironing Section */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-card border border-slate-100">
            <h3 className="font-serif text-xl md:text-2xl font-medium text-foreground mb-6">
              Stryking
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {IRONING_CATEGORIES.map((category) => (
                <IroningCounter
                  key={category}
                  category={category}
                  count={state.ironing_details[category]}
                  onChange={(value) => handleIroningChange(category, value)}
                  label={IRONING_LABELS[category].label}
                  description={IRONING_LABELS[category].description}
                  priceOre={PRICING.ironing[category]}
                />
              ))}
            </div>
          </div>

          {/* Reset Button */}
          {hasAnySelection && (
            <div className="text-center">
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Nullstill kalkulator
              </button>
            </div>
          )}
        </div>

        {/* Price Breakdown (Sticky on Desktop) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-28">
            <PriceBreakdownDisplay
              breakdown={priceBreakdown}
              darkLoads={state.dark_loads}
              whiteLoads={state.white_loads}
              ironingDetails={state.ironing_details}
            />
          </div>
        </div>
      </div>

      {/* Price List Section */}
      <PriceListSection />

      {/* Disclaimer */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Endelig pris baseres på faktisk vekt ved henting. Denne kalkulatoren
          gir et estimat basert på antall vaskemengder du velger. Du belastes
          først via Vipps når klærne leveres ferdig renset tilbake.
        </p>
      </div>
    </div>
  );
}
