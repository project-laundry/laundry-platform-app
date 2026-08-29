import Link from 'next/link';
import type { OrderStatus } from '@/types/database';
import { XCircle, ArrowRight, Clock } from 'lucide-react';

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
      <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cream-dark/60 text-medium-gray">
            <Clock className="size-5" />
          </span>
          <div className="flex-1">
            <h3 className="font-serif text-lg font-semibold text-dark-gray">
              Kansellering ikke mulig
            </h3>
            <p className="mt-1 text-sm text-medium-gray">
              Bestillinger kan kun kanselleres mer enn 24 timer før henting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
          <XCircle className="size-5" />
        </span>
        <div className="flex-1">
          <h3 className="font-serif text-lg font-semibold text-dark-gray">
            Kanseller bestilling
          </h3>
          <p className="mt-1 text-sm text-medium-gray">
            Du kan kansellere denne bestillingen før den er hentet.
          </p>
          <Link
            href={`/orders/${orderId}/cancel`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-all hover:border-red-400 active:scale-[0.98]"
          >
            <span>Kanseller bestilling</span>
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
