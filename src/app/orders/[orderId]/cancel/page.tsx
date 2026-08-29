import { redirect, notFound } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { ChevronLeft, TriangleAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { CancelConfirmationForm } from './CancelConfirmationForm';

interface CancelPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CancelOrderPage({ params }: CancelPageProps) {
  const { orderId } = await params;

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

  // Get order with details
  const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
  if (!order) {
    notFound();
  }

  // Only allow cancellation for certain statuses
  const cancellableStatuses = ['pending_assignment', 'pickup_scheduled'];
  if (!cancellableStatuses.includes(order.status)) {
    redirect(`/orders/details/${orderId}`);
  }

  // Format pickup date
  const pickupDate = new Date(order.scheduled_date).toLocaleDateString('no-NO', {
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
      <AppHeader
        right={
          <span className="text-sm tabular-nums text-medium-gray">
            Bestilling #{order.order_number}
          </span>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-10">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          {/* Warning Icon */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <TriangleAlert className="size-8" />
            </span>
            <h1 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Kanseller bestilling
            </h1>
            <p className="mt-3 text-medium-gray">
              Du er i ferd med å kansellere bestilling #{order.order_number}
            </p>
          </div>

          {/* Order Summary */}
          <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">
              Bestillingsdetaljer
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Bestillingsnummer</span>
                <span className="font-medium tabular-nums text-dark-gray">
                  #{order.order_number}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Hentedato</span>
                <span className="font-medium capitalize text-dark-gray">{pickupDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-medium-gray">Adresse</span>
                <span className="text-right font-medium text-dark-gray">
                  {order.street}, {order.postal_code} {order.city}
                </span>
              </div>
            </div>
          </div>

          {/* Cancellation Options */}
          <div className="mt-6">
            <CancelConfirmationForm
              orderId={orderId}
              orderNumber={order.order_number}
              hasSubscription={!!order.subscription_id}
            />
          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <Link
              href={`/orders/details/${orderId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
            >
              <ChevronLeft className="size-4" />
              Tilbake til bestilling
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
