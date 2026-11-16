'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { updateAdminNotesAction } from '../actions';

const textareaClass =
  'w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray';

/** Internal notes on an order. Admin dashboard only — never shown to the customer or cleaner. */
export function AdminNotesForm({
  orderId,
  initialNotes,
}: {
  orderId: string;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateAdminNotesAction(orderId, notes);
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
      <textarea
        value={notes}
        onChange={(e) => {
          setSaved(false);
          setNotes(e.target.value);
        }}
        rows={3}
        maxLength={2000}
        placeholder="Kun synlig for admin"
        className={textareaClass}
      />
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || notes === (initialNotes ?? '')}
          className="inline-flex items-center rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:text-medium-gray disabled:hover:border-cream-dark"
        >
          {isPending ? 'Lagrer...' : 'Lagre notat'}
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
