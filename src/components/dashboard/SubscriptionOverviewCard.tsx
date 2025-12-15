import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, FileText, Clock, Camera } from 'lucide-react';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  getSubscriptionFrequencyLabel,
} from '@/lib/utils/subscription-status';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { getRelativeDateDisplay } from '@/lib/utils/date-format';
import type { Subscription, OrderWithRelations } from '@/types/database';
import Link from 'next/link';

interface SubscriptionOverviewCardProps {
  subscription: Subscription & {
    plan?: {
      name: string;
      frequency: string;
      included_kg: number;
    } | null;
  };
  nextOrder?: OrderWithRelations | null;
}

export function SubscriptionOverviewCard({ subscription, nextOrder }: SubscriptionOverviewCardProps) {
  const { plan, status, delivery_street, delivery_postal_code, delivery_city, delivery_special_instructions } = subscription;

  const requiresPhoto = nextOrder?.pickup_method !== 'home';
  const pickupTimeRange = getPickupTimeRangeLabel();

  return (
    <Card>
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-dark-gray mb-1">
              {plan?.name || 'Abonnement'}
            </h3>
            {plan?.frequency && (
              <p className="text-sm text-medium-gray font-medium">
                {getSubscriptionFrequencyLabel(plan.frequency as any)}
              </p>
            )}
            <p className="text-sm text-medium-gray">Her er din kommende henting</p>
          </div>
          <Badge variant={getSubscriptionStatusVariant(status)}>
            {getSubscriptionStatusLabel(status)}
          </Badge>
        </div>

        {nextOrder ? (
          <>
            {/* Primary Order Info - Two Column Grid */}
            <div className="mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Pickup Date */}
                <div className="bg-soft-gray rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-medium-gray" />
                    <p className="text-xs text-medium-gray">Hentedato</p>
                  </div>
                  <p className="text-lg font-bold text-dark-gray">
                    {getRelativeDateDisplay(nextOrder.scheduled_date)}
                  </p>
                </div>

                {/* Pickup Time */}
                <div className="bg-soft-gray rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-medium-gray" />
                    <p className="text-xs text-medium-gray">Hentetid</p>
                  </div>
                  <p className="text-lg font-bold text-dark-gray">
                    {pickupTimeRange}
                  </p>
                </div>

                {/* Pickup Address */}
                <div className="bg-soft-gray rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-medium-gray" />
                    <p className="text-xs text-medium-gray">Henteadresse</p>
                  </div>
                  <p className="text-sm font-semibold text-dark-gray">
                    {delivery_street}
                  </p>
                  <p className="text-xs text-medium-gray">
                    {delivery_postal_code} {delivery_city}
                  </p>
                </div>

                {/* Pickup Instructions */}
                {delivery_special_instructions && (
                  <div className="bg-soft-gray rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-medium-gray" />
                      <p className="text-xs text-medium-gray">Henteinstruksjoner</p>
                    </div>
                    <p className="text-sm text-dark-gray">{delivery_special_instructions}</p>
                  </div>
                )}
              </div>

              {/* Photo Requirement - Full Width */}
              {requiresPhoto && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-5 h-5 text-amber-600" />
                    <p className="text-sm text-amber-900 font-medium">Bilde kreves</p>
                  </div>
                  <p className="text-xs text-amber-800">
                    Du må ta et bilde av plassering ved henting
                  </p>
                </div>
              )}
            </div>

            {/* CTA Button - View Order Details */}
            <Link href={`/orders/${nextOrder.id}`}>
              <Button
                variant="outline"
                className="w-full"
                size="lg"
              >
                Se ordedetaljer
              </Button>
            </Link>
          </>
        ) : (
          <>
            {/* No upcoming order */}
            <div className="bg-soft-gray rounded-lg p-6 mb-6 text-center">
              <p className="text-medium-gray">Ingen kommende henting planlagt</p>
            </div>

            {/* CTA Button - Create New Order */}
            <Link href="/orders/plans">
              <Button
                className="w-full bg-[hsl(var(--nordic-blue))] hover:bg-[hsl(var(--nordic-blue))]/90 text-white font-semibold"
                size="lg"
              >
                Bestill ny henting
              </Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
