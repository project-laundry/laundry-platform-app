'use client';

import Link from 'next/link';

export default function SuccessPage() {
  const handleContinue = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-dark-gray mb-4">
            Velkommen til NooraCare!
          </h1>
          <p className="text-medium-gray mb-8 leading-relaxed">
            Kontoen din er opprettet og betalingen er behandlet. Vi sender deg en merkevarepose i løpet av 3-5 virkedager.
          </p>

          {/* Next Steps */}
          <div className="text-left bg-soft-gray rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-dark-gray mb-3">Hva skjer nå?</h3>
            <ul className="space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">1.</span>
                Du mottar en NooraCare-pose på døren din
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">2.</span>
                Aktiver kontoen din når posen er levert
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">3.</span>
                Bestill din første henting via appen
              </li>
            </ul>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors mb-4"
          >
            Gå til dashbord
          </button>

          {/* Customer Support */}
          <p className="text-sm text-medium-gray">
            Spørsmål? <Link href="#" className="text-nordic-blue hover:underline">Kontakt kundeservice</Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-medium-gray hover:text-dark-gray">
            ← Tilbake til hjemmesiden
          </Link>
        </div>
      </div>
    </div>
  );
}