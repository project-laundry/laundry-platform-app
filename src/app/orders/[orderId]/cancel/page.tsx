import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
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
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Bestilling #{order.order_number}</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Warning Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-dark-gray mb-2">Kanseller bestilling</h1>
          <p className="text-medium-gray">
            Du er i ferd med å kansellere bestilling #{order.order_number}
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-dark-gray mb-4">Bestillingsdetaljer</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-medium-gray">Bestillingsnummer</span>
              <span className="font-medium text-dark-gray">#{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-medium-gray">Hentedato</span>
              <span className="font-medium text-dark-gray capitalize">{pickupDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-medium-gray">Adresse</span>
              <span className="font-medium text-dark-gray text-right">
                {order.street}, {order.postal_code} {order.city}
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Options */}
        <CancelConfirmationForm
          orderId={orderId}
          orderNumber={order.order_number}
          hasSubscription={!!order.subscription_id}
        />

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            href={`/orders/details/${orderId}`}
            className="inline-flex items-center text-medium-gray hover:text-dark-gray transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tilbake til bestilling
          </Link>
        </div>
      </div>
    </div>
  );
}
