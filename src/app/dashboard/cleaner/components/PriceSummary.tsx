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
  promoCode?: string | null;
  discountOre?: number;
}

export function PriceSummary({
  breakdown,
  showCleanerPayout = true,
  promoCode = null,
  discountOre = 0,
}: PriceSummaryProps) {
  const hasDiscount = discountOre > 0;
  const customerPaysOre = Math.max(0, breakdown.total_ore - discountOre);
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

        {/* Promo discount (platform-absorbed; does not reduce cleaner payout) */}
        {hasDiscount && (
          <>
            <div className="flex justify-between text-sm text-emerald-600">
              <span>Rabatt{promoCode ? ` (${promoCode})` : ''}</span>
              <span>−{formatNok(discountOre)} kr</span>
            </div>
            <div className="flex justify-between text-sm font-medium">
              <span>Kunden betaler</span>
              <span>{formatNok(customerPaysOre)} kr</span>
            </div>
            <p className="text-xs text-medium-gray/70">
              Rabatten dekkes av plattformen og påvirker ikke din andel.
            </p>
          </>
        )}

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
