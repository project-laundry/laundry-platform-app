import type { Metadata } from 'next';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { AlertCircle, ChevronLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Lenken virker ikke – NooraCare',
};

/**
 * Landing page for a failed e-mail confirmation (auth/callback redirects here
 * when the token is missing, already used, or expired).
 */
export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-dark-gray">
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

      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-center shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
            <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertCircle className="size-8" />
            </div>

            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
              Noe gikk galt
            </p>
            <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Lenken virker ikke
            </h1>
            <p className="mt-3 leading-relaxed text-medium-gray">
              Bekreftelseslenken er ugyldig eller har utløpt. En lenke kan bare brukes én gang.
            </p>

            <div className="mt-6 rounded-2xl bg-cream/70 p-5 text-left">
              <h2 className="font-serif text-lg font-semibold text-dark-gray">Hva gjør du nå?</h2>
              <ul className="mt-3 space-y-2 text-sm text-medium-gray">
                <li>Har du allerede bekreftet kontoen? Da kan du logge inn som vanlig.</li>
                <li>
                  Ikke bekreftet ennå? Logg inn med e-post og passord, så får du mulighet til å sende en ny
                  bekreftelseslenke.
                </li>
              </ul>
            </div>

            <Link
              href="/auth/login"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Gå til innlogging
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <ChevronLeft className="size-4" />
              Tilbake til hjemmesiden
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
