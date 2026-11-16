'use client';

import { useState, useTransition } from 'react';
import { AlertCircle } from 'lucide-react';
import { retryChargeAction } from '../actions';
import { formatKr } from '@/lib/config/pricing';

/**
 * «Belast på nytt» — the page renders this only when the order should carry a
 * charge but has no live payment (every row failed / cancelled / orphaned).
 * Two-tap confirm like AdminLogisticsControl; the server action re-validates
 * everything and revalidates the page, so the new payment row appears on
 * success and the failed row appears on a failed retry.
 */
export function RetryChargeControl({
  orderId,
  amountOre,
}: {
  orderId: string;
  amountOre: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await retryChargeAction(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke belaste kunden');
      }
      setConfirming(false);
    });
  }

  return (
    <div>
      <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>Kunden er ikke belastet for denne ordren.</p>
      </div>
      <div className="mt-3 flex gap-2">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
          >
            Belast på nytt
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={isPending}
              className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all active:scale-[0.98] disabled:opacity-60"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="inline-flex items-center rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              {isPending ? 'Belaster...' : `Bekreft: belast ${formatKr(amountOre)}`}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
