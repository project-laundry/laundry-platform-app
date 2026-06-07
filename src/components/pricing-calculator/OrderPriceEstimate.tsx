"use client";

import { Sparkles, Shirt, Truck, CreditCard, Info } from "lucide-react";
import {
  PRICING,
  calculateOrderPrice,
  formatNokWhole,
  formatNok,
} from "@/lib/config/pricing";
import { COMMON_PACKAGES } from "./PriceCalculator";

interface OrderPriceEstimateProps {
  service: "wash_and_iron" | "wash_only";
}

/**
 * Illustrative price guide shown during the order flow.
 *
 * Purely for setting expectations — the example packages are NOT selectable and
 * do not affect what the customer is charged. The final price is calculated by
 * the cleaner after pickup (DIRECT_CAPTURE, no separate approval step), so the
 * copy makes clear this is only an estimate.
 */
export function OrderPriceEstimate({ service }: OrderPriceEstimateProps) {
  const includeIroning = service === "wash_and_iron";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
      <div className="flex items-center mb-2">
        <Sparkles className="w-5 h-5 text-teal-600 mr-2" />
        <h3 className="text-lg font-medium text-slate-900">Hva koster det?</h3>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Eksempler på hva en vask kan koste. Dette er kun et estimat for å gi deg
        en pekepinn.
      </p>

      {/* Example scenarios (illustrative reference, not selectable) */}
      <div className="rounded-xl bg-slate-50 border border-slate-100 divide-y divide-slate-200/70 mb-8">
        {COMMON_PACKAGES.map((pkg) => {
          const breakdown = calculateOrderPrice({
            dark_loads: pkg.dark_loads,
            white_loads: pkg.white_loads,
            ironing_details: includeIroning ? pkg.ironing_details : null,
          });

          return (
            <div
              key={pkg.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span className="text-sm text-slate-600">{pkg.description}</span>
              <span className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-xs text-slate-400">ca.</span>
                <span className="text-base font-bold text-teal-600">
                  {formatNokWhole(breakdown.total_ore)} kr
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* How the price is calculated */}
      <div className="border-t border-slate-100 pt-6">
        <h4 className="text-sm font-semibold text-slate-900 mb-4">
          Slik beregnes prisen
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Shirt className="w-4 h-4 text-teal-600" />
              Per 5 kg vask
            </span>
            <span className="font-medium text-slate-900">
              {formatNok(PRICING.price_per_load_ore)} kr
            </span>
          </div>
          {includeIroning && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <Sparkles className="w-4 h-4 text-purple-600" />
                Stryking per plagg
              </span>
              <span className="font-medium text-slate-900">
                fra {formatNok(PRICING.ironing.kids_pillow)} kr
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <Truck className="w-4 h-4 text-blue-600" />
              Henting og levering
            </span>
            <span className="font-medium text-slate-900">
              {formatNok(PRICING.pickup_delivery_fee_ore)} kr
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600">
              <CreditCard className="w-4 h-4 text-slate-500" />
              Serviceavgift
            </span>
            <span className="font-medium text-slate-900">
              {formatNok(PRICING.service_fee_ore)} kr
            </span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-600">Minstepris</span>
            <span className="font-medium text-slate-900">
              {formatNokWhole(PRICING.minimum_order_ore)} kr
            </span>
          </div>
        </div>
      </div>

      {/* Estimate disclaimer */}
      <div className="mt-6 flex items-start gap-2 rounded-lg bg-teal-50 border border-teal-100 p-4">
        <Info className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-teal-800">
          Dette er kun et estimat. Endelig pris beregnes når renseren har veid og
          vurdert klærne dine. Du betaler ingenting nå – du belastes via Vipps
          etter henting.
        </p>
      </div>

      {/* Full price calculator link */}
      <p className="mt-4 text-center text-sm text-slate-500">
        <a
          href="/pris-kalkulator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:underline"
        >
          Prøv priskalkulatoren
        </a>
      </p>
    </div>
  );
}
