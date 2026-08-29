import { redirect, notFound } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { CalendarDays, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { getAvailableWeekdaysForCity } from '@/lib/database/cleaners';
import { RescheduleForm } from './RescheduleForm';

interface ReschedulePageProps {
  params: Promise<{ orderId: string }>;
}

export default async function RescheduleOrderPage({ params }: ReschedulePageProps) {
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

  // Only allow rescheduling for editable statuses
  const editableStatuses = ['pending_assignment', 'pickup_scheduled'];
  if (!editableStatuses.includes(order.status)) {
    redirect(`/orders/details/${orderId}`);
  }

  // Get available weekdays for the order's city
  const availableWeekdays = await getAvailableWeekdaysForCity(order.city);

  // Format current dates
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('no-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

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
          {/* Page Header */}
          <div className="text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
              <CalendarDays className="size-8" />
            </span>
            <h2 className="mt-6 font-serif text-3xl font-semibold leading-tight text-dark-gray">
              Endre hentedato
            </h2>
            <p className="mt-3 text-medium-gray">Velg en ny dato for henting</p>
          </div>

          {/* Current Dates */}
          <div className="mt-8 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">
              Nåværende datoer
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Henting
                </p>
                <p className="mt-1 font-medium capitalize text-dark-gray">
                  {formatDate(order.scheduled_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Levering
                </p>
                <p className="mt-1 font-medium capitalize text-dark-gray">
                  {formatDate(order.delivery_date)}
                </p>
              </div>
            </div>
          </div>

          {/* Reschedule Form with Calendar */}
          <div className="mt-6">
            <RescheduleForm
              orderId={orderId}
              currentPickupDate={order.scheduled_date}
              availableWeekdays={availableWeekdays}
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

          {/* Footer Tagline */}
          <div className="mt-12 text-center">
            <p className="text-sm text-medium-gray">Renhet. Omtanke. NooraCare.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
