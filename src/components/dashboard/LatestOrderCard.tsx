import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import type { OrderWithRelations } from '@/types/database';
import Link from 'next/link';

interface LatestOrderCardProps {
  order: OrderWithRelations;
}

export function LatestOrderCard({ order }: LatestOrderCardProps) {
  return (
    <Card>
      <CardContent className="p-8">
        <h3 className="text-2xl font-semibold text-dark-gray mb-2">Siste ordre</h3>
        <p className="text-medium-gray mb-6">Din nyeste bestilling</p>

        <Link href={`/orders/${order.id}`}>
          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-nordic-blue hover:bg-blue-50/30 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Sparkles className="w-6 h-6 text-nordic-blue" />
              </div>
              <div>
                <p className="font-semibold text-dark-gray">#{order.order_number}</p>
                <p className="text-sm text-medium-gray">
                  {new Date(order.created_at).toLocaleDateString('no-NO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {order.bag_count && ` • ${order.bag_count} plagg`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={getOrderStatusVariant(order.status)}>
                {getOrderStatusLabel(order.status)}
              </Badge>
              {order.delivery_date && (
                <p className="text-sm text-medium-gray hidden md:block">
                  Forventet levering:{' '}
                  {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
