import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { ChevronLeft, MailCheck } from 'lucide-react';

export default function SuccessPage() {
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
        <div className="mb-8 text-center">
        </div>

        <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-center shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
          {/* Success Icon */}
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
            <MailCheck className="size-8" />
          </div>

          {/* Success Message */}
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Nesten ferdig
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-dark-gray">
            Sjekk e-posten din!
          </h1>
          <p className="mt-3 leading-relaxed text-medium-gray">
            Vi har sendt en bekreftelseslenke til e-postadressen din. Klikk på lenken for å aktivere kontoen din.
          </p>

          {/* Next Steps */}
          <div className="mt-6 rounded-2xl bg-cream/70 p-5 text-left">
            <h2 className="font-serif text-lg font-semibold text-dark-gray">
              Hva skjer nå?
            </h2>
            <ol className="mt-3 space-y-2 text-sm text-medium-gray">
              <li className="flex items-start gap-2">
                <span className="font-serif font-semibold tabular-nums text-sea-green">1.</span>
                Åpne e-posten fra NooraCare
              </li>
              <li className="flex items-start gap-2">
                <span className="font-serif font-semibold tabular-nums text-sea-green">2.</span>
                Klikk på bekreftelseslenken
              </li>
              <li className="flex items-start gap-2">
                <span className="font-serif font-semibold tabular-nums text-sea-green">3.</span>
                Logg inn og kom i gang!
              </li>
            </ol>
          </div>

          {/* Login Button */}
          <Link
            href="/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Gå til innlogging
          </Link>

          {/* Customer Support */}
          <p className="mt-4 text-sm text-medium-gray">
            Ikke mottatt e-post? Sjekk spam-mappen eller{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-nordic-blue underline-offset-2 hover:underline"
            >
              prøv igjen
            </Link>
          </p>
        </div>

        {/* Back to Home */}
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
