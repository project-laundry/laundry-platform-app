import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { Check, ChevronLeft } from 'lucide-react';

interface SuccessPageProps {
  searchParams: Promise<{ inFlight?: string }>;
}

export default async function CancelSubscriptionSuccessPage({ searchParams }: SuccessPageProps) {
  const { inFlight } = await searchParams;
  const isDeferred = inFlight === 'true';

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

      {/* Header */}
      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Success Icon */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
              <Check className="size-8" />
            </span>
            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Abonnementet er kansellert
            </h1>
            <p className="mt-3 text-medium-gray">
              {isDeferred
                ? 'Ditt abonnement er nå stoppet. Din pågående bestilling fullføres som normalt.'
                : 'Ditt abonnement er nå stoppet. Du vil ikke motta flere hentinger.'}
            </p>
          </div>

          {/* What happens next */}
          <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 text-left shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">Hva skjer nå?</h3>
            <ul className="mt-4 space-y-2 text-sm text-medium-gray">
              {isDeferred ? (
                <>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">1.</span>
                    Din pågående bestilling fullføres og belastes som normalt — den blir din siste bestilling.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                    Vipps-avtalen avsluttes automatisk når bestillingen er betalt.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">3.</span>
                    Du kan opprette et nytt abonnement når som helst fra dashbordet.
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">1.</span>
                    Vipps-avtalen din er stoppet og du vil ikke bli belastet i fremtiden.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                    Du kan opprette et nytt abonnement når som helst fra dashbordet.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">3.</span>
                    Takk for at du brukte NooraCare!
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Back to Dashboard */}
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <ChevronLeft className="size-4" />
              Tilbake til dashbord
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
