'use client';

import { useEffect } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { Check, Mail, Phone, TriangleAlert } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';

export default function RegistrationSuccessPage() {
  const resetCleanerData = useCleanerOnboardingStore((state) => state.resetCleanerData);

  useEffect(() => {
    // Clear the onboarding data from session storage
    resetCleanerData();
  }, [resetCleanerData]);

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader
        right={
          <span className="text-sm font-medium text-sea-green">
            Registrering fullført!
          </span>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Success Icon */}
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
            <Check className="size-10" />
          </div>

          <h1 className="mt-6 text-center font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Takk for din interesse!
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-medium-gray">
            Din søknad for å bli renser hos NooraCare er mottatt og vil bli gjennomgått av vårt team.
          </p>
        </div>

        {/* What happens next */}
        <section
          className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
          style={{ animationDelay: '60ms' }}
        >
          <h2 className="text-center font-serif text-2xl font-semibold text-dark-gray">
            Hva skjer videre?
          </h2>

          <div className="mt-6 space-y-6">
            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                1
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-dark-gray">Gjennomgang av søknad</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Vi gjennomgår all informasjonen du har oppgitt og kontrollerer at alt er i orden.
                  Dette tar vanligvis 1-2 virkedager.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                2
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-dark-gray">Verifisering</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Vi verifiserer identiteten din og kontrollerer referanser for å sikre trygghet for alle parter.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 font-serif font-semibold text-sea-green">
                3
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-dark-gray">Godkjenning og onboarding</h3>
                <p className="mt-1 text-sm text-medium-gray">
                  Når alt er godkjent får du tilgang til renser-portalen og kan begynne å motta oppdrag!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section
          className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
          style={{ animationDelay: '120ms' }}
        >
          <h3 className="font-serif text-lg font-semibold text-dark-gray">Har du spørsmål?</h3>
          <p className="mt-2 text-sm text-medium-gray">
            Vi er her for å hjelpe deg gjennom prosessen. Ta gjerne kontakt hvis du har spørsmål.
          </p>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Mail className="size-4 text-nordic-blue" />
              <span className="text-dark-gray">support@nooracare.no</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Phone className="size-4 text-nordic-blue" />
              <span className="text-dark-gray">+47 12 34 56 78</span>
            </div>
          </div>
        </section>

        {/* Important Notice */}
        <div
          className="mt-6 flex items-start gap-2.5 rounded-2xl bg-amber-50 px-4 py-3 text-amber-800 animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '180ms' }}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <h4 className="text-sm font-medium">Viktig informasjon</h4>
            <p className="mt-1 text-sm">
              Du vil motta en bekreftelse på e-post innen 24 timer. Sjekk også spam-mappen din
              hvis du ikke finner den i innboksen.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className="mt-8 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '240ms' }}
        >
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Tilbake til forsiden
          </Link>
          <a
            href="/auth/login"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
          >
            Logg inn på eksisterende konto
          </a>
        </div>

        {/* Social Proof */}
        <div className="mt-12 text-center">
          <p className="text-sm text-medium-gray">
            Bli en del av vårt voksende nettverk av rensere
          </p>
          <div className="mt-4 flex items-center justify-center gap-8 text-sm text-medium-gray">
            <div>
              <div className="font-serif text-2xl font-semibold tabular-nums text-nordic-blue">150+</div>
              <div>Aktive rensere</div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold tabular-nums text-sea-green">98%</div>
              <div>Kundetilfredshet</div>
            </div>
            <div>
              <div className="font-serif text-2xl font-semibold tabular-nums text-nordic-blue">24/7</div>
              <div>Støtte</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
