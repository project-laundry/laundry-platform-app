import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import type { OrderWithRelations } from '@/types/database';

interface OrderHistorySectionProps {
  orders: OrderWithRelations[];
}

export function OrderHistorySection({ orders }: OrderHistorySectionProps) {
  // Don't render anything if there are no completed orders
  if (orders.length === 0) {
    return null;
  }

  return (
    <details className="group overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 transition-colors hover:bg-cream/50">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-lg font-semibold text-dark-gray">Historikk</h3>
          <span className="inline-flex items-center rounded-full bg-cream-dark/60 px-2.5 py-0.5 text-xs font-medium tabular-nums text-medium-gray">
            {orders.length}
          </span>
        </div>
        <ChevronDown className="size-5 text-medium-gray transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-cream-dark/60">
        {/* Mobile: stacked cards */}
        <ul className="divide-y divide-cream-dark/60 sm:hidden">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/details/${order.id}`}
                className="block px-5 py-4 transition-colors hover:bg-cream/50"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold tabular-nums text-nordic-blue">
                    #{order.order_number}
                  </span>
                  <StatusBadge variant={getOrderStatusVariant(order.status)}>
                    {getOrderStatusLabel(order.status)}
                  </StatusBadge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <dt className="mb-0.5 text-medium-gray">Henting</dt>
                    <dd className="font-medium tabular-nums text-dark-gray">
                      {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-medium-gray">Levering</dt>
                    <dd className="font-medium tabular-nums text-dark-gray">
                      {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-0.5 text-medium-gray">Fullfort</dt>
                    <dd className="tabular-nums text-medium-gray">
                      {order.completed_at
                        ? new Date(order.completed_at).toLocaleDateString('no-NO', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : order.cancelled_at
                        ? new Date(order.cancelled_at).toLocaleDateString('no-NO', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
        {/* Desktop: table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full">
            <thead className="border-b border-cream-dark/60 bg-cream/50">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Bestilling
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Status
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Henting
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Levering
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
                  Fullfort
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-dark/60">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-cream/50">
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Link
                      href={`/orders/details/${order.id}`}
                      className="text-sm font-semibold tabular-nums text-nordic-blue underline-offset-2 hover:underline"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <StatusBadge variant={getOrderStatusVariant(order.status)}>
                      {getOrderStatusLabel(order.status)}
                    </StatusBadge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium tabular-nums text-dark-gray">
                    {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm font-medium tabular-nums text-dark-gray">
                    {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-sm tabular-nums text-medium-gray">
                    {order.completed_at
                      ? new Date(order.completed_at).toLocaleDateString('no-NO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : order.cancelled_at
                      ? new Date(order.cancelled_at).toLocaleDateString('no-NO', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
