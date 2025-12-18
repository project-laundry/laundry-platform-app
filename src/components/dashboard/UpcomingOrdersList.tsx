import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import type { OrderWithRelations } from '@/types/database';

interface UpcomingOrdersListProps {
  orders: OrderWithRelations[];
}

export function UpcomingOrdersList({ orders }: UpcomingOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
        <p className="text-medium-gray text-lg font-medium">Ingen kommende vasker</p>
        <p className="text-medium-gray text-sm mt-2">
          Dine kommende bestillinger vil vises her
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
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
                Renser
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-blue-50/30 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-nordic-blue"
              >
                <td className="px-6 py-5 whitespace-nowrap">
                  <Link href={`/orders/details/${order.id}`} className="text-nordic-blue hover:underline font-semibold text-sm">
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
                  {order.cleaner?.display_name || 'Ikke tildelt'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
