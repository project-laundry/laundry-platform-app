'use client';

import { useState, useTransition } from 'react';
import { AlertCircle } from 'lucide-react';
import { adminMarkPickedUpAction, adminMarkReadyAction, adminMarkDeliveredAction } from '../actions';
import { formatKr } from '@/lib/config/pricing';

type LogisticsStatus = 'pickup_scheduled' | 'in_cleaning' | 'ready_for_delivery';

const LABELS: Record<LogisticsStatus, string> = {
  pickup_scheduled: 'Marker som hentet',
  in_cleaning: 'Marker som klar',
  ready_for_delivery: 'Marker som levert',
};

/**
 * Fallback for a cleaner who forgot to register pickup, ready or delivery.
 * «Marker som klar» is also the exit for an order stuck in in_cleaning: it
 * CHARGES the customer (same service as the cleaner's button), so it is
 * disabled until the order has wash details and a price — the admin sets
 * those with the price override in the Pris card first. The server action
 * revalidates this page, so it re-renders on success.
 */
export function AdminLogisticsControl({
  orderId,
  status,
  priced,
  amountOre,
}: {
  orderId: string;
  status: LogisticsStatus;
  /** wash_loads > 0 and total_cost_ore set — only consulted for in_cleaning. */
  priced: boolean;
  /** total_cost_ore — shown in the confirm label for in_cleaning. */
  amountOre: number | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const label = LABELS[status];
  const isReadyStep = status === 'in_cleaning';
  const blocked = isReadyStep && !priced;
  const confirmLabel =
    isReadyStep && amountOre !== null && amountOre > 0
      ? `Bekreft: marker som klar og belast ${formatKr(amountOre)}`
      : `Bekreft: ${label.toLowerCase()}`;

  function handleConfirm() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result =
        status === 'pickup_scheduled'
          ? await adminMarkPickedUpAction(orderId)
          : status === 'in_cleaning'
            ? await adminMarkReadyAction(orderId)
            : await adminMarkDeliveredAction(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere status');
      } else if ('chargeFailed' in result && result.chargeFailed) {
        setNotice('Ordren er klar, men belastningen feilet — bruk «Belast på nytt» under Betalinger.');
      }
      setConfirming(false);
    });
  }

  return (
    <div>
      <p className="text-sm text-medium-gray">
        {isReadyStep
          ? 'Gjør ordren klar for levering og belaster kunden. Bruk bare hvis renseren har glemt det.'
          : 'Bruk bare hvis renseren har glemt å registrere det i appen.'}
      </p>
      {blocked && (
        <p className="mt-1.5 text-sm text-amber-800">
          Sett antall vask og pris i Pris-kortet først.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={blocked}
            className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:text-medium-gray disabled:hover:border-cream-dark"
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
              {isPending ? 'Oppdaterer...' : confirmLabel}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
      {notice && (
        <div className="mt-2 flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      )}
    </div>
  );
}
