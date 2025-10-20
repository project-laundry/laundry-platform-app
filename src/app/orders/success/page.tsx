'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function OrderSuccessPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    const id = searchParams.get('orderId');
    if (id) {
      setOrderId(id);
    }
  }, [searchParams]);

  const handleTrackOrder = () => {
    // Redirect to order tracking
    window.location.href = `/orders/${orderId}`;
  };

  const handleNewOrder = () => {
    window.location.href = '/orders/additional-services';
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
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <svg className="w-12 h-12 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-dark-gray mb-4">
            Bestilling bekreftet! 🎉
          </h1>
          <p className="text-xl text-medium-gray mb-8">
            Din henting er planlagt og vi sender deg varsling når renseren er på vei.
          </p>

          {/* Order Details Card */}
          <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-nordic-blue/10 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-nordic-blue">Bestillingsnummer</h2>
                <p className="text-2xl font-bold text-dark-gray">{orderId}</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-dark-gray mb-2">Hva skjer nå?</h3>
                <ul className="space-y-2 text-sm text-medium-gray">
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
                    Vi tildeler en renser til din bestilling
                  </li>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                    Du får SMS når renseren er på vei
                  </li>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
                    Renseren henter klærne dine
                  </li>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">4.</span>
                    Klærne vaskes og leveres tilbake (2-3 dager)
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-dark-gray mb-2">Kontaktinformasjon</h3>
                <div className="text-sm text-medium-gray space-y-2">
                  <p>
                    <span className="font-medium">E-post:</span> hei@nooracare.no
                  </p>
                  <p>
                    <span className="font-medium">Telefon:</span> +47 123 45 678
                  </p>
                  <p>
                    <span className="font-medium">Åpningstider:</span> 8-20 hverdager
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={handleTrackOrder}
              className="bg-nordic-blue text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Følg bestilling
            </button>
            <button
              onClick={handleNewOrder}
              className="border-2 border-nordic-blue text-nordic-blue font-semibold px-8 py-3 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Ny bestilling
            </button>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 mt-0.5">💡</div>
              <div className="text-left">
                <h3 className="font-semibold text-yellow-800 mb-2">Viktige tips for første henting</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Ha klærne klare i NooraCare-posen</li>
                  <li>• Sjekk lommene for verdisaker</li>
                  <li>• Vær tilgjengelig på telefon under hentetiden</li>
                  <li>• Gi beskjed hvis du ikke kan være hjemme</li>
                </ul>
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