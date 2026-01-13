import Link from 'next/link';
import type { OrderStatus } from '@/types/database';
import { AlertTriangle, ArrowRight } from 'lucide-react';

interface CancelOrderButtonProps {
  orderId: string;
  orderStatus: OrderStatus;
}

export function CancelOrderButton({
  orderId,
  orderStatus,
}: CancelOrderButtonProps) {
  // Only show button for cancellable statuses
  const cancellableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
  if (!cancellableStatuses.includes(orderStatus)) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-2xl border border-red-200/50 p-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">Kanseller bestilling</h3>
          <p className="text-sm text-gray-500 mb-4">
            Du kan kansellere denne bestillingen før den er hentet.
          </p>
          <Link
            href={`/orders/${orderId}/cancel`}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-red-100 rounded-xl hover:bg-red-200 transition-colors group"
          >
            <span>Kanseller bestilling</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}
