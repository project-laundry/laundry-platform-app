'use client';

import { useState, useTransition } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cancelOrderAdminAction } from '../actions';

const textareaClass =
  'w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray';

/**
 * Admin cancellation of a not-yet-picked-up order. The page renders this only
 * for pending_assignment / pickup_scheduled; the server action re-validates
 * the status and requires the reason. Two-tap confirm like RetryChargeControl;
 * the action revalidates the page, so the status badge and timeline update.
 */
export function CancelOrderControl({
  orderId,
  hasSubscription,
}: {
  orderId: string;
  hasSubscription: boolean;
}) {
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const reasonMissing = reason.trim().length === 0;

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAdminAction(orderId, reason);
      if (!result.success) {
        setError(result.error || 'Kunne ikke kansellere ordren');
      }
      setConfirming(false);
    });
  }

  return (
    <div>
      <p className="text-sm text-medium-gray">
        {hasSubscription
          ? 'Abonnementet fortsetter — neste ordre opprettes automatisk.'
          : 'Engangsbestilling — ingen ny ordre opprettes.'}
      </p>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Årsak (vises til kunden)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isPending}
          rows={2}
          maxLength={500}
          placeholder="F.eks. duplikat av bestilling #ABC123"
          className={textareaClass}
        />
      </label>
      <div className="mt-3 flex gap-2">
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={reasonMissing}
            className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-red-700 transition-all hover:border-red-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:text-medium-gray"
          >
            Kanseller ordre
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
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              <TriangleAlert className="size-4" />
              {isPending ? 'Kansellerer...' : 'Bekreft kansellering'}
            </button>
          </>
        )}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
