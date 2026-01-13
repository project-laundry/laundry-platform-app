import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, FileText, Clock } from 'lucide-react';
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
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card transition-all duration-300 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-3xl font-light text-foreground mb-2">
            Ditt <span className="text-gradient font-medium">abonnement</span>
          </h3>
          <p className="text-sm text-sea-green font-medium uppercase tracking-wider">
            {getSubscriptionFrequencyLabel(frequency)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Her er din kommende henting</p>
        </div>
        <Badge variant={getSubscriptionStatusVariant(status)}>
          {getSubscriptionStatusLabel(status)}
        </Badge>
      </div>

      {nextOrder ? (
        <>
          {/* Primary Order Info - Two Column Grid */}
          <div className="mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pickup Date */}
              <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                    <Calendar className="w-5 h-5 text-nordic-blue" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Hentedato</p>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {getRelativeDateDisplay(nextOrder.scheduled_date)}
                </p>
              </div>

              {/* Pickup Time */}
              <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                    <Clock className="w-5 h-5 text-nordic-blue" />
                  </div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Hentetid</p>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {pickupTimeRange}
                </p>
              </div>

              {/* Pickup Address */}
              {address && (
                <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                      <MapPin className="w-5 h-5 text-nordic-blue" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Henteadresse</p>
                  </div>
                  <p className="text-base font-semibold text-foreground">
                    {address.street}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {address.postal_code} {address.city}
                  </p>
                </div>
              )}

              {/* Pickup Instructions */}
              {address?.special_instructions && (
                <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                      <FileText className="w-5 h-5 text-nordic-blue" />
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Henteinstruksjoner</p>
                  </div>
                  <p className="text-sm text-foreground">{address.special_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* CTA Button - View Order Details */}
          <Link href={`/orders/details/${nextOrder.id}`}>
            <Button
              variant="hero"
              className="w-full"
              size="lg"
            >
              Se ordredetaljer
            </Button>
          </Link>
        </>
      ) : (
        <>
          {/* No upcoming order */}
          <div className="bg-cream rounded-xl p-8 mb-6 text-center">
            <p className="font-serif text-lg text-muted-foreground">Ingen kommende henting planlagt</p>
          </div>

          {/* CTA Button - Create New Order */}
          <Link href="/orders/location-service">
            <Button
              variant="hero"
              className="w-full"
              size="lg"
            >
              Bestill ny henting
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
