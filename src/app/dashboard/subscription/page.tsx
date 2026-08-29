import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { ChevronLeft, Repeat, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { getOrderStatusStep } from '@/lib/utils/order-status';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  getSubscriptionFrequencyLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from '@/lib/utils/subscription-status';

export default async function SubscriptionPage() {
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

  // Get subscription — filters to pending_payment/active, so cancelled/expired
  // customers are redirected for free.
  const subscription = await getActiveSubscriptionByCustomerId(customer.id);
  if (!subscription) {
    redirect('/dashboard');
  }

  const activeOrders = await getActiveOrdersBySubscriptionId(subscription.id);
  const nextPickup =
    activeOrders.find((order) => getOrderStatusStep(order.status) < getOrderStatusStep('picked_up')) ?? null;

  const startedLabel = subscription.started_at
    ? new Date(subscription.started_at).toLocaleDateString('no-NO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const address = subscription.order_defaults?.initial_address;

  const nextPickupLabel = nextPickup
    ? new Date(nextPickup.scheduled_date).toLocaleDateString('no-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : 'Ingen planlagt';

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
          {/* Hero */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
              <Repeat className="size-8" />
            </span>
            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Mitt abonnement
            </h1>
            <p className="mt-3 text-medium-gray">
              {getSubscriptionFrequencyLabel(subscription.frequency)} henting av tøyet ditt
            </p>
          </div>

          {/* Details */}
          <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">
              Abonnementsdetaljer
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Frekvens</span>
                <span className="font-medium text-dark-gray">
                  {getSubscriptionFrequencyLabel(subscription.frequency)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Status</span>
                <StatusBadge variant={getSubscriptionStatusVariant(subscription.status)}>
                  {getSubscriptionStatusLabel(subscription.status)}
                </StatusBadge>
              </div>
              {startedLabel && (
                <div className="flex justify-between gap-4">
                  <span className="text-medium-gray">Startet</span>
                  <span className="font-medium text-dark-gray">{startedLabel}</span>
                </div>
              )}
              {address && (
                <div className="flex justify-between gap-4">
                  <span className="text-medium-gray">Adresse</span>
                  <span className="text-right font-medium text-dark-gray">
                    {address.street}, {address.postal_code} {address.city}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Neste henting</span>
                <span className="font-medium capitalize text-dark-gray">{nextPickupLabel}</span>
              </div>
            </div>
          </div>

          {/* Cancel link */}
          <div className="mt-8 text-center">
            <Link
              href="/dashboard/subscription/cancel"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 underline-offset-2 transition-colors hover:underline"
            >
              <XCircle className="size-4" />
              Kanseller abonnement
            </Link>
          </div>

          {/* Back Link */}
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
