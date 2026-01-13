'use client';

import { CleanerOrderCard } from './CleanerOrderCard';
import { isToday } from '@/lib/utils/date';
import type { OrderWithCustomer } from '../actions';

interface CleanerOrderListProps {
  orders: OrderWithCustomer[];
}

export function CleanerOrderList({ orders }: CleanerOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-medium-gray">Du har ingen aktive oppdrag for oyeblikket.</p>
      </div>
    );
  }

  // Sort orders: today's pickups first, then by scheduled date
  const sortedOrders = [...orders].sort((a, b) => {
    const aIsToday = isToday(a.scheduled_date);
    const bIsToday = isToday(b.scheduled_date);

    // If one is today and the other isn't, today comes first
    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;

    // Otherwise sort by scheduled date
    return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
  });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sortedOrders.map((order) => (
        <CleanerOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
