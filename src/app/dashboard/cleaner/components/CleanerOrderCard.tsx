'use client';

import Link from 'next/link';
import { formatNok } from '@/lib/config/pricing';
import { isToday } from '@/lib/utils/date';
import type { OrderWithCustomer } from '../actions';
import type { OrderStatus } from '@/types/database';

interface CleanerOrderCardProps {
  order: OrderWithCustomer;
}

// Status display configuration — badge tints per brandbook §4.
const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_assignment: { label: 'Venter pa tildeling', className: 'bg-amber-50 text-amber-800' },
  pickup_scheduled: { label: 'Venter på henting', className: 'bg-nordic-blue/10 text-nordic-blue' },
  picked_up: { label: 'På vei til deg', className: 'bg-nordic-blue/10 text-nordic-blue' },
  in_cleaning: { label: 'Vaskes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  ready_for_delivery: { label: 'Klar for henting', className: 'bg-sea-green/10 text-sea-green' },
  out_for_delivery: { label: 'Ut for levering', className: 'bg-sea-green/10 text-sea-green' },
  completed: { label: 'Fullfort', className: 'bg-cream-dark/60 text-medium-gray' },
  cancelled: { label: 'Kansellert', className: 'bg-red-50 text-red-700' },
};

const BADGE_BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

export function CleanerOrderCard({ order }: CleanerOrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const hasPrice = order.total_cost_ore !== null;
  const arrivesToday =
    isToday(order.scheduled_date) &&
    (order.status === 'pickup_scheduled' || order.status === 'picked_up');

  return (
    <div
      className={`rounded-3xl border bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur transition-shadow hover:shadow-md ${
        arrivesToday ? 'border-amber-300' : 'border-cream-dark/80'
      }`}
    >
      {/* Laundry arriving today badge */}
      {arrivesToday && (
        <div className="mb-3">
          <span className={`${BADGE_BASE} bg-amber-50 text-amber-800`}>
            Kommer til deg i dag
          </span>
        </div>
      )}

      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-lg font-semibold text-dark-gray">
            #{order.order_number}
          </p>
          <p className="text-sm text-medium-gray">{order.customer.user.full_name}</p>
        </div>
        <span className={`${BADGE_BASE} shrink-0 ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Key info */}
      <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-medium-gray">Henting</p>
          <p className="font-medium tabular-nums text-dark-gray">
            {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
        <div>
          <p className="text-medium-gray">Est. levering</p>
          <p className="font-medium tabular-nums text-dark-gray">
            {new Date(order.delivery_date).toLocaleDateString('no-NO', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        {order.needs_ironing && (
          <span className={`${BADGE_BASE} bg-nordic-blue/10 text-nordic-blue`}>
            Stryking inkludert
          </span>
        )}
        {hasPrice ? (
          <span className={`${BADGE_BASE} bg-sea-green/10 text-sea-green tabular-nums`}>
            {formatNok(order.total_cost_ore!)} kr
          </span>
        ) : (
          <span className={`${BADGE_BASE} bg-amber-50 text-amber-800`}>
            Ikke priset
          </span>
        )}
      </div>

      {/* Action button */}
      <Link
        href={`/dashboard/cleaner/${order.id}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
      >
        Se ordre
      </Link>
    </div>
  );
}
