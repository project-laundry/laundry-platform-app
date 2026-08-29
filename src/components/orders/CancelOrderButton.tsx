import Link from 'next/link';
import type { OrderStatus } from '@/types/database';
import { XCircle, Clock } from 'lucide-react';

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

  // Check if more than 24 hours before pickup
  const now = new Date();
  const pickupDate = new Date(scheduledDate);
  const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canCancel = hoursUntilPickup > 24;

  if (!canCancel) {
    return (
      <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
        <Clock className="mt-0.5 size-4 shrink-0 text-sea-green" />
        <p>Kansellering er kun mulig mer enn 24 timer før henting.</p>
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
    </div>
  );
}
