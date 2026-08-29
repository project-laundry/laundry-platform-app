import Link from 'next/link';
import { ChevronLeft, MailCheck } from 'lucide-react';

export default function CleanerEmailVerificationPage() {
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

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-8">
          {/* Success Icon */}
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
            <MailCheck className="size-10" />
          </div>

          {/* Success Message */}
          <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
            Sjekk e-posten din!
          </h1>
          <p className="mt-3 text-medium-gray">
            Vi har sendt en bekreftelseslenke til e-postadressen din. Klikk på lenken for å aktivere renserkontoen din.
          </p>

          {/* Next Steps */}
          <div className="mt-6 rounded-2xl bg-cream/70 p-4 text-left">
            <h3 className="font-serif font-semibold text-dark-gray">Hva skjer nå?</h3>
            <ul className="mt-3 space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="mr-2 font-medium tabular-nums text-sea-green">1.</span>
                Åpne e-posten fra NooraCare
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-medium tabular-nums text-sea-green">2.</span>
                Klikk på bekreftelseslenken
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-medium tabular-nums text-sea-green">3.</span>
                Fullfør renserprofilen din
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-medium tabular-nums text-sea-green">4.</span>
                Start å motta oppdrag!
              </li>
            </ul>
          </div>

          {/* Login Button */}
          <Link
            href="/auth/login"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Gå til innlogging
          </Link>

          {/* Support */}
          <p className="mt-4 text-sm text-medium-gray">
            Ikke mottatt e-post? Sjekk spam-mappen eller{' '}
            <Link href="/bli-renser/signup" className="font-medium text-sea-green underline-offset-2 hover:underline">
              prøv igjen
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/bli-renser"
            className="flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
          >
            <ChevronLeft className="size-4" />
            Tilbake til bli renser
          </Link>
        </div>
      </div>
    </div>
  );
}
