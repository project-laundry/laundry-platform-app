import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, FileText } from 'lucide-react';
import { oreToNok } from '@/lib/config/pricing';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from '@/lib/utils/subscription-status';
import type { Subscription } from '@/types/database';
import Link from 'next/link';

interface SubscriptionOverviewCardProps {
  subscription: Subscription & {
    plan?: {
      name: string;
      frequency: string;
      included_kg: number;
    } | null;
  };
  nextPickupDate?: string | null;
}

export function SubscriptionOverviewCard({ subscription, nextPickupDate }: SubscriptionOverviewCardProps) {
  const { plan, status, billing_cost_ore, delivery_street, delivery_postal_code, delivery_city, delivery_special_instructions } = subscription;

  return (
    <Card>
      <CardContent className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-semibold text-dark-gray">Ditt abonnement</h3>
          <Badge variant={getSubscriptionStatusVariant(status)}>
            {getSubscriptionStatusLabel(status)}
          </Badge>
        </div>

        {/* Plan Name */}
        <p className="text-medium-gray mb-6">{plan?.name}</p>

        {/* Info Boxes */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Next Pickup */}
          <div className="bg-soft-gray rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-medium-gray" />
              <p className="text-sm text-medium-gray">Neste henting</p>
            </div>
            <p className="text-base font-semibold text-dark-gray">
              {nextPickupDate
                ? new Date(nextPickupDate).toLocaleDateString('no-NO', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'Ikke planlagt'}
            </p>
          </div>

          {/* Pickup Address & Instructions */}
          <div className="bg-soft-gray rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-medium-gray" />
              <p className="text-sm text-medium-gray">Henteadresse</p>
            </div>
            <p className="text-sm font-semibold text-dark-gray">
              {delivery_street}
            </p>
            <p className="text-xs text-medium-gray">
              {delivery_postal_code} {delivery_city}
            </p>
            {delivery_special_instructions && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-medium-gray" />
                  <p className="text-xs text-medium-gray truncate">{delivery_special_instructions}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Price */}
        <div className="mb-6">
          <p className="text-sm text-medium-gray">Månedlig pris</p>
          <p className="text-lg font-semibold text-dark-gray">{oreToNok(billing_cost_ore)} kr/mnd</p>
        </div>

        {/* CTA Button */}
        <Link href="/orders/plans">
          <Button
            className="w-full bg-[hsl(var(--nordic-blue))] hover:bg-[hsl(var(--nordic-blue))]/90 text-white font-semibold"
            size="lg"
          >
            Bestill ny henting
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
