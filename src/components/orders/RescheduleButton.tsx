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
      className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors group"
    >
      <Calendar className="w-4 h-4" />
      <span>Endre dato</span>
      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}
