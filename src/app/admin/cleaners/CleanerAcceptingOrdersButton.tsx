'use client';

import { useState, useTransition } from 'react';
import { setCleanerAcceptingOrdersAction } from './actions';

export function CleanerAcceptingOrdersButton({
  cleanerId,
  isAcceptingOrders,
}: {
  cleanerId: string;
  /** cleaners.is_accepting_orders */
  isAcceptingOrders: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setCleanerAcceptingOrdersAction(cleanerId, !isAcceptingOrders);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
          isAcceptingOrders
            ? 'border-cream-dark bg-white text-medium-gray hover:border-amber-400 hover:text-amber-800'
            : 'border-cream-dark bg-white text-nordic-blue hover:border-sea-green hover:text-sea-green'
        }`}
      >
        {isPending ? 'Lagrer...' : isAcceptingOrders ? 'Sett på pause' : 'Gjenoppta oppdrag'}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
