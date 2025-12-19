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
  subscription: Subscription;
  nextOrder?: OrderWithRelations | null;
}

export function SubscriptionOverviewCard({ subscription, nextOrder }: SubscriptionOverviewCardProps) {
  const { status, frequency, order_defaults } = subscription;

  const requiresPhoto = nextOrder?.pickup_method !== 'home';
  const pickupTimeRange = getPickupTimeRangeLabel();

  // Get address from nextOrder if available, otherwise from order_defaults
  const address = nextOrder
    ? {
        street: nextOrder.street,
        postal_code: nextOrder.postal_code,
        city: nextOrder.city,
        special_instructions: nextOrder.special_instructions_address,
      }
    : order_defaults?.initial_address
    ? {
        street: order_defaults.initial_address.street,
        postal_code: order_defaults.initial_address.postal_code,
        city: order_defaults.initial_address.city,
        special_instructions: order_defaults.initial_address.special_instructions,
      }
    : null;

  return (
    <Card>
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-semibold text-dark-gray mb-1">
              Ditt abonnement
            </h3>
            <p className="text-sm text-medium-gray font-medium">
              {getSubscriptionFrequencyLabel(frequency)}
            </p>
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
                {address && (
                  <div className="bg-soft-gray rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-medium-gray" />
                      <p className="text-xs text-medium-gray">Henteadresse</p>
                    </div>
                    <p className="text-sm font-semibold text-dark-gray">
                      {address.street}
                    </p>
                    <p className="text-xs text-medium-gray">
                      {address.postal_code} {address.city}
                    </p>
                  </div>
                )}

                {/* Pickup Instructions */}
                {address?.special_instructions && (
                  <div className="bg-soft-gray rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-medium-gray" />
                      <p className="text-xs text-medium-gray">Henteinstruksjoner</p>
                    </div>
                    <p className="text-sm text-dark-gray">{address.special_instructions}</p>
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
            <Link href={`/orders/details/${nextOrder.id}`}>
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
            <Link href="/orders/location-service">
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
