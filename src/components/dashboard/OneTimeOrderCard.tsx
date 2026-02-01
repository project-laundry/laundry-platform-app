import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, FileText, Clock, Package } from 'lucide-react';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { getRelativeDateDisplay } from '@/lib/utils/date-format';
import type { OrderWithRelations } from '@/types/database';
import Link from 'next/link';

interface OneTimeOrderCardProps {
  order: OrderWithRelations;
}

export function OneTimeOrderCard({ order }: OneTimeOrderCardProps) {
  const pickupTimeRange = getPickupTimeRangeLabel();

  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-8 hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card transition-all duration-300 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-serif text-3xl font-light text-foreground mb-2">
            Kommende <span className="text-gradient font-medium">ordre</span>
          </h3>
          <p className="text-sm text-sea-green font-medium uppercase tracking-wider">
            ENGANGSVASK
          </p>
          <p className="text-sm text-muted-foreground mt-1">Her er din kommende henting</p>
        </div>
        <Badge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </Badge>
      </div>

      {/* Primary Order Info - Two Column Grid */}
      <div className="mb-8">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Pickup Date */}
          <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                <Calendar className="w-5 h-5 text-nordic-blue" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dato</p>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {getRelativeDateDisplay(order.scheduled_date)}
            </p>
          </div>

          {/* Pickup Time */}
          <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                <Clock className="w-5 h-5 text-nordic-blue" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tidspunkt</p>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {pickupTimeRange}
            </p>
          </div>

          {/* Pickup Address */}
          <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                <MapPin className="w-5 h-5 text-nordic-blue" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Adresse</p>
            </div>
            <p className="text-base font-semibold text-foreground">
              {order.street}
            </p>
            <p className="text-sm text-muted-foreground">
              {order.postal_code} {order.city}
            </p>
          </div>

          {/* Order Number */}
          <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                <Package className="w-5 h-5 text-nordic-blue" />
              </div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Ordrenummer</p>
            </div>
            <p className="text-xl font-semibold text-foreground">
              {order.order_number}
            </p>
          </div>

          {/* Pickup Instructions */}
          {order.special_instructions_address && (
            <div className="bg-cream rounded-xl p-5 hover:bg-[hsl(var(--nordic-blue))]/5 transition-colors group md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue))]/10 flex items-center justify-center group-hover:bg-[hsl(var(--nordic-blue))]/20 transition-colors">
                  <FileText className="w-5 h-5 text-nordic-blue" />
                </div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Henteinstruksjoner</p>
              </div>
              <p className="text-sm text-foreground">{order.special_instructions_address}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA Button - View Order Details */}
      <Link href={`/orders/details/${order.id}`}>
        <Button
          variant="hero"
          className="w-full"
          size="lg"
        >
          Se ordredetaljer
        </Button>
      </Link>
    </div>
  );
}
