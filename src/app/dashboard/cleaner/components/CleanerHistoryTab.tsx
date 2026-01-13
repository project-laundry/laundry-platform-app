'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatNok } from '@/lib/config/pricing';
import type { OrderWithCustomer } from '../actions';

interface CleanerHistoryTabProps {
  orders: OrderWithCustomer[];
}

export function CleanerHistoryTab({ orders }: CleanerHistoryTabProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-medium-gray">Du har ingen fullførte oppdrag enna.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Link key={order.id} href={`/dashboard/cleaner/${order.id}`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-dark-gray">
                      #{order.order_number}
                    </span>
                    <Badge
                      variant={order.status === 'completed' ? 'success' : 'destructive'}
                    >
                      {order.status === 'completed' ? 'Fullfort' : 'Kansellert'}
                    </Badge>
                  </div>
                  <p className="text-sm text-medium-gray">
                    {order.customer.user.full_name}
                  </p>
                  <p className="text-xs text-medium-gray">
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
                  <div className="text-right">
                    <p className="font-semibold text-dark-gray">
                      {formatNok(order.total_cost_ore)} kr
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
