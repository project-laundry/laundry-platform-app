import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  getSubscriptionFrequencyLabel,
} from '@/lib/utils/subscription-status';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { getWeekdayFromDate } from '@/lib/utils/date';
import type { Subscription, OrderWithRelations } from '@/types/database';

interface SubscriptionCardProps {
  subscription: Subscription;
  nextOrder?: OrderWithRelations | null;
}

export function SubscriptionCard({ subscription, nextOrder }: SubscriptionCardProps) {
  const { status, frequency, order_defaults } = subscription;

  return (
    <div className="space-y-6">
      {/* Subscription Details Card */}
      <Card className="rounded-2xl">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-dark-gray">
              Ditt abonnement
            </h3>
            <Badge variant={getSubscriptionStatusVariant(status)}>
              {getSubscriptionStatusLabel(status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-medium-gray mb-2 font-medium">Frekvens</p>
              <p className="text-base font-semibold text-dark-gray">
                {getSubscriptionFrequencyLabel(frequency)}
              </p>
            </div>
            {order_defaults?.first_pickup_date && (
              <div>
                <p className="text-sm text-medium-gray mb-2 font-medium">Hentedag</p>
                <p className="text-base font-semibold text-dark-gray capitalize">
                  {getWeekdayFromDate(order_defaults.first_pickup_date)}
                </p>
              </div>
            )}
          </div>

          {/* Next Order Section */}
          {nextOrder && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="bg-blue-50/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-medium-gray font-medium">Kommende vask</p>
                  <Badge variant={getOrderStatusVariant(nextOrder.status)}>
                    {getOrderStatusLabel(nextOrder.status)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-medium-gray mb-1">Bestilling</p>
                    <Link href={`/orders/details/${nextOrder.id}`} className="text-nordic-blue hover:underline font-semibold text-sm">
                      #{nextOrder.order_number}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-medium-gray mb-1">Renser</p>
                    <p className="text-sm font-medium text-dark-gray">
                      {nextOrder.cleaner?.display_name || 'Ikke tildelt'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-medium-gray mb-1">Henting</p>
                    <p className="text-sm font-medium text-dark-gray">
                      {new Date(nextOrder.scheduled_date).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-medium-gray mb-1">Levering</p>
                    <p className="text-sm font-medium text-dark-gray">
                      {new Date(nextOrder.delivery_date).toLocaleDateString('no-NO', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manage Subscription Button */}
      <div>
        <Link href="/dashboard/subscription/manage">
          <Button
            variant="outline"
            size="lg"
            className="w-full border-nordic-blue text-nordic-blue hover:bg-nordic-blue/5 font-semibold"
          >
            Administrer abonnement
          </Button>
        </Link>
      </div>
    </div>
  );
}
