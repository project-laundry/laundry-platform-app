import Link from 'next/link';
import { getOrderById } from '@/lib/database/orders';

interface SuccessPageProps {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    orderNumber?: string;
    subscriptionCancelled?: string;
    nextOrderId?: string;
  }>;
}

export default async function CancelSuccessPage({ searchParams }: SuccessPageProps) {
  const { orderNumber, subscriptionCancelled, nextOrderId } = await searchParams;

  const isSubscriptionCancelled = subscriptionCancelled === 'true';

  // Fetch next order details if available
  let nextOrder = null;
  if (nextOrderId) {
    nextOrder = await getOrderById(nextOrderId);
  }

  // Format next order pickup date if available
  const nextPickupDate = nextOrder
    ? new Date(nextOrder.scheduled_date).toLocaleDateString('no-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : null;

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
            {isSubscriptionCancelled
              ? 'Abonnementet er kansellert'
              : 'Bestillingen er kansellert'}
          </h1>
          <p className="text-xl text-medium-gray mb-8">
            {isSubscriptionCancelled
              ? 'Ditt abonnement er nå stoppet. Du vil ikke motta flere hentinger.'
              : `Bestilling #${orderNumber} er nå kansellert.`}
          </p>

          {/* Next Order Card (only if order was cancelled, not subscription) */}
          {!isSubscriptionCancelled && nextOrder && (
            <div className="bg-white rounded-2xl p-8 mb-8 text-left">
              <div className="flex items-start mb-4">
                <div className="w-10 h-10 bg-nordic-blue/10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-5 h-5 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-dark-gray mb-1">Ny bestilling opprettet</h3>
                  <p className="text-sm text-medium-gray">
                    En ny bestilling er automatisk opprettet for din neste henting.
                  </p>
                </div>
              </div>

              <div className="bg-soft-gray rounded-xl p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-medium-gray">Bestillingsnummer</span>
                    <span className="font-medium text-dark-gray">#{nextOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-medium-gray">Hentedato</span>
                    <span className="font-medium text-dark-gray capitalize">{nextPickupDate}</span>
                  </div>
                </div>
                <Link
                  href={`/orders/details/${nextOrderId}`}
                  className="block mt-4 text-center text-nordic-blue font-medium hover:underline"
                >
                  Se bestilling
                </Link>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-white rounded-2xl p-8 mb-8 text-left">
            <h3 className="font-semibold text-dark-gray mb-4">Hva skjer nå?</h3>
            <ul className="space-y-2 text-sm text-medium-gray">
              {isSubscriptionCancelled ? (
                <>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
                    Vipps-avtalen din er stoppet og du vil ikke bli belastet i fremtiden.
                  </li>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                    Du kan opprette et nytt abonnement når som helst fra dashbordet.
                  </li>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
                    Takk for at du brukte NooraCare!
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">1.</span>
                    Den kansellerte bestillingen vil ikke bli hentet.
                  </li>
                  {nextOrder ? (
                    <li className="flex items-start">
                      <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                      Neste henting er planlagt til {nextPickupDate}.
                    </li>
                  ) : (
                    <li className="flex items-start">
                      <span className="text-nordic-blue mr-2 mt-0.5">2.</span>
                      Abonnementet ditt fortsetter som normalt.
                    </li>
                  )}
                  <li className="flex items-start">
                    <span className="text-nordic-blue mr-2 mt-0.5">3.</span>
                    Du kan se og administrere bestillinger fra dashbordet.
                  </li>
                </>
              )}
            </ul>
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
