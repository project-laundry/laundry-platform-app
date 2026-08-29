import { redirect, notFound } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { oreToNok } from '@/lib/config/pricing';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RescheduleButton } from '@/components/orders/RescheduleButton';
import { EditableSpecialInstructions } from '@/components/orders/EditableSpecialInstructions';
import { EditableIroning } from '@/components/orders/EditableIroning';
import { EditableAddress } from '@/components/orders/EditableAddress';
import type { OrderStatus } from '@/types/database';
import {
  Truck,
  User,
  Check,
  Circle,
  Clock,
  Shirt,
  Package,
  AlertCircle,
} from 'lucide-react';

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

// Status timeline configuration
const STATUS_TIMELINE: { status: OrderStatus; label: string; description: string }[] = [
  { status: 'pending_assignment', label: 'Mottatt', description: 'Vi har mottatt din bestilling' },
  { status: 'pickup_scheduled', label: 'Planlagt', description: 'Renser tildelt' },
  { status: 'picked_up', label: 'Hentet', description: 'Hos renser' },
  { status: 'in_cleaning', label: 'Vaskes', description: 'Under behandling' },
  { status: 'ready_for_delivery', label: 'Klar', description: 'Klar for levering' },
  { status: 'out_for_delivery', label: 'Underveis', description: 'På vei til deg' },
  { status: 'completed', label: 'Levert', description: 'Fullført' },
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

function formatDate(dateString: string, includeWeekday: boolean = true): string {
  const options: Intl.DateTimeFormatOptions = includeWeekday
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { day: 'numeric', month: 'short' };
  return new Date(dateString).toLocaleDateString('no-NO', options);
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('no-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    redirect('/auth/signup');
  }

  const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
  if (!order) {
    notFound();
  }

  const currentStepIndex = getStatusStep(order.status);
  const isEditable = order.status === 'pending_assignment' || order.status === 'pickup_scheduled';
  const isCancelled = order.status === 'cancelled';
  const isCompleted = order.status === 'completed';

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

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <div className="mb-4">
          <BackLink href="/dashboard" />
        </div>

        {/* Hero Section */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
                Bestilling
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight tabular-nums text-dark-gray sm:text-5xl">
                #{order.order_number}
              </h1>
              <div className="mt-3 flex items-center gap-2 text-medium-gray">
                <Shirt className="size-4" />
                <span className="text-sm">Klesvask</span>
              </div>
            </div>

            {/* Status Badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isCancelled ? 'bg-red-50 text-red-700' : 'bg-sea-green/10 text-sea-green'
              }`}
            >
              {isCancelled ? 'Kansellert' : isCompleted ? 'Fullført' : STATUS_TIMELINE[currentStepIndex]?.label || 'Behandles'}
            </span>
          </div>
        </div>

        {/* Timeline */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '60ms' }}
        >
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6">
            <h2 className="font-serif text-lg font-semibold text-dark-gray">
              {isCancelled ? 'Bestillingsstatus' : 'Din bestillings reise'}
            </h2>

            {isCancelled ? (
              <div className="py-8 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertCircle className="size-7" />
                </span>
                <h3 className="mt-4 font-serif text-xl font-semibold text-dark-gray">
                  Bestilling kansellert
                </h3>
                {order.cancellation_reason && (
                  <p className="mx-auto mt-2 max-w-sm text-medium-gray">{order.cancellation_reason}</p>
                )}
                {order.cancelled_at && (
                  <p className="mt-4 text-sm text-medium-gray">
                    Kansellert {formatDateTime(order.cancelled_at)}
                  </p>
                )}
              </div>
            ) : (
              <div className="relative mt-6">
                {/* Timeline Track */}
                <div className="absolute bottom-0 left-[17px] top-0 w-px bg-cream-dark" />

                <div>
                  {STATUS_TIMELINE.map((step, index) => {
                    const state = getStepState(index, currentStepIndex, order.status);
                    const timestamp = getTimestampForStep(step.status, order);

                    return (
                      <div
                        key={step.status}
                        className={`relative flex items-start gap-4 pb-7 last:pb-0 ${
                          state === 'upcoming' ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Icon */}
                        <span
                          className={`relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full ${
                            state === 'completed'
                              ? 'bg-sea-green/15 text-sea-green'
                              : state === 'current'
                              ? 'bg-sea-green text-white shadow-soft'
                              : 'border border-cream-dark bg-white text-medium-gray'
                          }`}
                        >
                          {state === 'completed' ? (
                            <Check className="size-4" />
                          ) : state === 'current' ? (
                            <Circle className="size-3 fill-white" />
                          ) : (
                            <span className="text-sm font-medium tabular-nums">{index + 1}</span>
                          )}
                        </span>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <h4
                            className={`font-medium ${
                              state === 'current'
                                ? 'text-sea-green'
                                : state === 'completed'
                                ? 'text-dark-gray'
                                : 'text-medium-gray'
                            }`}
                          >
                            {step.label}
                          </h4>
                          <p className="mt-0.5 text-sm text-medium-gray">{step.description}</p>
                          {timestamp && state === 'completed' && (
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs tabular-nums text-sea-green">
                              <Clock className="size-3" />
                              {formatDateTime(timestamp)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Dates Card */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '120ms' }}
        >
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">Datoer</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Package className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">Henting</p>
                  <p className="mt-1 font-medium capitalize text-dark-gray">
                    {formatDate(order.scheduled_date)}
                  </p>
                </div>
              </div>
              <div className="border-t border-cream-dark/60" />
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Truck className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">Levering</p>
                  <p className="mt-1 font-medium capitalize text-dark-gray">
                    {formatDate(order.delivery_date)}
                  </p>
                </div>
              </div>
            </div>

            {/* Reschedule Button */}
            {isEditable && (
              <div className="mt-4 border-t border-cream-dark/60 pt-4">
                <RescheduleButton orderId={order.id} orderStatus={order.status} />
              </div>
            )}
          </div>
        </section>

        {/* Cleaner Card */}
        {order.cleaner && (
          <section
            className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
            style={{ animationDelay: '180ms' }}
          >
            <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
              <h3 className="font-serif text-lg font-semibold text-dark-gray">Din renser</h3>
              <div className="mt-4 flex items-center gap-4">
                <span className="flex size-12 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <User className="size-6" />
                </span>
                <div>
                  <p className="font-semibold text-dark-gray">{order.cleaner.display_name}</p>
                  <p className="text-sm text-medium-gray">Profesjonell renser</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Cost Card */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '240ms' }}
        >
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">Tjeneste og kostnad</h3>
            <div className="mt-4 space-y-4">
              <EditableIroning
                orderId={order.id}
                initialNeedsIroning={order.needs_ironing}
                isEditable={isEditable}
              />

              {order.total_cost_ore !== null ? (
                <div className="border-t border-cream-dark/60 pt-4">
                  {order.promo?.discount_ore ? (
                    <div className="mb-3 space-y-1.5">
                      <div className="flex items-center justify-between text-sm text-medium-gray">
                        <span>Pris</span>
                        <span className="tabular-nums line-through">
                          {oreToNok(order.total_cost_ore + order.promo.discount_ore)} kr
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-sea-green">
                        <span>Rabatt ({order.promo.code})</span>
                        <span className="tabular-nums">−{oreToNok(order.promo.discount_ore)} kr</span>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <span className="text-medium-gray">Totalt</span>
                    <span className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">
                      {oreToNok(order.total_cost_ore)} kr
                    </span>
                  </div>
                  {order.pricing_notes && (
                    <p className="mt-2 text-xs text-medium-gray">{order.pricing_notes}</p>
                  )}
                </div>
              ) : (
                <div className="border-t border-cream-dark/60 pt-4">
                  <p className="text-sm italic text-medium-gray">
                    Pris beregnes av renser etter henting
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Special Instructions */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '300ms' }}
        >
          <EditableSpecialInstructions
            orderId={order.id}
            initialInstructions={order.special_instructions}
            isEditable={isEditable}
          />
        </section>

        {/* Address Card - Editable */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '360ms' }}
        >
          <EditableAddress
            orderId={order.id}
            initialAddress={{
              street: order.street,
              postalCode: order.postal_code,
              city: order.city,
              country: order.country,
              specialInstructionsAddress: order.special_instructions_address,
            }}
            isEditable={isEditable}
          />
        </section>

        {/* Cancel Button */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '420ms' }}
        >
          <CancelOrderButton
            orderId={order.id}
            orderStatus={order.status}
            scheduledDate={order.scheduled_date}
          />
        </section>
      </main>
    </div>
  );
}

// Helper to get timestamp for each step
function getTimestampForStep(status: OrderStatus, order: {
  picked_up_at: string | null;
  in_cleaning_at: string | null;
  ready_for_delivery_at: string | null;
  out_for_delivery_at: string | null;
  completed_at: string | null;
  assigned_at: string | null;
  created_at: string;
}): string | null {
  switch (status) {
    case 'pending_assignment':
      return order.created_at;
    case 'pickup_scheduled':
      return order.assigned_at;
    case 'picked_up':
      return order.picked_up_at;
    case 'in_cleaning':
      return order.in_cleaning_at;
    case 'ready_for_delivery':
      return order.ready_for_delivery_at;
    case 'out_for_delivery':
      return order.out_for_delivery_at;
    case 'completed':
      return order.completed_at;
    default:
      return null;
  }
}
