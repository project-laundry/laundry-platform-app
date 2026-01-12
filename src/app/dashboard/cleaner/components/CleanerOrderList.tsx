'use client';

import { CleanerOrderCard } from './CleanerOrderCard';
import type { OrderWithCustomer } from '../actions';
import type { OrderStatus } from '@/types/database';

interface CleanerOrderListProps {
  orders: OrderWithCustomer[];
}

// Define order groups with labels
const ORDER_GROUPS: { statuses: OrderStatus[]; label: string; emptyLabel: string }[] = [
  {
    statuses: ['pickup_scheduled'],
    label: 'Kommende hentinger',
    emptyLabel: 'Ingen hentinger planlagt',
  },
  {
    statuses: ['picked_up', 'in_cleaning'],
    label: 'Under arbeid',
    emptyLabel: 'Ingen ordrer under arbeid',
  },
  {
    statuses: ['ready_for_delivery', 'out_for_delivery'],
    label: 'Klar for levering',
    emptyLabel: 'Ingen ordrer klare for levering',
  },
];

export function CleanerOrderList({ orders }: CleanerOrderListProps) {
  // Check if there are any orders at all
  const hasOrders = orders.length > 0;

  if (!hasOrders) {
    return (
      <div className="text-center py-8">
        <p className="text-medium-gray">Du har ingen aktive oppdrag for øyeblikket.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {ORDER_GROUPS.map((group) => {
        const groupOrders = orders.filter((o) => group.statuses.includes(o.status));

        return (
          <section key={group.label}>
            <h2 className="text-lg font-semibold text-dark-gray mb-4">
              {group.label}
              {groupOrders.length > 0 && (
                <span className="ml-2 text-sm font-normal text-medium-gray">({groupOrders.length})</span>
              )}
            </h2>

            {groupOrders.length === 0 ? (
              <p className="text-medium-gray text-sm">{group.emptyLabel}</p>
            ) : (
              <div className="space-y-4">
                {groupOrders.map((order) => (
                  <CleanerOrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
