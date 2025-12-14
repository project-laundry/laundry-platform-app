import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
    <details className="group bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <summary className="flex items-center justify-between cursor-pointer list-none px-6 py-5 hover:bg-gray-50 transition-all">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-dark-gray">Historikk</h3>
          <Badge variant="neutral">{orders.length}</Badge>
        </div>
        <svg
          className="w-5 h-5 text-medium-gray transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-medium-gray uppercase tracking-wider">
                  Bestilling
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-medium-gray uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-medium-gray uppercase tracking-wider">
                  Henting
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-medium-gray uppercase tracking-wider">
                  Levering
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-medium-gray uppercase tracking-wider">
                  Fullført
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-all cursor-pointer opacity-75 border-l-4 border-l-transparent hover:border-l-success-green"
                >
                  <td className="px-6 py-5 whitespace-nowrap">
                    <Link href={`/orders/${order.id}`} className="text-nordic-blue hover:underline font-semibold text-sm">
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {getOrderStatusLabel(order.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-dark-gray">
                    {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-dark-gray">
                    {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-medium-gray">
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
