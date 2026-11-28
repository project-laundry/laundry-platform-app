'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { overrideOrderPriceAction } from '../actions';
import {
  calculateOrderPrice,
  applyPromoDiscount,
  formatKr,
  getEmptyIroningDetails,
  MAX_WASH_LOADS_PER_ORDER,
} from '@/lib/config/pricing';
import type { OrderPromo } from '@/types/database';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray';

/**
 * Admin price override — the same formula as the cleaner's pricing form:
 * wash count → calculateOrderPrice → promo discount. The preview below the
 * inputs is computed client-side with the same two functions the server
 * action uses, so what the admin sees is what gets stored. The page renders
 * this only while the order is in_cleaning / ready_for_delivery with no live
 * payment; the server action re-validates all of it.
 */
export function PriceOverrideForm({
  orderId,
  initialWashLoads,
  initialNotes,
  ironedBeddingSets,
  promo,
}: {
  orderId: string;
  initialWashLoads: number;
  initialNotes: string | null;
  /** Ironed bedding sets to start from; null when the customer did not order
   *  ironing — the field is then not shown and ironing is not priced. */
  ironedBeddingSets: number | null;
  promo: OrderPromo | null;
}) {
  const router = useRouter();
  const [washLoads, setWashLoads] = useState(Math.max(1, initialWashLoads));
  const [ironedSets, setIronedSets] = useState(ironedBeddingSets ?? 0);
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const preview = useMemo(() => {
    const breakdown = calculateOrderPrice({
      wash_loads: washLoads,
      ironing_details:
        ironedBeddingSets === null ? null : { ...getEmptyIroningDetails(), bedding: ironedSets },
    });
    const { total_cost_ore } = applyPromoDiscount(breakdown.total_ore, promo);
    return { total_cost_ore, cleaner_payout_ore: breakdown.cleaner_payout_ore, minimum_applied: breakdown.minimum_applied };
  }, [washLoads, ironedSets, ironedBeddingSets, promo]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await overrideOrderPriceAction(orderId, {
        wash_loads: washLoads,
        pricing_notes: notes,
        ...(ironedBeddingSets !== null ? { ironed_bedding_sets: ironedSets } : {}),
      });
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Antall vask</span>
          <input
            type="number"
            min={1}
            step={1}
            required
            value={washLoads}
            onChange={(e) => {
              setSaved(false);
              const value = parseInt(e.target.value, 10);
              if (!Number.isNaN(value) && value >= 1) setWashLoads(value);
            }}
            className={inputClass}
          />
        </label>
        <div className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Ny pris</span>
          <p className="py-3 text-lg font-semibold tabular-nums text-dark-gray">
            {formatKr(preview.total_cost_ore)}
          </p>
          <p className="text-xs text-medium-gray">
            Renserens andel {formatKr(preview.cleaner_payout_ore)}
            {preview.minimum_applied && ' · minstepris'}
            {promo && ` · rabattkode ${promo.code}`}
          </p>
        </div>
      </div>

      {ironedBeddingSets !== null && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Strøkne sengetøysett</span>
          <input
            type="number"
            min={0}
            max={MAX_WASH_LOADS_PER_ORDER}
            step={1}
            required
            value={ironedSets}
            onChange={(e) => {
              setSaved(false);
              const value = parseInt(e.target.value, 10);
              if (!Number.isNaN(value) && value >= 0) setIronedSets(value);
            }}
            className={inputClass}
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Prisnotat</span>
        <input
          value={notes}
          onChange={(e) => {
            setSaved(false);
            setNotes(e.target.value);
          }}
          placeholder="Valgfritt — f.eks. hvorfor prisen ble endret"
          className={inputClass}
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:opacity-60"
        >
          {isPending ? 'Lagrer...' : `Lagre pris ${formatKr(preview.total_cost_ore)}`}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sea-green">
            <Check className="size-4" />
            Lagret
          </span>
        )}
      </div>
    </form>
  );
}
