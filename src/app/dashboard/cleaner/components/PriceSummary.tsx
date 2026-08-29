'use client';

import { Calculator } from 'lucide-react';
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
    <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          <Calculator className="size-5" />
        </span>
        <h2 className="font-serif text-lg font-semibold text-dark-gray">
          Prisberegning
        </h2>
      </div>

      <div className="mt-4 space-y-3 tabular-nums">
        {/* Loads subtotal */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Vaskemengde</span>
          <span className="text-dark-gray">{formatNok(breakdown.loads_subtotal_ore)} kr</span>
        </div>

        {/* Ironing subtotal (only if > 0) */}
        {breakdown.ironing_subtotal_ore > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-medium-gray">Stryking</span>
            <span className="text-dark-gray">{formatNok(breakdown.ironing_subtotal_ore)} kr</span>
          </div>
        )}

        {/* Pickup & delivery fee */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Henting og levering</span>
          <span className="text-dark-gray">{formatNok(breakdown.pickup_delivery_ore)} kr</span>
        </div>

        {/* Service fee */}
        <div className="flex justify-between text-sm">
          <span className="text-medium-gray">Serviceavgift</span>
          <span className="text-dark-gray">{formatNok(breakdown.service_fee_ore)} kr</span>
        </div>

        {/* Subtotal */}
        <div className="flex justify-between border-t border-cream-dark/60 pt-2 text-sm">
          <span className="text-medium-gray">Delsum</span>
          <span className="text-dark-gray">{formatNok(breakdown.subtotal_ore)} kr</span>
        </div>

        {/* Minimum indicator */}
        {breakdown.minimum_applied && (
          <div className="flex justify-between text-sm text-amber-800">
            <span>Minimumsbeløp</span>
            <span>{formatNok(PRICING.minimum_order_ore)} kr</span>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between border-t border-cream-dark/60 pt-2">
          <span className="font-medium text-dark-gray">Totalt</span>
          <span className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">
            {formatNok(breakdown.total_ore)} kr
          </span>
        </div>

        {/* Promo discount (platform-absorbed; does not reduce cleaner payout) */}
        {hasDiscount && (
          <>
            <div className="flex justify-between text-sm text-sea-green">
              <span>Rabatt{promoCode ? ` (${promoCode})` : ''}</span>
              <span>−{formatNok(discountOre)} kr</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-dark-gray">
              <span>Kunden betaler</span>
              <span>{formatNok(customerPaysOre)} kr</span>
            </div>
            <p className="text-xs text-medium-gray">
              Rabatten dekkes av plattformen og påvirker ikke din andel.
            </p>
          </>
        )}
      </div>

      {/* Cleaner payout */}
      {showCleanerPayout && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3">
          <div>
            <p className="text-sm text-medium-gray">
              Din andel ({PRICING.cleaner_payout_percent}%)
            </p>
            <p className="text-xs text-medium-gray">Etter plattformavgift</p>
          </div>
          <p className="font-serif text-2xl font-semibold tabular-nums text-nordic-blue">
            {formatNok(breakdown.cleaner_payout_ore)} kr
          </p>
        </div>
      )}
    </section>
  );
}
