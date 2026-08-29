import Link from 'next/link';
import { ChevronRight, MapPin, PackageCheck, Truck, User } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusStep, getOrderStatusVariant } from '@/lib/utils/order-status';
import { getCompactDateLabel, getRelativeDateDisplay } from '@/lib/utils/date-format';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { formatKr } from '@/lib/config/pricing';
import type { OrderWithRelations } from '@/types/database';

// Dense, fully tappable "next pickup" ticket — the dashboard's one prominent element.
export function NextPickupCard({ order }: { order: OrderWithRelations }) {
  const priceLabel =
    order.total_cost_ore !== null
      ? formatKr(order.total_cost_ore)
      : order.customer_estimate
        ? `ca. ${formatKr(order.customer_estimate.estimated_total_ore)}`
        : 'Pris etter henting';

  // Once the laundry is picked up, the pickup date is history — the delivery is
  // what the customer is waiting for, so the card leads with that instead.
  const isPickedUp =
    getOrderStatusStep(order.status) >= getOrderStatusStep('picked_up');

  return (
    <Link
      href={`/orders/details/${order.id}`}
      className="block rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:border-sea-green/50 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
          {isPickedUp ? 'Forventet levering' : 'Neste henting'}
        </p>
        <StatusBadge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </StatusBadge>
      </div>

      <p className="mt-2 font-serif text-2xl font-semibold leading-tight tabular-nums text-dark-gray sm:text-3xl">
        {getRelativeDateDisplay(isPickedUp ? order.delivery_date : order.scheduled_date)}
      </p>
      <p className="mt-0.5 text-sm tabular-nums text-medium-gray">
        kl. {getPickupTimeRangeLabel()}
      </p>

      <div className="mt-3 space-y-1.5 text-sm text-dark-gray">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-sea-green" />
          <span className="truncate">
            {order.street}, {order.postal_code} {order.city}
          </span>
        </p>
        <p className="flex items-center gap-2">
          {isPickedUp ? (
            <PackageCheck className="size-4 shrink-0 text-sea-green" />
          ) : (
            <Truck className="size-4 shrink-0 text-sea-green" />
          )}
          <span className="tabular-nums">
            {isPickedUp
              ? `Hentet ${getCompactDateLabel(order.scheduled_date)}`
              : `Levering ${getCompactDateLabel(order.delivery_date)}`}
          </span>
        </p>
        {order.cleaner && (
          <p className="flex items-center gap-2">
            <User className="size-4 shrink-0 text-sea-green" />
            <span className="truncate">{order.cleaner.display_name}</span>
          </p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-cream-dark/60 pt-3">
        <span className="text-xs tabular-nums text-medium-gray">
          #{order.order_number}
        </span>
        <span className="flex items-center gap-2">
          <span className="font-serif font-semibold tabular-nums text-dark-gray">
            {priceLabel}
          </span>
          <ChevronRight className="size-4 text-nordic-blue" />
        </span>
      </div>
    </Link>
  );
}
