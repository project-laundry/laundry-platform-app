'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { createDriverAction, updateDriverAction, type DriverFormInput } from './actions';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

export function DriverForm({
  mode,
  driverId,
  initial,
  currentStartLabel,
}: {
  mode: 'create' | 'edit';
  driverId?: string;
  initial?: { full_name: string; email: string; phone: string; city: 'Bergen' | 'Oslo' };
  /** Stored start-point label (edit mode); null = city centre fallback. */
  currentStartLabel?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<DriverFormInput>({
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    password: '',
    city: initial?.city ?? 'Bergen',
    start_street: '',
    start_postal_code: '',
    start_label: '',
    remove_start_point: false,
  });

  function set<K extends keyof DriverFormInput>(key: K, value: DriverFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createDriverAction(form)
          : await updateDriverAction(driverId!, form);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      router.push('/admin/drivers');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Fullt navn</span>
        <input
          required
          value={form.full_name}
          onChange={(e) => set('full_name', e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">E-post</span>
        <input
          type="email"
          required
          disabled={mode === 'edit'}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className={mode === 'edit' ? `${inputClass} bg-cream/50` : inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Telefon</span>
        <input
          required
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="99887766"
          className={inputClass}
        />
      </label>

      {mode === 'create' && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">
            Midlertidig passord
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-xs text-medium-gray">
            Minst 8 tegn. Del passordet med sjåføren — det sendes ingen e-post.
          </span>
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">By</span>
        <select
          value={form.city}
          onChange={(e) => set('city', e.target.value as 'Bergen' | 'Oslo')}
          className={inputClass}
        >
          <option value="Bergen">Bergen</option>
          <option value="Oslo">Oslo</option>
        </select>
      </label>

      <fieldset className="rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3">
        <legend className="px-1 text-sm font-medium text-dark-gray">
          Startpunkt for ruten (valgfritt)
        </legend>
        {mode === 'edit' && (
          <p className="mb-3 text-sm text-medium-gray">
            Nåværende: {currentStartLabel || 'Sentrum (standard)'}. La feltene stå tomme for å
            beholde, eller skriv inn en ny adresse.
          </p>
        )}
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">Gateadresse</span>
            <input
              value={form.start_street}
              onChange={(e) => set('start_street', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">Postnummer</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={form.start_postal_code}
              onChange={(e) => set('start_postal_code', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">
              Etikett (f.eks. «Hjemme»)
            </span>
            <input
              value={form.start_label}
              onChange={(e) => set('start_label', e.target.value)}
              className={inputClass}
            />
          </label>
          {mode === 'edit' && (
            <label className="flex items-center gap-2 text-sm text-dark-gray">
              <input
                type="checkbox"
                checked={form.remove_start_point ?? false}
                onChange={(e) => set('remove_start_point', e.target.checked)}
                className="size-4 accent-[hsl(var(--sea-green))]"
              />
              Fjern startpunkt (bruk sentrum)
            </label>
          )}
        </div>
      </fieldset>

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
        {isPending ? 'Lagrer...' : mode === 'create' ? 'Opprett sjåfør' : 'Lagre endringer'}
      </button>
    </form>
  );
}
