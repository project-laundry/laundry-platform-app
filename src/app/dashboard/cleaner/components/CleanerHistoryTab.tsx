'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { formatNok } from '@/lib/config/pricing';
import type { OrderWithCustomer } from '../actions';

interface CleanerHistoryTabProps {
  orders: OrderWithCustomer[];
}

export function CleanerHistoryTab({ orders }: CleanerHistoryTabProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
        <ClipboardList className="size-8 text-cream-dark" />
        <p className="text-medium-gray">Du har ingen fullførte oppdrag enna.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="divide-y divide-cream-dark/60">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/dashboard/cleaner/${order.id}`}
            className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cream/50"
          >
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-3">
                <span className="font-medium text-dark-gray">
                  #{order.order_number}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    order.status === 'completed'
                      ? 'bg-sea-green/10 text-sea-green'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {order.status === 'completed' ? 'Fullfort' : 'Kansellert'}
                </span>
              </div>
              <p className="text-sm text-medium-gray">
                {order.customer.user.full_name}
              </p>
              <p className="text-xs tabular-nums text-medium-gray">
                {order.completed_at
                  ? new Date(order.completed_at).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : order.cancelled_at
                    ? new Date(order.cancelled_at).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : ''}
              </p>
            </div>
            {order.total_cost_ore && (
              <p className="shrink-0 font-serif text-lg font-semibold tabular-nums text-dark-gray">
                {formatNok(order.total_cost_ore)} kr
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
