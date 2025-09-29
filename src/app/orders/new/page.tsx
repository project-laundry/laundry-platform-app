'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewOrderPage() {
  const handleContinue = () => {
    // Skip directly to schedule page since no item selection needed
    window.location.href = '/orders/schedule';
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Ny bestilling</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Klar for henting! 👕</h2>
          <p className="text-xl text-medium-gray">
            La oss planlegge når vi skal hente vasken din.
          </p>
        </div>

        {/* What's Included */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-semibold text-dark-gray mb-6 text-center">Din NooraCare-pose inkluderer</h3>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">👕</div>
              <h4 className="font-semibold text-dark-gray mb-2">Hverdagsklær</h4>
              <p className="text-sm text-medium-gray">
                Skjorter, bukser, kjoler, gensere og lignende
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-4xl mb-4">🧵</div>
              <h4 className="font-semibold text-dark-gray mb-2">Delikate plagg</h4>
              <p className="text-sm text-medium-gray">
                Undertøy, silke og andre ømtålige materialer
              </p>
            </div>

            <div className="text-center p-6">
              <div className="text-4xl mb-4">🧥</div>
              <h4 className="font-semibold text-dark-gray mb-2">Yttertøy</h4>
              <p className="text-sm text-medium-gray">
                Jakker, kåper og annet yttertøy
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start">
              <div className="text-blue-500 mr-3 mt-0.5">💡</div>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">Tips for best resultat</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Sjekk lommene for verdisaker</li>
                  <li>• Sorter plagg etter farge hvis du ønsker det</li>
                  <li>• Legg delikate plagg øverst i posen</li>
                  <li>• Ikke overfyll posen</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Summary and Continue */}
        <div className="bg-white rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-right mb-4">
              <p className="text-sm text-medium-gray">Inkludert i ditt abonnement</p>
              <p className="text-2xl font-bold text-success-green">✓ Gratis henting og levering</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <Link
              href="/dashboard"
              className="text-medium-gray hover:text-dark-gray"
            >
              ← Tilbake til dashbord
            </Link>

            <button
              onClick={handleContinue}
              className="bg-nordic-blue text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg"
            >
              Velg hentingstid
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}