'use client';

import { useState, useTransition } from 'react';
import { adminMarkPickedUpAction, adminMarkDeliveredAction } from '../actions';

/**
 * Fallback for a cleaner who forgot to register pickup or delivery. The
 * server action revalidates this page, so it re-renders on success.
 */
export function AdminLogisticsControl({
  orderId,
  status,
}: {
  orderId: string;
  status: 'pickup_scheduled' | 'ready_for_delivery';
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPickup = status === 'pickup_scheduled';
  const label = isPickup ? 'Marker som hentet' : 'Marker som levert';

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = isPickup
        ? await adminMarkPickedUpAction(orderId)
        : await adminMarkDeliveredAction(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere status');
      }
      setConfirming(false);
    });
  }

  return (
    <div>
      <p className="text-sm text-medium-gray">
        Bruk bare hvis renseren har glemt å registrere det i appen.
      </p>
      <div className="mt-3 flex gap-2">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
          >
            {label}
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
              {isPending ? 'Oppdaterer...' : `Bekreft: ${label.toLowerCase()}`}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
