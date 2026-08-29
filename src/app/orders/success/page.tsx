'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { Check, ChevronLeft, Clock, Info, Loader2, X } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { getCheckoutStatusAction, type CheckoutStatus } from '../actions';

// While Vipps finishes activating the agreement the status stays PENDING for a
// short while after redirect — poll a few times before giving up.
const MAX_POLL_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 2000;

type ViewState = 'loading' | 'active' | 'cancelled' | 'pending';

function OrderSuccessPageContent() {
  const [viewState, setViewState] = useState<ViewState>('loading');
  const resetOrderData = useOrderFlowStore((state) => state.resetOrderData);

  const pollStatus = useCallback(async (): Promise<ViewState> => {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      let status: CheckoutStatus;
      try {
        ({ status } = await getCheckoutStatusAction());
      } catch {
        status = 'unknown';
      }

      if (status === 'active') {
        // Only clear the order flow once the agreement is confirmed, so an
        // aborted checkout can be retried with the same details.
        resetOrderData();
        return 'active';
      }

      if (status === 'cancelled') {
        return 'cancelled';
      }

      // pending / unknown — wait and retry (unless this was the last attempt)
      if (attempt < MAX_POLL_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }

    // Still not confirmed after polling — likely awaiting confirmation in app
    return 'pending';
  }, [resetOrderData]);

  useEffect(() => {
    pollStatus().then(setViewState);
  }, [pollStatus]);

  const retryCheck = () => {
    setViewState('loading');
    pollStatus().then(setViewState);
  };

  return (
    <PageShell>
      {viewState === 'loading' && <LoadingView />}
      {viewState === 'active' && <SuccessView />}
      {viewState === 'cancelled' && <CancelledView />}
      {viewState === 'pending' && <PendingView onRetry={retryCheck} />}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
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

      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 py-12">{children}</main>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="py-12 text-center">
      <Loader2 className="mx-auto size-10 animate-spin text-nordic-blue" />
      <p className="mt-4 text-medium-gray">Bekrefter betalingen din...</p>
    </div>
  );
}

function StatusIcon({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'pending';
  children: React.ReactNode;
}) {
  const tones = {
    success: 'bg-sea-green/10 text-sea-green',
    error: 'bg-red-50 text-red-600',
    pending: 'bg-amber-50 text-amber-500',
  } as const;
  return (
    <div
      className={`mx-auto mb-8 flex size-20 items-center justify-center rounded-full ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

function BackToDashboard() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
    >
      <ChevronLeft className="size-4" />
      Tilbake til dashbord
    </Link>
  );
}

function SuccessView() {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
      <StatusIcon tone="success">
        <Check className="size-10" strokeWidth={3} />
      </StatusIcon>

      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Din avtale er opprettet!
      </h1>
      <p className="mx-auto mt-3 max-w-md text-medium-gray">
        Abonnementet er aktivt. Vi henter tøyet ditt på avtalt dato.
      </p>

      {/* What happens next */}
      <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-left shadow-[var(--shadow-card)] backdrop-blur">
        <h3 className="font-serif text-lg font-semibold text-dark-gray">
          Hva skjer nå?
        </h3>
        <ul className="mt-3 space-y-2.5 text-sm text-medium-gray">
          <li className="flex items-start">
            <span className="mr-2 font-serif font-semibold text-sea-green">1.</span>
            Gjør klar vasken: Bruk NooraCare-posene du har fått utdelt. Har du ikke mottatt poser ennå, går det fint å bruke egne poser inntil videre.
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-serif font-semibold text-sea-green">2.</span>
            Henting: Vi kommer innom og henter tøyet på datoen du har valgt.
          </li>
          <li className="flex items-start">
            <span className="mr-2 font-serif font-semibold text-sea-green">3.</span>
            Levering og betaling: Når klærne leveres ferdig renset tilbake, belastes du automatisk via Vipps.
          </li>
        </ul>
      </div>

      {/* Pricing Notice */}
      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3 text-left">
        <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
        <div>
          <p className="text-sm leading-relaxed text-medium-gray">
            <span className="font-medium text-dark-gray">Betaling og pris:</span>{' '}
            Prisen baseres på valgt tjeneste og tøyets vekt, som vi veier ved henting. Du belastes automatisk via Vipps først når klærne dine er levert ferdig renset tilbake til deg.
          </p>
          <a
            target="_blank"
            href="/pris-kalkulator"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-sm font-medium text-sea-green underline-offset-2 hover:underline"
          >
            Se prisliste og kalkulator
          </a>
        </div>
      </div>

      <div className="mt-8">
        <BackToDashboard />
      </div>
    </div>
  );
}

function CancelledView() {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
      <StatusIcon tone="error">
        <X className="size-10" strokeWidth={3} />
      </StatusIcon>

      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Betalingen ble avbrutt
      </h1>
      <p className="mx-auto mt-3 max-w-md text-medium-gray">
        Avtalen ble ikke fullført, og du har ikke blitt belastet. Ingen
        bestilling er opprettet.
      </p>

      <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-left shadow-[var(--shadow-card)] backdrop-blur">
        <p className="text-sm text-medium-gray">
          Vil du prøve igjen? Bestillingsdetaljene dine er fortsatt lagret, så du
          kan fullføre der du slapp.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Link
          href="/orders/confirm"
          className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Prøv igjen
        </Link>
        <BackToDashboard />
      </div>
    </div>
  );
}

function PendingView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
      <StatusIcon tone="pending">
        <Clock className="size-10" />
      </StatusIcon>

      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Venter på bekreftelse
      </h1>
      <p className="mx-auto mt-3 max-w-md text-medium-gray">
        Vi har ikke mottatt bekreftelse fra Vipps ennå. Fullfør avtalen i
        Vipps-appen hvis du ikke har gjort det.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Sjekk på nytt
        </button>
        <BackToDashboard />
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <LoadingView />
        </PageShell>
      }
    >
      <OrderSuccessPageContent />
    </Suspense>
  );
}
