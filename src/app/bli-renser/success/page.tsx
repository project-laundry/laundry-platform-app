'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Check, Mail, Phone } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';

export default function RegistrationSuccessPage() {
  const resetCleanerData = useCleanerOnboardingStore((state) => state.resetCleanerData);

  useEffect(() => {
    // The application is submitted — clear the onboarding data from session storage.
    resetCleanerData();
  }, [resetCleanerData]);

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
            <Check className="size-8" />
          </div>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Søknad sendt
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Takk, søknaden din er mottatt
          </h1>
          <p className="mx-auto mt-3 max-w-md text-medium-gray">
            Vi går gjennom den og gir deg tilgang til oppdrag så snart du er godkjent.
          </p>
        </div>

        {/* What happens next */}
        <section
          className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
          style={{ animationDelay: '60ms' }}
        >
          <h2 className="font-serif text-lg font-semibold text-dark-gray">Hva skjer videre?</h2>

          <div className="mt-5 space-y-5">
            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                1
              </span>
              <div>
                <h3 className="font-medium text-dark-gray">Vi går gjennom søknaden</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Vi kontrollerer opplysningene du har oppgitt. Dette tar vanligvis 1–2 virkedager.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                2
              </span>
              <div>
                <h3 className="font-medium text-dark-gray">Du ser statusen i dashbordet</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Dashbordet viser om søknaden er under behandling eller godkjent.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                3
              </span>
              <div>
                <h3 className="font-medium text-dark-gray">Du får oppdrag</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Når du er godkjent, blir du koblet til kunder i ditt område og oppdragene dukker opp i dashbordet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section
          className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
          style={{ animationDelay: '120ms' }}
        >
          <h2 className="font-serif text-lg font-semibold text-dark-gray">Har du spørsmål?</h2>
          <ul className="mt-3 space-y-2 text-sm text-dark-gray">
            <li className="flex items-center gap-2">
              <Mail className="size-4 text-sea-green" />
              <a href="mailto:support@nooracare.no" className="transition-colors hover:text-nordic-blue">
                support@nooracare.no
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 text-sea-green" />
              <a href="tel:+4797616468" className="transition-colors hover:text-nordic-blue">
                +47 976 16 468
              </a>
            </li>
          </ul>
        </section>

        <div
          className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '180ms' }}
        >
          <Link
            href="/dashboard/cleaner"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Gå til dashbordet
          </Link>
        </div>
      </main>
    </div>
  );
}
