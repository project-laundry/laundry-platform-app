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
    <details className="group bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden hover:border-[hsl(var(--nordic-blue))]/30 transition-all duration-300 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
      <summary className="flex items-center justify-between cursor-pointer list-none px-6 py-5 hover:bg-cream/50 transition-all">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-xl font-medium text-foreground">Historikk</h3>
          <Badge variant="neutral" className="bg-cream text-muted-foreground">{orders.length}</Badge>
        </div>
        <svg
          className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="border-t border-border/30">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream/50 border-b border-border/30">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-sea-green uppercase tracking-widest">
                  Bestilling
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-sea-green uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-sea-green uppercase tracking-widest">
                  Henting
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-sea-green uppercase tracking-widest">
                  Levering
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-sea-green uppercase tracking-widest">
                  Fullfort
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-cream/30 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-[hsl(var(--sea-green))]"
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
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-foreground">
                    {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-foreground">
                    {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-muted-foreground">
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
