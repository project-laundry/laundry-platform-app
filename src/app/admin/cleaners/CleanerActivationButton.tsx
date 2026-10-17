'use client';

import { useState, useTransition } from 'react';
import type { CleanerVerificationStatus } from '@/types/database';
import { setCleanerActivationAction } from './actions';

/** Button label per current status — the click always flips to the opposite
 *  side: approved → suspend, everything else → approve. */
const LABELS: Record<CleanerVerificationStatus, string> = {
  pending: 'Godkjenn',
  approved: 'Deaktiver',
  rejected: 'Godkjenn likevel',
  suspended: 'Aktiver på nytt',
};

export function CleanerActivationButton({
  cleanerId,
  status,
}: {
  cleanerId: string;
  status: CleanerVerificationStatus;
}) {
  const isActive = status === 'approved';
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setCleanerActivationAction(cleanerId, !isActive);
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
          isActive
            ? 'border-red-200 bg-white text-red-600 hover:border-red-400'
            : 'border-cream-dark bg-white text-nordic-blue hover:border-sea-green hover:text-sea-green'
        }`}
      >
        {isPending ? 'Lagrer...' : LABELS[status]}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
