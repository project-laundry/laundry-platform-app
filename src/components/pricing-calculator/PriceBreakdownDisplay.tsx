"use client";

import { Info } from "lucide-react";
import {
  PRICING,
  IRONING_LABELS,
  formatNok,
  type PriceBreakdown,
  type IroningDetails,
  type IroningCategory,
} from "@/lib/config/pricing";

interface PriceBreakdownDisplayProps {
  breakdown: PriceBreakdown;
  darkLoads: number;
  whiteLoads: number;
  ironingDetails: IroningDetails;
}

export function PriceBreakdownDisplay({
  breakdown,
  darkLoads,
  whiteLoads,
  ironingDetails,
}: PriceBreakdownDisplayProps) {
  const totalLoads = darkLoads + whiteLoads;
  const hasLoads = totalLoads > 0;
  const hasIroning = breakdown.ironing_subtotal_ore > 0;
  const hasAnySelection = hasLoads || hasIroning;

  // Get ironing items with count > 0
  const activeIroningItems = (
    Object.entries(ironingDetails) as [IroningCategory, number][]
  ).filter(([, count]) => count > 0);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
      <h3 className="font-serif text-xl font-medium text-foreground mb-4">
        Prisestimat
      </h3>

      {!hasAnySelection ? (
        <p className="text-muted-foreground text-sm">
          Velg antall vask eller stryking for å se prisestimat.
        </p>
      ) : (
        <div className="space-y-4">
          {/* Loads */}
          {hasLoads && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Vask ({totalLoads} × {formatNok(PRICING.price_per_load_ore)}{" "}
                  kr)
                </span>
                <span className="font-medium text-foreground">
                  {formatNok(breakdown.loads_subtotal_ore)} kr
                </span>
              </div>
              {darkLoads > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground pl-3">
                  <span>Mørke klær ({darkLoads})</span>
                </div>
              )}
              {whiteLoads > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground pl-3">
                  <span>Lyse klær ({whiteLoads})</span>
                </div>
              )}
            </div>
          )}

          {/* Ironing */}
          {hasIroning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stryking</span>
                <span className="font-medium text-foreground">
                  {formatNok(breakdown.ironing_subtotal_ore)} kr
                </span>
              </div>
              {activeIroningItems.map(([category, count]) => (
                <div
                  key={category}
                  className="flex justify-between text-xs text-muted-foreground pl-3"
                >
                  <span>
                    {IRONING_LABELS[category].label.split(",")[0]} ({count} ×{" "}
                    {formatNok(PRICING.ironing[category])} kr)
                  </span>
                  <span>
                    {formatNok(count * PRICING.ironing[category])} kr
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-200 pt-4 space-y-2">
            {/* Subtotal */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delsum</span>
              <span className="text-foreground">
                {formatNok(
                  breakdown.loads_subtotal_ore + breakdown.ironing_subtotal_ore
                )}{" "}
                kr
              </span>
            </div>

            {/* Pickup & Delivery */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Henting og levering</span>
              <span className="text-foreground">
                {formatNok(breakdown.pickup_delivery_ore)} kr
              </span>
            </div>

            {/* Service fee */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Serviceavgift</span>
              <span className="text-foreground">
                {formatNok(breakdown.service_fee_ore)} kr
              </span>
            </div>

            {/* Minimum order adjustment - integrated line item */}
            {breakdown.minimum_applied && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    Tillegg opp til minimumsordre
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <span className="text-foreground">
                    {formatNok(
                      PRICING.minimum_order_ore - breakdown.subtotal_ore
                    )}{" "}
                    kr
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pl-0">
                  Minimumsordre er {formatNok(PRICING.minimum_order_ore)} kr
                  før gebyrer
                </p>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between items-baseline">
              <span className="font-semibold text-foreground">
                Estimert total
              </span>
              <span className="text-2xl font-bold text-teal-600">
                {formatNok(breakdown.total_ore)} kr
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
