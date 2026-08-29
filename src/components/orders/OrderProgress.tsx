import { Clock } from 'lucide-react';
import {
  ORDER_STATUS_SEQUENCE,
  getOrderStatusLabel,
  getOrderStatusStep,
} from '@/lib/utils/order-status';
import type { OrderStatus } from '@/types/database';

// Horizontal lifecycle progress — brandbook progress bars with the
// current status label and its timestamp below. Not for cancelled orders.
export function OrderProgress({
  status,
  currentTimestamp,
}: {
  status: OrderStatus;
  currentTimestamp: string | null;
}) {
  const currentStep = getOrderStatusStep(status);
  if (currentStep < 0) {
    return null;
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {ORDER_STATUS_SEQUENCE.map((step, index) => (
          <span
            key={step}
            className={`h-1.5 flex-1 rounded-full ${
              index <= currentStep ? 'bg-sea-green' : 'bg-cream-dark'
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-sea-green">
          {getOrderStatusLabel(status)}
        </p>
        {currentTimestamp && (
          <p className="flex items-center gap-1.5 text-xs tabular-nums text-medium-gray">
            <Clock className="size-3" />
            {new Date(currentTimestamp).toLocaleString('no-NO', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </div>
    </div>
  );
}
