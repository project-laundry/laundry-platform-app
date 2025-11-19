import Link from 'next/link';
import { NewOrderButton } from './NewOrderButton';

interface PageProps {
  searchParams: Promise<{ subscriptionId?: string }>;
}

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const subscriptionId = params.subscriptionId || '';

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
            Abonnement opprettet!
          </h1>
          <p className="text-xl text-medium-gray mb-8">
            Ditt abonnement venter på betaling. Bruk instruksjonene under for å teste betalingsflyten.
          </p>

          {/* Subscription ID Card */}
          <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-nordic-blue/10 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-nordic-blue">Abonnement-ID</h2>
                <p className="text-sm font-mono text-dark-gray break-all">{subscriptionId}</p>
              </div>
            </div>

            {/* Testing Instructions */}
            <div className="text-left bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-dark-gray mb-4">Testing: Simuler betaling</h3>
              <p className="text-sm text-medium-gray mb-4">
                For å simulere en vellykket betaling, send en POST-forespørsel til webhook-endepunktet:
              </p>

              <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-4 overflow-x-auto">
                <pre className="text-xs">
{`POST /api/webhooks/payment
Content-Type: application/json

{
  "subscriptionId": "${subscriptionId}"
}`}
                </pre>
              </div>

              <p className="text-sm text-medium-gray mb-2">
                <strong>Eksempel med cURL:</strong>
              </p>
              <div className="bg-gray-900 text-green-400 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs">
{`curl -X POST http://localhost:3000/api/webhooks/payment \\
  -H "Content-Type: application/json" \\
  -d '{"subscriptionId": "${subscriptionId}"}'`}
                </pre>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-white rounded-2xl p-8 mb-8 text-left">
            <h3 className="font-semibold text-dark-gray mb-4">Hva skjer når betalingen lykkes?</h3>
            <ul className="space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
                Abonnementet aktiveres
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                System finner en tilgjengelig renser
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
                Ordre genereres for faktureringsperioden
              </li>
              <li className="flex items-start">
                <span className="text-nordic-blue mr-2 mt-0.5">4.</span>
                Poselevering opprettes hvis du ikke har pose
              </li>
            </ul>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 mt-0.5">💡</div>
              <div className="text-left">
                <h3 className="font-semibold text-yellow-800 mb-2">Status: Venter på betaling</h3>
                <p className="text-sm text-yellow-700">
                  Abonnementet er opprettet med status &quot;pending_payment&quot;.
                  Ingen ordre blir generert før betalingen er bekreftet via webhook.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link
              href="/admin/orders"
              className="bg-nordic-blue text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Admin: Se ordre
            </Link>
            <NewOrderButton />
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
