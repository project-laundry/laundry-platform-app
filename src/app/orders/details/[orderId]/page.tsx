import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getOrderWithDetailsByIdAndCustomerId } from '@/lib/database/orders';
import { oreToNok } from '@/lib/config/pricing';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { EditableSpecialInstructions } from '@/components/orders/EditableSpecialInstructions';
import { EditableIroning } from '@/components/orders/EditableIroning';
import type { OrderStatus } from '@/types/database';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  Truck,
  MapPin,
  User,
  CheckCircle2,
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
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--cream))] via-white to-[hsl(var(--cream-dark)/30%)]">
      {/* Decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[hsl(var(--nordic-blue)/5%)] rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-[hsl(var(--sea-green)/8%)] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[hsl(var(--nordic-blue)/3%)] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-20 bg-white/80 backdrop-blur-xl border-b border-[hsl(var(--nordic-blue)/10%)] sticky top-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="group flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] flex items-center justify-center shadow-lg shadow-[hsl(var(--nordic-blue)/20%)] group-hover:shadow-[hsl(var(--nordic-blue)/30%)] transition-shadow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif text-xl font-semibold text-[hsl(var(--nordic-blue))] hidden sm:block">NooraCare</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-[hsl(var(--nordic-blue)/70%)] hover:text-[hsl(var(--nordic-blue))] transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Tilbake</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <div className="mb-10 animate-fade-in opacity-0" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-[hsl(var(--nordic-blue)/60%)] text-sm font-medium tracking-wide uppercase mb-2">
                Bestilling
              </p>
              <h1 className="font-serif text-4xl md:text-5xl font-light text-[hsl(var(--nordic-blue))] mb-3">
                #{order.order_number}
              </h1>
              <div className="flex items-center gap-2 text-[hsl(var(--nordic-blue)/70%)]">
                <Shirt className="w-4 h-4" />
                <span className="text-sm">Klesvask</span>
              </div>
            </div>

            {/* Status Badge */}
            <div
              className={`px-5 py-2.5 rounded-full text-sm font-medium ${
                isCancelled
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-[hsl(var(--nordic-blue)/10%)] text-[hsl(var(--nordic-blue))] border border-[hsl(var(--nordic-blue)/20%)]'
              }`}
            >
              {isCancelled ? 'Kansellert' : isCompleted ? 'Fullført' : STATUS_TIMELINE[currentStepIndex]?.label || 'Behandles'}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Timeline - Takes 3 columns */}
          <div className="lg:col-span-3 animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <div className="bg-white rounded-2xl shadow-xl shadow-[hsl(var(--nordic-blue)/5%)] border border-[hsl(var(--nordic-blue)/8%)] p-6 md:p-8">
              <h2 className="font-serif text-2xl text-[hsl(var(--nordic-blue))] mb-8">
                {isCancelled ? 'Bestillingsstatus' : 'Din bestillings reise'}
              </h2>

              {isCancelled ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Bestilling kansellert</h3>
                  {order.cancellation_reason && (
                    <p className="text-gray-500 max-w-sm mx-auto">{order.cancellation_reason}</p>
                  )}
                  {order.cancelled_at && (
                    <p className="text-sm text-gray-400 mt-4">
                      Kansellert {formatDateTime(order.cancelled_at)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline Track */}
                  <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[hsl(var(--nordic-blue)/20%)] via-[hsl(var(--sea-green)/15%)] to-gray-100" />

                  <div className="space-y-0">
                    {STATUS_TIMELINE.map((step, index) => {
                      const state = getStepState(index, currentStepIndex, order.status);
                      const timestamp = getTimestampForStep(step.status, order);

                      return (
                        <div
                          key={step.status}
                          className={`relative flex items-start gap-5 pb-8 last:pb-0 transition-all duration-500 ${
                            state === 'upcoming' ? 'opacity-40' : 'opacity-100'
                          }`}
                        >
                          {/* Icon */}
                          <div
                            className={`relative z-10 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ${
                              state === 'completed'
                                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-500/30'
                                : state === 'current'
                                ? 'bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] shadow-lg shadow-[hsl(var(--nordic-blue)/30%)] animate-pulse'
                                : 'bg-gray-100 border-2 border-gray-200'
                            }`}
                          >
                            {state === 'completed' ? (
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            ) : state === 'current' ? (
                              <Circle className="w-4 h-4 text-white fill-white" />
                            ) : (
                              <span className="text-sm font-medium text-gray-400">{index + 1}</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 pt-2">
                            <h4
                              className={`font-medium text-lg transition-colors ${
                                state === 'completed'
                                  ? 'text-emerald-600'
                                  : state === 'current'
                                  ? 'text-[hsl(var(--nordic-blue))]'
                                  : 'text-gray-400'
                              }`}
                            >
                              {step.label}
                            </h4>
                            <p
                              className={`text-sm mt-0.5 ${
                                state === 'upcoming' ? 'text-gray-300' : 'text-gray-500'
                              }`}
                            >
                              {step.description}
                            </p>
                            {timestamp && state === 'completed' && (
                              <p className="text-xs text-emerald-500/80 mt-2 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
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
          </div>

          {/* Sidebar - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-5">
            {/* Dates Card */}
            <div
              className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6 animate-fade-in opacity-0"
              style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
            >
              <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))] mb-5">Datoer</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue)/8%)] flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue)/12%)] transition-colors">
                    <Package className="w-5 h-5 text-[hsl(var(--nordic-blue))]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Henting</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {formatDate(order.scheduled_date)}
                    </p>
                  </div>
                </div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <div className="flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--sea-green)/10%)] flex items-center justify-center group-hover:bg-[hsl(var(--sea-green)/15%)] transition-colors">
                    <Truck className="w-5 h-5 text-[hsl(var(--sea-green))]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Levering</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {formatDate(order.delivery_date)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cleaner Card */}
            {order.cleaner && (
              <div
                className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6 animate-fade-in opacity-0"
                style={{ animationDelay: '0.35s', animationFillMode: 'forwards' }}
              >
                <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))] mb-5">Din renser</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(var(--nordic-blue)/15%)] to-[hsl(var(--sea-green)/15%)] flex items-center justify-center">
                    <User className="w-6 h-6 text-[hsl(var(--nordic-blue))]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{order.cleaner.display_name}</p>
                    <p className="text-sm text-gray-500">Profesjonell renser</p>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Card */}
            <div
              className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6 animate-fade-in opacity-0"
              style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
            >
              <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))] mb-5">Tjeneste og kostnad</h3>
              <div className="space-y-4">
                <EditableIroning
                  orderId={order.id}
                  initialNeedsIroning={order.needs_ironing}
                  isEditable={isEditable}
                />

                {order.total_cost_ore !== null ? (
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Totalt</span>
                      <span className="text-2xl font-serif font-semibold text-[hsl(var(--nordic-blue))]">
                        {oreToNok(order.total_cost_ore)} kr
                      </span>
                    </div>
                    {order.pricing_notes && (
                      <p className="text-xs text-gray-400 mt-2">{order.pricing_notes}</p>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-400 italic">
                      Pris beregnes av renser etter henting
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions */}
            <div className="animate-fade-in opacity-0" style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}>
              <EditableSpecialInstructions
                orderId={order.id}
                initialInstructions={order.special_instructions}
                isEditable={isEditable}
              />
            </div>

            {/* Address Card */}
            <div
              className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6 animate-fade-in opacity-0"
              style={{ animationDelay: '0.45s', animationFillMode: 'forwards' }}
            >
              <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))] mb-5">Adresse</h3>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue)/8%)] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-[hsl(var(--nordic-blue))]" />
                </div>
                <div className="text-gray-700">
                  <p className="font-medium">{order.street}</p>
                  <p className="text-gray-500">{order.postal_code} {order.city}</p>
                  {order.special_instructions_address && (
                    <p className="text-sm text-gray-400 mt-2 italic">
                      {order.special_instructions_address}
                    </p>
                  )}
                </div>
              </div>
            </div>            

            {/* Cancel Button */}
            <div className="animate-fade-in opacity-0" style={{ animationDelay: '0.55s', animationFillMode: 'forwards' }}>
              <CancelOrderButton
                orderId={order.id}
                orderStatus={order.status}
              />
            </div>
          </div>
        </div>
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
