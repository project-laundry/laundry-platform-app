import Link from 'next/link';
import type { OrderStatus } from '@/types/database';
import { Calendar, ArrowRight } from 'lucide-react';

interface RescheduleButtonProps {
  orderId: string;
  orderStatus: OrderStatus;
}

export function RescheduleButton({
  orderId,
  orderStatus,
}: RescheduleButtonProps) {
  // Only show button for editable statuses
  const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
  if (!editableStatuses.includes(orderStatus)) {
    return null;
  }

  return (
    <Link
      href={`/orders/${orderId}/reschedule`}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green"
    >
      <Calendar className="size-4" />
      <span>Endre dato</span>
      <ArrowRight className="size-3" />
    </Link>
  );
}
