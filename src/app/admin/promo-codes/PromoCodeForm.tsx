'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import {
  createPromoCodeAction,
  updatePromoCodeAction,
  type PromoCodeFormInput,
} from './actions';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

export function PromoCodeForm({
  mode,
  promoCodeId,
  initial,
}: {
  mode: 'create' | 'edit';
  promoCodeId?: string;
  initial?: PromoCodeFormInput;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<PromoCodeFormInput>({
    code: initial?.code ?? '',
    discount_type: initial?.discount_type ?? 'percentage',
    discount_value: initial?.discount_value ?? '',
    max_discount_kr: initial?.max_discount_kr ?? '',
    valid_from: initial?.valid_from ?? '',
    valid_until: initial?.valid_until ?? '',
    max_redemptions: initial?.max_redemptions ?? '',
    active: initial?.active ?? true,
  });

  function set<K extends keyof PromoCodeFormInput>(key: K, value: PromoCodeFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createPromoCodeAction(form)
          : await updatePromoCodeAction(promoCodeId!, form);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      router.push('/admin/promo-codes');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Kode</span>
        <input
          required
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          placeholder="VELKOMMEN10"
          className={`${inputClass} uppercase`}
        />
        <span className="mt-1.5 block text-xs text-medium-gray">
          2–32 tegn: bokstaver, tall og bindestrek. Lagres med store bokstaver.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Rabattype</span>
        <select
          value={form.discount_type}
          onChange={(e) => set('discount_type', e.target.value as 'percentage' | 'fixed')}
          className={inputClass}
        >
          <option value="percentage">Prosent</option>
          <option value="fixed">Fast beløp (kr)</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          {form.discount_type === 'percentage' ? 'Rabatt (%)' : 'Rabatt (kr)'}
        </span>
        <input
          required
          inputMode="numeric"
          value={form.discount_value}
          onChange={(e) => set('discount_value', e.target.value)}
          placeholder={form.discount_type === 'percentage' ? '10' : '100'}
          className={inputClass}
        />
      </label>

      {form.discount_type === 'percentage' && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">
            Maks rabatt (kr, valgfritt)
          </span>
          <input
            inputMode="numeric"
            value={form.max_discount_kr}
            onChange={(e) => set('max_discount_kr', e.target.value)}
            placeholder="Ingen grense"
            className={inputClass}
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gyldig fra</span>
          <input
            type="date"
            value={form.valid_from}
            onChange={(e) => set('valid_from', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gyldig til</span>
          <input
            type="date"
            value={form.valid_until}
            onChange={(e) => set('valid_until', e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Maks antall bruk (valgfritt)
        </span>
        <input
          inputMode="numeric"
          value={form.max_redemptions}
          onChange={(e) => set('max_redemptions', e.target.value)}
          placeholder="Ubegrenset"
          className={inputClass}
        />
        <span className="mt-1.5 block text-xs text-medium-gray">
          Hver kunde kan uansett bare bruke koden én gang.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm text-dark-gray">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set('active', e.target.checked)}
          className="size-4 accent-[hsl(var(--sea-green))]"
        />
        Aktiv
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {isPending ? 'Lagrer...' : mode === 'create' ? 'Opprett rabattkode' : 'Lagre endringer'}
      </button>
    </form>
  );
}
