import Link from 'next/link';
import type { OrderStatus } from '@/types/database';
import { XCircle, Clock } from 'lucide-react';
import { COMPANY } from '@/lib/config/company';
import {
  canCancelOrderSelf,
  selfCancelClosedText,
  selfCancelOpenText,
} from '@/lib/config/order-timing';

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: OrderStatus;
  scheduledDate: string;
}

export function CancelOrderButton({
  orderId,
  orderStatus,
  scheduledDate,
}: CancelOrderButtonProps) {
  // Only show button for cancellable statuses
  const cancellableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
  if (!cancellableStatuses.includes(orderStatus)) {
    return null;
  }

  // Same rule as cancelOrderAction: open until midnight (Norwegian time) at
  // the start of the day before the pickup day.
  if (!canCancelOrderSelf(scheduledDate)) {
    return (
      <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
        <Clock className="mt-0.5 size-4 shrink-0 text-sea-green" />
        <p>
          {selfCancelClosedText(scheduledDate)} Ta kontakt med oss på{' '}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-sea-green underline-offset-2 hover:underline"
          >
            {COMPANY.email}
          </a>
          , så hjelper vi deg.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Link
        href={`/orders/${orderId}/cancel`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 underline-offset-2 transition-colors hover:underline"
      >
        <XCircle className="size-4" />
        <span>Kanseller bestilling</span>
      </Link>
      <p className="mt-1.5 text-xs text-medium-gray">{selfCancelOpenText(scheduledDate)}</p>
    </div>
  );
}
