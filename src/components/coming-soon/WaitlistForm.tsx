'use client';

// Styled for the dark ComingSoonHero background.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { joinWaitlistAction } from '@/app/actions';
import type { WaitlistAudience, WaitlistCity } from '@/types/database';

const CITIES: { value: WaitlistCity; label: string }[] = [
  { value: 'bergen', label: 'Bergen' },
  { value: 'oslo', label: 'Oslo' },
];

export function WaitlistForm({ audience }: { audience: WaitlistAudience }) {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<WaitlistCity | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!city) {
      setError('Velg Bergen eller Oslo');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlistAction({ email, audience, city, consent });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-sol/15 px-4 py-3.5 animate-in fade-in slide-in-from-top-1 duration-300">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sol" />
        <div>
          <p className="font-medium text-sno">Du står på listen</p>
          <p className="mt-0.5 text-sm text-sno/70">
            Vi sender deg en e-post når vi åpner i {city === 'oslo' ? 'Oslo' : 'Bergen'}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="sr-only">E-post</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Din e-postadresse"
          className="w-full rounded-2xl border border-sno/15 bg-sno/10 px-4 py-3.5 text-sno outline-none transition-colors placeholder:text-sno/45 focus:border-sol focus:ring-2 focus:ring-sol/30"
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 block text-sm text-sno/70">Hvor bor du?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CITIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={city === c.value}
              onClick={() => setCity(c.value)}
              className={`rounded-xl border px-4 py-2.5 text-center font-medium transition-all ${
                city === c.value
                  ? 'border-sol bg-sol/20 text-sno'
                  : 'border-sno/15 bg-sno/5 text-sno/80 hover:border-sol/60'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          id={`waitlist-consent-${audience}`}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-4 shrink-0 rounded accent-sol"
          required
        />
        <label htmlFor={`waitlist-consent-${audience}`} className="text-sm text-sno/60">
          Jeg vil få e-post når NooraCare åpner, og godtar at e-postadressen lagres til da.{' '}
          <Link
            href="/personvern#venteliste"
            className="font-medium text-sno underline underline-offset-2 hover:text-sol"
          >
            Personvern
          </Link>
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sol px-6 py-3.5 font-semibold text-fjord shadow-soft transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sender…' : audience === 'cleaner' ? 'Gi meg beskjed' : 'Sett meg på listen'}
        {!pending && <ArrowRight className="size-4" />}
      </button>
    </form>
  );
}
