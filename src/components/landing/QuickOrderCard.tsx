'use client';

// The hero's order starter: pick a number of bags, see the estimate, continue
// into the order flow with that selection already filled in. Same estimate as
// the flow and the price calculator (calculateCustomerEstimate).

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { calculateCustomerEstimate, formatKr, PRICING } from '@/lib/config/pricing';
import { MAX } from '@/components/order-flow/primitives';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import type { OrderSelection } from '@/types/order-flow';

const START_BAGS = 2;

const stepButton =
  'flex size-11 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:text-cream-dark disabled:active:scale-100';

export function QuickOrderCard() {
  const router = useRouter();
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);
  const [bags, setBags] = useState(START_BAGS);

  const selection: OrderSelection = useMemo(
    () => ({ bags, beddingSets: 0, everydayItems: 0, formalItems: 0, ironBedding: false }),
    [bags]
  );
  const price = useMemo(() => calculateCustomerEstimate(selection), [selection]);

  function start() {
    updateOrderData({ selection });
    router.push('/orders/wash');
  }

  return (
    <div className="rounded-3xl border border-lin bg-white/85 p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6">
      <p className="font-serif text-lg font-semibold leading-tight text-dark-gray">Hvor mye skal vaskes?</p>
      <p className="mt-1 text-sm text-medium-gray">Oppgi antall poser med klær. Én pose tilsvarer omtrent en vanlig handlepose fra dagligvarebutikken.</p>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Færre poser"
            disabled={bags <= 1}
            onClick={() => setBags((n) => Math.max(1, n - 1))}
            className={stepButton}
          >
            <Minus className="size-5" />
          </button>
          <div className="flex min-w-14 flex-col items-center" aria-live="polite">
            <span className="font-serif text-3xl font-semibold leading-none tabular-nums text-dark-gray">{bags}</span>
            <span className="mt-1 text-xs text-medium-gray">{bags === 1 ? 'pose' : 'poser'}</span>
          </div>
          <button
            type="button"
            aria-label="Flere poser"
            disabled={bags >= MAX}
            onClick={() => setBags((n) => Math.min(MAX, n + 1))}
            className={stepButton}
          >
            <Plus className="size-5" />
          </button>
        </div>

        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.14em] text-medium-gray">Estimat</p>
          <p className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">{formatKr(price.totalOre)}</p>
        </div>
      </div>

      <p className="mt-4 border-t border-lin pt-3 text-sm text-medium-gray">
        {formatKr(PRICING.per_bag_ore)} per pose, minste bestilling {formatKr(PRICING.minimum_order_ore)}. Estimatet
        inkluderer henting og levering.
      </p>

      <button
        type="button"
        onClick={start}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Bestill henting
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
