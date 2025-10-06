'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function NewOrderPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'single';
  const [hasBag, setHasBag] = useState<boolean | null>(null);

  const handleContinue = () => {
    // Pass hasBag=true to schedule page
    window.location.href = `/orders/schedule?plan=${plan}&hasBag=true`;
  };

  const handleRequestBag = () => {
    // Pass hasBag=false to schedule page - they'll receive bag before pickup
    window.location.href = `/orders/schedule?plan=${plan}&hasBag=false`;
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

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="p-8 rounded-xl border-2 border-gray-200 bg-white flex flex-col">
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-dark-gray mb-2 text-lg">Nei, send meg en pose først</h3>
              <p className="text-sm text-medium-gray mb-6 flex-grow">
                Vi sender deg en gratis NooraCare-pose
              </p>
              <button
                onClick={handleRequestBag}
                className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-white text-nordic-blue border-2 border-nordic-blue hover:bg-nordic-blue hover:text-white cursor-pointer"
              >
                Bestill pose
              </button>
            </div>

            <div className="p-8 rounded-xl border-2 border-gray-200 bg-white flex flex-col">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-semibold text-dark-gray mb-2 text-lg">Ja, jeg har allerede en</h3>
              <p className="text-sm text-medium-gray mb-6 flex-grow">
                Fortsett til bestilling
              </p>
              <button
                onClick={handleContinue}
                className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-white text-nordic-blue border-2 border-nordic-blue hover:bg-nordic-blue hover:text-white cursor-pointer"
              >
                Fortsett
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Tilbake til dashbord
          </Link>
        </div>
      </div>
    </div>
  );
}