'use client';

// Sits in the white card of the light ComingSoonHero; fields follow BRANDBOOK §4.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Check, CheckCircle2, Share2 } from 'lucide-react';
import { joinWaitlistAction } from '@/app/actions';
import { isValidEmail } from '@/lib/utils/email';
import { INSTAGRAM_URL } from '@/components/coming-soon/launch';
import type { WaitlistAudience, WaitlistCity } from '@/types/database';

const CITIES: { value: WaitlistCity; label: string }[] = [
  { value: 'bergen', label: 'Bergen' },
  { value: 'oslo', label: 'Oslo' },
];

const CITY_LABEL: Record<WaitlistCity, string> = { bergen: 'Bergen', oslo: 'Oslo' };

const COPY: Record<
  WaitlistAudience,
  { submit: string; share: (city: string) => string; shareTitle: string; path: string }
> = {
  customer: {
    submit: 'Sett meg på listen',
    share: (city) => `Kjenner du noen i ${city} som hater klesvask? Send dem lenken.`,
    shareTitle: 'NooraCare – slipp klesvasken',
    path: '/',
  },
  cleaner: {
    submit: 'Jeg vil bli renser',
    share: (city) => `Kjenner du noen i ${city} med vaskemaskin og litt ledig tid? Send dem lenken.`,
    shareTitle: 'NooraCare – tjen penger på vaskemaskinen din',
    path: '/bli-renser',
  },
};

export function WaitlistForm({ audience }: { audience: WaitlistAudience }) {
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<WaitlistCity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const copy = COPY[audience];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // noValidate on the form: the browser's own messages come in the
    // browser's locale, so we validate here in Norwegian instead.
    if (!isValidEmail(email)) {
      setError('Skriv inn en gyldig e-postadresse');
      return;
    }
    if (!city) {
      setError('Velg Bergen eller Oslo');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await joinWaitlistAction({ email, audience, city });
      if (result.ok) setDone(true);
      else setError(result.error);
    });
  }

  if (done && city) {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
        <div className="flex items-start gap-3 rounded-2xl bg-sea-green/10 px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-sea-green" />
          <div>
            <p className="font-medium text-dark-gray">Du står på listen</p>
            <p className="mt-0.5 text-sm text-medium-gray">
              Vi sender deg én e-post når vi åpner i {CITY_LABEL[city]}.
            </p>
          </div>
        </div>
        <ShareRow
          text={copy.share(CITY_LABEL[city])}
          title={copy.shareTitle}
          path={copy.path}
        />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <label className="block">
        <span className="sr-only">E-post</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Din e-postadresse"
          className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3.5 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
        />
      </label>

      <fieldset>
        <legend className="mb-1.5 block text-sm text-medium-gray">Hvor bor du?</legend>
        <div className="grid grid-cols-2 gap-2">
          {CITIES.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={city === c.value}
              onClick={() => setCity(c.value)}
              className={`rounded-xl border px-4 py-2.5 text-center font-medium transition-all ${
                city === c.value
                  ? 'border-sea-green bg-sea-green/10 text-sea-green'
                  : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {pending ? 'Sender…' : copy.submit}
        {!pending && <ArrowRight className="size-4" />}
      </button>

      {/* Submitting is the consent; /personvern#venteliste says what it covers. */}
      <p className="text-center text-xs text-medium-gray">
        <Link
          href="/personvern#venteliste"
          className="underline underline-offset-2 hover:text-nordic-blue"
        >
          Personvern
        </Link>
      </p>
    </form>
  );
}

/** "Tell a friend" row shown after signup: native share sheet where it exists
 *  (phones), copy-to-clipboard elsewhere, plus the Instagram link. */
function ShareRow({ text, title, path }: { text: string; title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // The user dismissed the share sheet, or clipboard access was denied — nothing to do.
    }
  }

  return (
    <div>
      <p className="text-sm text-medium-gray">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
        >
          {copied ? <Check className="size-4" /> : <Share2 className="size-4" />}
          {copied ? 'Lenke kopiert' : 'Del lenken'}
        </button>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-5 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
        >
          Følg oss på Instagram
        </a>
      </div>
    </div>
  );
}
