'use client';

import { useState, useTransition } from 'react';
import { assignCleanerAction } from './actions';

export interface CleanerOption {
  id: string;
  display_name: string;
}

/**
 * Cleaner (re)assignment control for one order row. The server action
 * revalidates /admin/orders, so the surrounding server-rendered list
 * refreshes on success without any client-side reload logic.
 */
export function AssignCleanerControl({
  orderId,
  currentCleanerId,
  cleaners,
}: {
  orderId: string;
  currentCleanerId: string | null;
  cleaners: CleanerOption[];
}) {
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = cleaners.filter((cleaner) => cleaner.id !== currentCleanerId);

  if (options.length === 0) {
    return <p className="text-sm text-red-700">Ingen tilgjengelige rensere i byen</p>;
  }

  function handleAssign() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await assignCleanerAction(orderId, selected);
      if (!result.success) {
        setError(result.error || 'Kunne ikke tildele renser');
      } else {
        setSelected('');
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 rounded-2xl border border-cream-dark bg-white px-4 py-2.5 text-sm text-dark-gray outline-none transition-colors focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
        >
          <option value="" disabled>
            {currentCleanerId ? 'Bytt renser...' : 'Velg renser...'}
          </option>
          {options.map((cleaner) => (
            <option key={cleaner.id} value={cleaner.id}>
              {cleaner.display_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleAssign}
          disabled={isPending || !selected}
          className="inline-flex shrink-0 items-center rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
        >
          {isPending ? 'Tildeler...' : 'Tildel'}
        </button>
      </div>
      {error && <p className="mt-1.5 text-sm text-red-700">{error}</p>}
    </div>
  );
}
