import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { formatKr } from '@/lib/config/pricing';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { OrderProgress } from '@/components/orders/OrderProgress';
import { CancelOrderButton } from '@/components/orders/CancelOrderButton';
import { RescheduleButton } from '@/components/orders/RescheduleButton';
import { EditableSpecialInstructions } from '@/components/orders/EditableSpecialInstructions';
import { EditableOrderSelection } from '@/components/orders/EditableOrderSelection';
import { EditableAddress } from '@/components/orders/EditableAddress';
import type { OrderStatus, OrderWithRelations } from '@/types/database';
import { Truck, User, Package, AlertCircle, Info } from 'lucide-react';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('no-NO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Timestamp column matching the order's current status
function timestampForStatus(status: OrderStatus, order: {
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

// Presentational layout for the customer order details page.
// The route's page.tsx handles auth + data and renders this.
export function OrderDetailsView({ order }: { order: OrderWithRelations }) {
  const isEditable = order.status === 'pending_assignment' || order.status === 'pickup_scheduled';
  const isCancelled = order.status === 'cancelled';

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

        {/* Hero + progress */}
        <section className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-3xl font-semibold leading-tight tabular-nums text-dark-gray">
              #{order.order_number}
            </h1>
            <StatusBadge variant={getOrderStatusVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </StatusBadge>
          </div>

          {isCancelled ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>
                Bestillingen ble kansellert
                {order.cancelled_at && ` ${formatDateTime(order.cancelled_at)}`}.
                {order.cancellation_reason && ` ${order.cancellation_reason}`}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
              <OrderProgress
                status={order.status}
                currentTimestamp={timestampForStatus(order.status, order)}
              />
            </div>
          )}
        </section>

        {/* Summary card */}
        <section
          className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '60ms' }}
        >
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <div className="divide-y divide-cream-dark/60">
              {/* Pickup */}
              <div className="flex items-start justify-between gap-3 pb-3">
                <div className="flex items-start gap-3">
                  <Package className="mt-0.5 size-4 shrink-0 text-sea-green" />
                  <div>
                    <p className="font-medium text-dark-gray">
                      {formatDate(order.scheduled_date)}
                    </p>
                    <p className="text-sm tabular-nums text-medium-gray">
                      Henting kl. {getPickupTimeRangeLabel()}
                    </p>
                  </div>
                </div>
                {isEditable && (
                  <RescheduleButton orderId={order.id} orderStatus={order.status} />
                )}
              </div>

              {/* Delivery */}
              <div className="flex items-start gap-3 py-3">
                <Truck className="mt-0.5 size-4 shrink-0 text-sea-green" />
                <div>
                  <p className="font-medium text-dark-gray">
                    {formatDate(order.delivery_date)}
                  </p>
                  <p className="text-sm text-medium-gray">
                    {order.status === 'completed' ? 'Levert' : 'Estimert levering'}
                  </p>
                </div>
              </div>

              {/* Cleaner */}
              {order.cleaner && (
                <div className="flex items-center gap-3 py-3">
                  <User className="size-4 shrink-0 text-sea-green" />
                  <p className="font-medium text-dark-gray">{order.cleaner.display_name}</p>
                </div>
              )}

              {/* Address (editable row) */}
              <div className="pt-3">
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
              </div>
            </div>
          </div>
        </section>

        {/* Order contents + price */}
        <section
          className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '120ms' }}
        >
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h2 className="font-serif text-lg font-semibold text-dark-gray">Din bestilling</h2>

            <div className="mt-3 divide-y divide-cream-dark/60">
              <div className="pb-3">
                <EditableOrderSelection
                  orderId={order.id}
                  initialEstimate={order.customer_estimate}
                  initialNeedsIroning={order.needs_ironing}
                  isEditable={isEditable}
                />
              </div>

              {/* Price */}
              <div className="pt-3">
                {order.total_cost_ore !== null ? (
                  <>
                    {order.promo?.discount_ore ? (
                      <div className="mb-2 space-y-1.5">
                        <div className="flex items-center justify-between text-sm text-medium-gray">
                          <span>Pris</span>
                          <span className="tabular-nums line-through">
                            {formatKr(order.total_cost_ore + order.promo.discount_ore)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-sea-green">
                          <span>Rabatt ({order.promo.code})</span>
                          <span className="tabular-nums">
                            −{formatKr(order.promo.discount_ore)}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between">
                      <span className="text-medium-gray">Totalt</span>
                      <span className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">
                        {formatKr(order.total_cost_ore)}
                      </span>
                    </div>
                    {(order.pricing_notes || order.actual_weight_kg !== null) && (
                      <p className="mt-2 text-xs text-medium-gray">
                        {order.pricing_notes}
                        {order.pricing_notes && order.actual_weight_kg !== null && ' · '}
                        {order.actual_weight_kg !== null &&
                          `Veid ${order.actual_weight_kg} kg`}
                        {order.price_calculated_at &&
                          ` · beregnet ${formatDateTime(order.price_calculated_at)}`}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {order.customer_estimate ? (
                      <div className="flex items-center justify-between">
                        <span className="text-medium-gray">Estimat</span>
                        <span className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">
                          ca. {formatKr(order.customer_estimate.estimated_total_ore)}
                        </span>
                      </div>
                    ) : null}
                    <div
                      className={`flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray ${
                        order.customer_estimate ? 'mt-2' : ''
                      }`}
                    >
                      <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
                      <p>Endelig pris beregnes av renser etter henting.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Wash instructions */}
        <section
          className="mt-4 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '180ms' }}
        >
          <EditableSpecialInstructions
            orderId={order.id}
            initialInstructions={order.special_instructions}
            isEditable={isEditable}
          />
        </section>

        {/* Cancel */}
        <section
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '240ms' }}
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
