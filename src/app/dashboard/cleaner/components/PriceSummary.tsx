'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type PriceBreakdown,
  formatNok,
  PRICING,
} from '@/lib/config/pricing';

interface PriceSummaryProps {
  breakdown: PriceBreakdown;
  showCleanerPayout?: boolean;
}

export function PriceSummary({
  breakdown,
  showCleanerPayout = true,
}: PriceSummaryProps) {
  return (
    <Card className="bg-soft-gray/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Prisberegning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Loads subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Vaskemengde</span>
          <span>{formatNok(breakdown.loads_subtotal_ore)} kr</span>
        </div>

        {/* Ironing subtotal (only if > 0) */}
        {breakdown.ironing_subtotal_ore > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-medium-gray">Stryking</span>
            <span>{formatNok(breakdown.ironing_subtotal_ore)} kr</span>
          </div>
        )}

        {/* Pickup & delivery fee */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Henting og levering</span>
          <span>{formatNok(breakdown.pickup_delivery_ore)} kr</span>
        </div>

        {/* Service fee */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Serviceavgift</span>
          <span>{formatNok(breakdown.service_fee_ore)} kr</span>
        </div>

        {/* Subtotal */}
        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
          <span className="text-medium-gray">Delsum</span>
          <span>{formatNok(breakdown.subtotal_ore)} kr</span>
        </div>

        {/* Minimum indicator */}
        {breakdown.minimum_applied && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>Minimumsbeløp</span>
            <span>{formatNok(PRICING.minimum_order_ore)} kr</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-300">
          <span>Totalt</span>
          <span>{formatNok(breakdown.total_ore)} kr</span>
        </div>

        {/* Cleaner payout */}
        {showCleanerPayout && (
          <div className="mt-4 pt-4 border-t-2 border-nordic-blue/30 bg-nordic-blue/5 -mx-6 px-6 py-4 rounded-b-xl">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-medium-gray">Din andel ({PRICING.cleaner_payout_percent}%)</div>
                <div className="text-xs text-medium-gray/70">Etter plattformavgift</div>
              </div>
              <div className="text-xl font-bold text-nordic-blue">
                {formatNok(breakdown.cleaner_payout_ore)} kr
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
