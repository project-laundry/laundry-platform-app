'use client';

import { useState, useTransition } from 'react';
import { CLEANER_REJECTION_REASON_MAX } from '@/lib/validation/cleaner';
import { rejectCleanerAction } from '../actions';

/**
 * «Avvis søknaden» — two-step like RetryChargeControl: the first tap opens the
 * reason textarea, «Bekreft avvisning» submits. The server action re-validates
 * the reason and revalidates the page, so the status card re-renders as
 * rejected on success.
 */
export function CleanerRejectControl({ cleanerId }: { cleanerId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await rejectCleanerAction(cleanerId, reason);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      setOpen(false);
      setReason('');
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-all hover:border-red-400 active:scale-[0.98]"
      >
        Avvis søknaden
      </button>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
      <label htmlFor="rejection-reason" className="block text-sm font-medium text-dark-gray">
        Begrunnelse (vises til renseren)
      </label>
      <textarea
        id="rejection-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value.slice(0, CLEANER_REJECTION_REASON_MAX))}
        disabled={isPending}
        rows={3}
        maxLength={CLEANER_REJECTION_REASON_MAX}
        placeholder="F.eks. vi dekker dessverre ikke området ditt ennå"
        className="mt-1.5 w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-sm text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray"
      />
      <p className="mt-1 text-xs text-medium-gray">
        {reason.length}/{CLEANER_REJECTION_REASON_MAX}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={isPending}
          className="inline-flex items-center rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all active:scale-[0.98] disabled:opacity-60"
        >
          Avbryt
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending || reason.trim().length === 0}
          className="inline-flex items-center rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
        >
          {isPending ? 'Avviser...' : 'Bekreft avvisning'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
