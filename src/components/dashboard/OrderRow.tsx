import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { getCompactDateLabel, getRelativeDateDisplay } from '@/lib/utils/date-format';
import { formatKr } from '@/lib/config/pricing';
import type { OrderWithRelations } from '@/types/database';

// One-line tappable order row for divide-y lists (upcoming + history).
export function OrderRow({
  order,
  context,
}: {
  order: OrderWithRelations;
  context: 'upcoming' | 'history';
}) {
  const dateLabel =
    context === 'upcoming'
      ? getRelativeDateDisplay(order.scheduled_date)
      : getCompactDateLabel(
          order.completed_at ?? order.cancelled_at ?? order.scheduled_date
        );

  return (
    <Link
      href={`/orders/details/${order.id}`}
      className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium tabular-nums text-dark-gray">
          {dateLabel}
        </p>
        <p className="text-xs tabular-nums text-medium-gray">#{order.order_number}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {context === 'history' && order.total_cost_ore !== null && (
          <span className="text-sm tabular-nums text-dark-gray">
            {formatKr(order.total_cost_ore)}
          </span>
        )}
        <StatusBadge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </StatusBadge>
        <ChevronRight className="size-4 text-medium-gray" />
      </div>
    </Link>
  );
}
