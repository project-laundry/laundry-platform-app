import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { ChevronLeft, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { getOrderStatusStep } from '@/lib/utils/order-status';
import { CancelSubscriptionForm } from './CancelSubscriptionForm';

export default async function CancelSubscriptionPage() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get customer
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    redirect('/auth/signup');
  }

  const subscription = await getActiveSubscriptionByCustomerId(customer.id);
  if (!subscription) {
    redirect('/dashboard');
  }

  const activeOrders = await getActiveOrdersBySubscriptionId(subscription.id);
  const prePickup = activeOrders.filter(
    (order) => getOrderStatusStep(order.status) < getOrderStatusStep('picked_up')
  );
  const hasInFlightOrder = activeOrders.length > prePickup.length;

  const formatPickupDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

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
          {/* Warning Icon */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <TriangleAlert className="size-8" />
            </span>
            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Kanseller abonnement
            </h1>
            <p className="mt-3 text-medium-gray">
              Du er i ferd med å kansellere abonnementet ditt
            </p>
          </div>

          {/* Summary */}
          <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">
              Dette skjer når du kansellerer
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-medium-gray">
              {prePickup.length > 0 && (
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">1.</span>
                  {prePickup.length === 1
                    ? `Din planlagte henting ${formatPickupDate(prePickup[0].scheduled_date)} blir kansellert.`
                    : `${prePickup.length} planlagte hentinger blir kansellert.`}
                </li>
              )}
              {hasInFlightOrder ? (
                <>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                    Du har en pågående bestilling. Den fullføres og belastes som normalt, og blir din siste bestilling.
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">3.</span>
                    Vipps-avtalen avsluttes automatisk når den siste bestillingen er betalt.
                  </li>
                </>
              ) : (
                <li className="flex items-start">
                  <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">2.</span>
                  Vipps-avtalen din avsluttes, og du vil ikke bli belastet i fremtiden.
                </li>
              )}
              <li className="flex items-start">
                <span className="mr-2 mt-0.5 font-medium tabular-nums text-nordic-blue">
                  {hasInFlightOrder ? '4.' : '3.'}
                </span>
                Du kan opprette et nytt abonnement når som helst.
              </li>
            </ul>
          </div>

          {/* Warning strip */}
          <div className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>Dette kan ikke angres. Abonnementet stoppes umiddelbart.</p>
          </div>

          {/* Confirmation form */}
          <div className="mt-6">
            <CancelSubscriptionForm subscriptionId={subscription.id} />
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <Link
              href="/dashboard/subscription"
              className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <ChevronLeft className="size-4" />
              Tilbake til abonnement
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
