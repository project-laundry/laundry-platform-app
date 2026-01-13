'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatNok } from '@/lib/config/pricing';
import type { OrderWithCustomer } from '../actions';
import type { OrderStatus } from '@/types/database';

interface CleanerOrderCardProps {
  order: OrderWithCustomer;
}

// Status display configuration
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' | 'destructive' }
> = {
  pending_assignment: { label: 'Venter pa tildeling', variant: 'warning' },
  pickup_scheduled: { label: 'Henting planlagt', variant: 'info' },
  picked_up: { label: 'Under arbeid', variant: 'info' },
  in_cleaning: { label: 'Vaskes', variant: 'info' },
  ready_for_delivery: { label: 'Klar for levering', variant: 'success' },
  out_for_delivery: { label: 'Ut for levering', variant: 'success' },
  completed: { label: 'Fullfort', variant: 'neutral' },
  cancelled: { label: 'Kansellert', variant: 'destructive' },
};

export function CleanerOrderCard({ order }: CleanerOrderCardProps) {
  const statusConfig = STATUS_CONFIG[order.status];
  const hasPrice = order.total_cost_ore !== null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-dark-gray">#{order.order_number}</p>
            <p className="text-sm text-medium-gray">{order.customer.user.full_name}</p>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <p className="text-medium-gray">Henting</p>
            <p className="font-medium text-dark-gray">
              {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
          <div>
            <p className="text-medium-gray">Levering</p>
            <p className="font-medium text-dark-gray">
              {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap mb-4">
          {order.needs_ironing && (
            <Badge variant="info" className="text-xs">Stryking inkludert</Badge>
          )}
          {hasPrice ? (
            <Badge variant="success" className="text-xs">
              {formatNok(order.total_cost_ore!)} kr
            </Badge>
          ) : (
            <Badge variant="warning" className="text-xs">Ikke priset</Badge>
          )}
        </div>

        {/* Action button */}
        <Link href={`/dashboard/cleaner/${order.id}`}>
          <Button variant="outline" className="w-full">
            Se ordre
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
