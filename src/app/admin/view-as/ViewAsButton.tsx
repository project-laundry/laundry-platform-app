'use client';

import { useState, useTransition } from 'react';
import { Eye } from 'lucide-react';
import { startViewAsAction } from './actions';

/** «Se som kunde» / «Se som renser» on the admin detail pages. */
export function ViewAsButton({ userId, label }: { userId: string; label: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      // On success the action redirects and never returns.
      const result = await startViewAsAction(userId);
      if (result && !result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Eye className="size-4" />
        {isPending ? 'Åpner...' : label}
      </button>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
