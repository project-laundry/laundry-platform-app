import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { CalendarDays, Check, ChevronLeft } from 'lucide-react';
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
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Success Icon */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
              <Check className="size-8" />
            </span>

            {/* Success Message */}
            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              {isSubscriptionCancelled
                ? 'Abonnementet er kansellert'
                : 'Bestillingen er kansellert'}
            </h1>
            <p className="mt-3 text-medium-gray">
              {isSubscriptionCancelled
                ? 'Ditt abonnement er nå stoppet. Du vil ikke motta flere hentinger.'
                : `Bestilling #${orderNumber} er nå kansellert.`}
            </p>
          </div>

          {/* Next Order Card (only if order was cancelled, not subscription) */}
          {!isSubscriptionCancelled && nextOrder && (
            <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 text-left shadow-[var(--shadow-card)] backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-dark-gray">
                    Ny bestilling opprettet
                  </h3>
                  <p className="mt-1 text-sm text-medium-gray">
                    En ny bestilling er automatisk opprettet for din neste henting.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-cream/70 p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-medium-gray">Bestillingsnummer</span>
                    <span className="font-medium tabular-nums text-dark-gray">
                      #{nextOrder.order_number}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-medium-gray">Hentedato</span>
                    <span className="font-medium capitalize text-dark-gray">{nextPickupDate}</span>
                  </div>
                </div>
                <Link
                  href={`/orders/details/${nextOrderId}`}
                  className="mt-4 block text-center font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  Se bestilling
                </Link>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 text-left shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">Hva skjer nå?</h3>
            <ul className="mt-4 space-y-2 text-sm text-medium-gray">
              {isSubscriptionCancelled ? (
                <>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">1.</span>
                    Vipps-avtalen din er stoppet og du vil ikke bli belastet i fremtiden.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                    Du kan opprette et nytt abonnement når som helst fra dashbordet.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">3.</span>
                    Takk for at du brukte NooraCare!
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">1.</span>
                    Den kansellerte bestillingen vil ikke bli hentet.
                  </li>
                  {nextOrder ? (
                    <li className="flex items-start">
                      <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                      Neste henting er planlagt til {nextPickupDate}.
                    </li>
                  ) : (
                    <li className="flex items-start">
                      <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                      Abonnementet ditt fortsetter som normalt.
                    </li>
                  )}
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">3.</span>
                    Du kan se og administrere bestillinger fra dashbordet.
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Back to Dashboard */}
          <div className="mt-8 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <ChevronLeft className="size-4" />
              Tilbake til dashbord
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
