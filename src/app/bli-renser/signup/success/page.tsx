import Link from 'next/link';

export default function CleanerEmailVerificationPage() {
  return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-dark-gray mb-4">
            Sjekk e-posten din!
          </h1>
          <p className="text-medium-gray mb-8 leading-relaxed">
            Vi har sendt en bekreftelseslenke til e-postadressen din. Klikk på lenken for å aktivere renserkontoen din.
          </p>

          {/* Next Steps */}
          <div className="text-left bg-soft-gray rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-dark-gray mb-3">Hva skjer nå?</h3>
            <ul className="space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">1.</span>
                Åpne e-posten fra NooraCare
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">2.</span>
                Klikk på bekreftelseslenken
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">3.</span>
                Fullfør renserprofilen din
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2">4.</span>
                Start å motta oppdrag!
              </li>
            </ul>
          </div>

          {/* Login Button */}
          <Link
            href="/auth/login"
            className="block w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg transition-colors mb-4 text-center"
          >
            Gå til innlogging
          </Link>

          {/* Support */}
          <p className="text-sm text-medium-gray">
            Ikke mottatt e-post? Sjekk spam-mappen eller{' '}
            <Link href="/bli-renser/signup" className="text-nordic-blue hover:underline">
              prøv igjen
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/bli-renser" className="text-medium-gray hover:text-dark-gray">
            ← Tilbake til bli renser
          </Link>
        </div>
      </div>
    </div>
  );
}
