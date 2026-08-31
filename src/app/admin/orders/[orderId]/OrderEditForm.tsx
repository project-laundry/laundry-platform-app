'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { updateOrderDetailsAction, type UpdateOrderDetailsInput } from '../actions';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-medium-gray';

export type OrderEditability = 'full' | 'partial' | 'none';

/**
 * Edit form for an order's schedule and address. The customer's
 * instructions and ironing preference are shown read-only by the
 * page, not here. editability: 'full' before pickup, 'partial'
 * while in progress (pickup date locked), 'none' for
 * completed/cancelled (pure read-only display, no save button).
 */
export function OrderEditForm({
  orderId,
  editability,
  initial,
}: {
  orderId: string;
  editability: OrderEditability;
  initial: UpdateOrderDetailsInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<UpdateOrderDetailsInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const readOnly = editability === 'none';
  const pickupLocked = editability !== 'full';

  function set<K extends keyof UpdateOrderDetailsInput>(
    key: K,
    value: UpdateOrderDetailsInput[K]
  ) {
    setSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateOrderDetailsAction(orderId, form);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Hentedato</span>
          <input
            type="date"
            required
            disabled={readOnly || pickupLocked}
            value={form.scheduled_date}
            onChange={(e) => set('scheduled_date', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">
            Estimert levering
          </span>
          <input
            type="date"
            required
            disabled={readOnly}
            value={form.delivery_date}
            onChange={(e) => set('delivery_date', e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gateadresse</span>
        <input
          required
          disabled={readOnly}
          value={form.street}
          onChange={(e) => set('street', e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Postnummer</span>
        <input
          required
          inputMode="numeric"
          maxLength={4}
          disabled={readOnly}
          value={form.postal_code}
          onChange={(e) => set('postal_code', e.target.value)}
          className={inputClass}
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            {isPending ? 'Lagrer...' : 'Lagre endringer'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sea-green">
              <Check className="size-4" />
              Lagret
            </span>
          )}
        </div>
      )}
    </form>
  );
}
