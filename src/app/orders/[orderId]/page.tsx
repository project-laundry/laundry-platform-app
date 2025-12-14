import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { oreToNok } from '@/lib/config/pricing';
import type { OrderStatus } from '@/types/database';

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

// Define status steps for timeline
const STATUS_TIMELINE: { status: OrderStatus; label: string }[] = [
  { status: 'pending_assignment', label: 'Bestilling mottatt' },
  { status: 'pickup_scheduled', label: 'Renser tildelt' },
  { status: 'picked_up', label: 'Hentet' },
  { status: 'in_cleaning', label: 'Under vask' },
  { status: 'ready_for_delivery', label: 'Klar for levering' },
  { status: 'out_for_delivery', label: 'Leveres' },
  { status: 'completed', label: 'Fullført' },
];

function getStatusStep(currentStatus: OrderStatus): number {
  const index = STATUS_TIMELINE.findIndex(s => s.status === currentStatus);
  return index >= 0 ? index : -1;
}

function getStepState(stepIndex: number, currentStepIndex: number, orderStatus: OrderStatus): 'completed' | 'current' | 'upcoming' {
  if (orderStatus === 'cancelled') return 'upcoming';
  if (stepIndex < currentStepIndex) return 'completed';
  if (stepIndex === currentStepIndex) return 'current';
  return 'upcoming';
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
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

  const currentStepIndex = getStatusStep(order.status);

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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold text-dark-gray">Bestilling #{order.order_number}</h2>
            <Badge variant={getOrderStatusVariant(order.status)} className="text-sm">
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
          <p className="text-medium-gray">
            {order.plan?.name || 'Klesvask'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Status Timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                {order.status === 'cancelled' ? (
                  <div className="text-center py-8">
                    <p className="text-lg font-semibold text-red-600 mb-2">Bestilling kansellert</p>
                    {order.cancellation_reason && (
                      <p className="text-sm text-medium-gray">{order.cancellation_reason}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {STATUS_TIMELINE.map((step, index) => {
                      const state = getStepState(index, currentStepIndex, order.status);
                      return (
                        <div key={step.status} className="flex items-start">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                            state === 'completed' ? 'bg-success-green text-white' :
                            state === 'current' ? 'bg-nordic-blue text-white' :
                            'bg-gray-200 text-gray-500'
                          }`}>
                            {state === 'completed' ? '✓' : index + 1}
                          </div>

                          {/* Content */}
                          <div className="ml-4 flex-1">
                            <h4 className={`font-semibold ${
                              state === 'completed' ? 'text-success-green' :
                              state === 'current' ? 'text-nordic-blue' :
                              'text-gray-500'
                            }`}>
                              {step.label}
                            </h4>

                            {/* Show timestamp if available */}
                            {state === 'completed' && (
                              <p className="text-sm text-medium-gray mt-1">
                                {step.status === 'picked_up' && order.picked_up_at &&
                                  new Date(order.picked_up_at).toLocaleString('no-NO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                {step.status === 'in_cleaning' && order.in_cleaning_at &&
                                  new Date(order.in_cleaning_at).toLocaleString('no-NO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                {step.status === 'ready_for_delivery' && order.ready_for_delivery_at &&
                                  new Date(order.ready_for_delivery_at).toLocaleString('no-NO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                {step.status === 'out_for_delivery' && order.out_for_delivery_at &&
                                  new Date(order.out_for_delivery_at).toLocaleString('no-NO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                {step.status === 'completed' && order.completed_at &&
                                  new Date(order.completed_at).toLocaleString('no-NO', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Details Sidebar */}
          <div className="space-y-6">
            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Datoer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-medium-gray mb-1">Henting</p>
                  <p className="font-semibold text-dark-gray">
                    {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-medium-gray mb-1">Levering</p>
                  <p className="font-semibold text-dark-gray">
                    {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cleaner Info */}
            {order.cleaner?.user && (
              <Card>
                <CardHeader>
                  <CardTitle>Din renser</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-dark-gray mb-1">{order.cleaner.display_name}</p>
                  <p className="text-sm text-medium-gray">{order.cleaner.user.phone}</p>
                </CardContent>
              </Card>
            )}

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Kostnad</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-medium-gray">Grunnpris</span>
                    <span className="font-medium text-dark-gray">
                      {oreToNok(order.plan?.price_ore || 0)} kr
                    </span>
                  </div>
                  {order.extra_kg > 0 && (
                    <div className="flex justify-between">
                      <span className="text-medium-gray">Ekstra kg ({order.extra_kg})</span>
                      <span className="font-medium text-dark-gray">
                        {oreToNok(order.extra_kg * 1000)} kr
                      </span>
                    </div>
                  )}
                  {order.needs_ironing && (
                    <div className="flex justify-between">
                      <span className="text-medium-gray">Stryking</span>
                      <span className="font-medium text-dark-gray">40 kr</span>
                    </div>
                  )}
                  {order.delicate_items_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-medium-gray">Delikate plagg ({order.delicate_items_count})</span>
                      <span className="font-medium text-dark-gray">
                        {oreToNok(order.delicate_items_count * 7500)} kr
                      </span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-semibold">
                    <span className="text-dark-gray">Totalt</span>
                    <span className="text-dark-gray">{oreToNok(order.total_cost_ore)} kr</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {order.special_instructions && (
              <Card>
                <CardHeader>
                  <CardTitle>Spesielle instruksjoner</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-dark-gray">{order.special_instructions}</p>
                </CardContent>
              </Card>
            )}

            {/* Pickup Details */}
            <Card>
              <CardHeader>
                <CardTitle>Hentested</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <p className="text-medium-gray mb-1">Adresse</p>
                  <p className="text-dark-gray">
                    {order.pickup_street}<br />
                    {order.pickup_postal_code} {order.pickup_city}
                  </p>
                </div>
                <div>
                  <p className="text-medium-gray mb-1">Hentemetode</p>
                  <p className="text-dark-gray capitalize">{order.pickup_method}</p>
                </div>
                {order.pickup_location_description && (
                  <div>
                    <p className="text-medium-gray mb-1">Beskrivelse</p>
                    <p className="text-dark-gray">{order.pickup_location_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
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
