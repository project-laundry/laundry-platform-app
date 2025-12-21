'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useOrderFlowStore } from '@/stores/order-flow-store';

function OrderSuccessPageContent() {
  const searchParams = useSearchParams();
  const subscriptionId = searchParams.get('subscriptionId');
  const orderId = searchParams.get('orderId');
  const resetOrderData = useOrderFlowStore((state) => state.resetOrderData);

  // Reset order flow state when success page loads
  useEffect(() => {
    resetOrderData();
  }, [resetOrderData]);

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
            Abonnementet ditt er nå aktivt og renseren vil hente tøyet ditt på avtalt dato.
          </p>

          {subscriptionId && (
            <div className="bg-white rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-center mb-6">
                <div className="bg-nordic-blue/10 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-nordic-blue">
                    Abonnement-ID
                  </h2>
                  <p className="text-sm font-mono text-dark-gray break-all">
                    {subscriptionId}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-white rounded-2xl p-8 mb-8 text-left">
            <h3 className="font-semibold text-dark-gray mb-4">Hva skjer nå?</h3>
            <ul className="space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
                Gjør klar vasken din. Bruk NooraCare-poser hvis du har fått de, eller bruk egne poser.
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                Renseren henter tøyet ditt på den datoen du har valgt.
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
                Du blir automatisk belastet basert på mengde og valgt tjeneste.
              </li>
            </ul>
          </div>

          {/* Pricing Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 mt-0.5">💰</div>
              <div className="text-left">
                <h3 className="font-semibold text-blue-900 mb-2">Viktig om pris</h3>
                <p className="text-sm text-blue-800">
                  Prisen beregnes basert på faktisk vekt og valgt tjeneste. Du belastes automatisk via Vipps etter hver henting.
                </p>
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
