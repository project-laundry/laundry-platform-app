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
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Kansellering ikke mulig</h3>
            <p className="text-sm text-gray-500">
              Bestillinger kan kun kanselleres mer enn 24 timer før henting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Kanseller bestilling</h3>
          <p className="text-sm text-gray-500 mb-4">
            Du kan kansellere denne bestillingen før den er hentet.
          </p>
          <Link
            href={`/orders/${orderId}/cancel`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors group"
          >
            <span>Kanseller bestilling</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
