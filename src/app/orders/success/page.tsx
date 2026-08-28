'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
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
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/dashboard" className="inline-block">
            <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {viewState === 'loading' && <LoadingView />}
        {viewState === 'active' && <SuccessView />}
        {viewState === 'cancelled' && <CancelledView />}
        {viewState === 'pending' && <PendingView onRetry={retryCheck} />}
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-nordic-blue"></div>
      <p className="mt-4 text-medium-gray">Bekrefter betalingen din...</p>
    </div>
  );
}

function SuccessView() {
  return (
    <div className="text-center">
      {/* Success Icon */}
      <div className="w-24 h-24 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg className="w-12 h-12 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      {/* Success Message */}
      <h1 className="text-3xl font-bold text-dark-gray mb-4">
        Din avtale er opprettet!
      </h1>
      <p className="text-xl text-medium-gray mb-8">
        Abonnementet er aktivt. Vi henter tøyet ditt på avtalt dato.
      </p>

      {/* What happens next */}
      <div className="bg-white rounded-2xl p-8 mb-8 text-left">
        <h3 className="font-semibold text-dark-gray mb-4">Hva skjer nå?</h3>
        <ul className="space-y-2 text-sm text-medium-gray">
          <li className="flex items-start">
            <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
            Gjør klar vasken: Bruk NooraCare-posene du har fått utdelt. Har du ikke mottatt poser ennå, går det fint å bruke egne poser inntil videre.
          </li>
          <li className="flex items-start">
            <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
            Henting: Vi kommer innom og henter tøyet på datoen du har valgt.
          </li>
          <li className="flex items-start">
            <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
            Levering og betaling: Når klærne leveres ferdig renset tilbake, belastes du automatisk via Vipps.
          </li>
        </ul>
      </div>

      {/* Pricing Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start">
          <div className="text-blue-600 mr-3 mt-0.5">💰</div>
          <div className="text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Betaling og pris</h3>
            <p className="text-sm text-blue-800 mb-3">
              Prisen baseres på valgt tjeneste og tøyets vekt, som vi veier ved henting. Du belastes automatisk via Vipps først når klærne dine er levert ferdig renset tilbake til deg.
            </p>
            <a
              target='_blank'
              href="/pris-kalkulator"
              rel="noopener noreferrer"
              className="text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium underline"
            >
              Se prisliste og kalkulator
            </a>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-medium-gray hover:text-dark-gray transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Tilbake til dashbord
      </Link>
    </div>
  );
}

function CancelledView() {
  return (
    <div className="text-center">
      {/* Cancelled Icon */}
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-dark-gray mb-4">
        Betalingen ble avbrutt
      </h1>
      <p className="text-xl text-medium-gray mb-8">
        Avtalen ble ikke fullført, og du har ikke blitt belastet. Ingen
        bestilling er opprettet.
      </p>

      <div className="bg-white rounded-2xl p-8 mb-8 text-left">
        <p className="text-sm text-medium-gray">
          Vil du prøve igjen? Bestillingsdetaljene dine er fortsatt lagret, så du
          kan fullføre der du slapp.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4">
        <Link
          href="/orders/confirm"
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 rounded-lg font-medium text-white bg-nordic-blue hover:opacity-90 transition-opacity"
        >
          Prøv igjen
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-medium-gray hover:text-dark-gray transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Tilbake til dashbord
        </Link>
      </div>
    </div>
  );
}

function PendingView({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center">
      {/* Pending Icon */}
      <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-8">
        <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h1 className="text-3xl font-bold text-dark-gray mb-4">
        Venter på bekreftelse
      </h1>
      <p className="text-xl text-medium-gray mb-8">
        Vi har ikke mottatt bekreftelse fra Vipps ennå. Fullfør avtalen i
        Vipps-appen hvis du ikke har gjort det.
      </p>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 rounded-lg font-medium text-white bg-nordic-blue hover:opacity-90 transition-opacity"
        >
          Sjekk på nytt
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center text-medium-gray hover:text-dark-gray transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Tilbake til dashbord
        </Link>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-nordic-blue"></div>
          <p className="mt-4 text-medium-gray">Laster...</p>
        </div>
      </div>
    }>
      <OrderSuccessPageContent />
    </Suspense>
  );
}
