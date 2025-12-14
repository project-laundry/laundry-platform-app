import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import type { OrderWithRelations } from '@/types/database';

interface OrderCardProps {
  order: OrderWithRelations;
  variant?: 'default' | 'muted';
}

export function OrderCard({ order, variant = 'default' }: OrderCardProps) {
  const isMuted = variant === 'muted';

  return (
    <Link href={`/orders/${order.id}`} className="block">
      <Card className={`transition-all hover:shadow-md ${isMuted ? 'opacity-70 hover:opacity-100' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-medium-gray mb-1">Bestilling</p>
              <p className={`font-semibold ${isMuted ? 'text-medium-gray' : 'text-dark-gray'}`}>
                #{order.order_number}
              </p>
            </div>
            <Badge variant={getOrderStatusVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-medium-gray mb-1">Henting</p>
              <p className={`font-medium ${isMuted ? 'text-medium-gray' : 'text-dark-gray'}`}>
                {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
            <div>
              <p className="text-medium-gray mb-1">Levering</p>
              <p className={`font-medium ${isMuted ? 'text-medium-gray' : 'text-dark-gray'}`}>
                {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          </div>

          {order.cleaner && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-medium-gray">
                Renser: <span className="font-medium">{order.cleaner.display_name}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
