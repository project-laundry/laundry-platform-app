'use client';

import { CleanerOrderCard } from './CleanerOrderCard';
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orders.map((order) => (
        <CleanerOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
