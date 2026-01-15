import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-light text-slate-900">NooraCare</h1>
            </Link>
            <span className="text-slate-500">Bestilling #{order.order_number}</span>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-light text-slate-900 mb-2">Endre hentedato</h2>
          <p className="text-slate-500">Velg en ny dato for henting</p>
        </div>

        {/* Current Dates */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Nåværende datoer</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Henting</p>
              <p className="font-medium text-slate-900 capitalize">{formatDate(order.scheduled_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Levering</p>
              <p className="font-medium text-slate-900 capitalize">{formatDate(order.delivery_date)}</p>
            </div>
          </div>
        </div>

        {/* Reschedule Form with Calendar */}
        <RescheduleForm
          orderId={orderId}
          currentPickupDate={order.scheduled_date}
          availableWeekdays={availableWeekdays}
        />

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link
            href={`/orders/details/${orderId}`}
            className="inline-flex items-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tilbake til bestilling
          </Link>
        </div>

        {/* Footer Tagline */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-400">Renhet. Omtanke. NooraCare.</p>
        </div>
      </div>
    </div>
  );
}
