"use client";

import { Shirt, Sparkles, Truck, CreditCard, AlertTriangle } from "lucide-react";
import {
  PRICING,
  IRONING_LABELS,
  formatNok,
  type IroningCategory,
} from "@/lib/config/pricing";

const IRONING_CATEGORIES: IroningCategory[] = [
  "kids_pillow",
  "tshirts_shorts",
  "business_shirts",
  "single_bedding",
  "complex_dresses",
  "double_bedding",
  "king_bedding",
];

export function PriceListSection() {
  return (
    <section className="bg-white rounded-2xl p-6 md:p-8 shadow-card border border-slate-100">
      <h2 className="font-serif text-2xl md:text-3xl font-medium text-foreground mb-8 text-center">
        Komplett prisliste
      </h2>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        {/* Laundry Prices */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Shirt className="w-5 h-5 text-teal-600" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Vask</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-foreground">Per 5kg vask</p>
                <p className="text-sm text-muted-foreground">
                  Inkluderer vask og tørk
                </p>
              </div>
              <span className="text-xl font-bold text-teal-600">
                {formatNok(PRICING.price_per_load_ore)} kr
              </span>
            </div>
          </div>
        </div>

        {/* Ironing Prices */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Stryking</h3>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            {IRONING_CATEGORIES.map((category) => (
              <div
                key={category}
                className="flex justify-between items-start py-1"
              >
                <div className="flex-1 pr-4">
                  <p className="font-medium text-foreground text-sm">
                    {IRONING_LABELS[category].label}
                  </p>
                </div>
                <span className="font-semibold text-purple-600 text-sm whitespace-nowrap">
                  {formatNok(PRICING.ironing[category])} kr
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fees Section */}
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h3 className="font-semibold text-lg text-foreground mb-4 text-center">
          Avgifter
        </h3>
        <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto">
          {/* Pickup & Delivery */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Truck className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium text-foreground">
                Henting og levering
              </span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {formatNok(PRICING.pickup_delivery_fee_ore)} kr
            </p>
          </div>

          {/* Service Fee */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-slate-600" />
              </div>
              <span className="font-medium text-foreground">Serviceavgift</span>
            </div>
            <p className="text-xl font-bold text-slate-600">
              {formatNok(PRICING.service_fee_ore)} kr
            </p>
          </div>
        </div>
      </div>

      {/* Minimum Order Callout */}
      <div className="mt-8 bg-amber-50 border-2 border-amber-300 rounded-xl p-5 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">
              Minimumsordre: {formatNok(PRICING.minimum_order_ore)} kr
            </p>
            <p className="text-sm text-amber-800">
              Alle ordrer har en minimumspris på{" "}
              {formatNok(PRICING.minimum_order_ore)} kr
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
