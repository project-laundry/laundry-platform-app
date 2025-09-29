'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewOrderPage() {
  const [hasBag, setHasBag] = useState<boolean | null>(null);

  const handleContinue = () => {
    // Proceed to plan selection regardless of bag status
    window.location.href = '/auth/plans';
  };

  const handleRequestBag = () => {
    // Proceed to plan selection - they'll receive bag after payment
    window.location.href = '/auth/plans';
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
        {/* Bag Verification Question */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🛍️</div>
            <h2 className="text-3xl font-bold text-dark-gray mb-4">Har du en NooraCare-pose?</h2>
            <p className="text-lg text-medium-gray">
              For å bestille vask trenger du en NooraCare-pose å legge klærne i.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setHasBag(false)}
              className={`p-6 rounded-xl border-2 transition-all ${
                hasBag === false
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-dark-gray mb-2">Nei, send meg en pose først</h3>
              <p className="text-sm text-medium-gray">
                Vi sender deg en gratis NooraCare-pose
              </p>
            </button>

            <button
              onClick={() => setHasBag(true)}
              className={`p-6 rounded-xl border-2 transition-all ${
                hasBag === true
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-semibold text-dark-gray mb-2">Ja, jeg har allerede en</h3>
              <p className="text-sm text-medium-gray">
                Fortsett til bestilling
              </p>
            </button>
          </div>
        </div>

        {/* Show continue button if user has a bag */}
        {hasBag === true && (
          <div className="bg-white rounded-2xl p-8">
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
                Velg abonnement
              </button>
            </div>
          </div>
        )}

        {/* Show bag request confirmation if user doesn't have a bag */}
        {hasBag === false && (
          <div className="bg-white rounded-2xl p-8">
            <div className="text-center mb-6">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-2xl font-bold text-dark-gray mb-3">Perfekt! Vi ordner det.</h3>
              <p className="text-medium-gray mb-6">
                Du får en gratis NooraCare-pose tilsendt sammen med første vask.<br />
                Velg abonnement og planlegg henting – posen kommer i god tid før første henting.
              </p>
            </div>

            <div className="flex justify-between items-center">
              <Link
                href="/dashboard"
                className="text-medium-gray hover:text-dark-gray"
              >
                ← Tilbake til dashbord
              </Link>

              <button
                onClick={handleRequestBag}
                className="bg-nordic-blue text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors text-lg"
              >
                Velg abonnement
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}