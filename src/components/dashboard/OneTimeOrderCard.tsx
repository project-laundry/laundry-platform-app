import Link from 'next/link';
import { Calendar, MapPin, FileText, Clock, Package } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { getRelativeDateDisplay } from '@/lib/utils/date-format';
import type { OrderWithRelations } from '@/types/database';

interface OneTimeOrderCardProps {
  order: OrderWithRelations;
}

function InfoTile({
  icon,
  label,
  children,
  wide = false,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-cream/70 p-4 ${wide ? 'md:col-span-2' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          {icon}
        </span>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-medium-gray">
          {label}
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function OneTimeOrderCard({ order }: OneTimeOrderCardProps) {
  const pickupTimeRange = getPickupTimeRangeLabel();

  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Engangsvask
          </p>
          <h3 className="mt-1 font-serif text-2xl font-semibold text-dark-gray">
            Kommende ordre
          </h3>
          <p className="mt-1 text-sm text-medium-gray">Her er din kommende henting</p>
        </div>
        <StatusBadge variant={getOrderStatusVariant(order.status)}>
          {getOrderStatusLabel(order.status)}
        </StatusBadge>
      </div>

      {/* Primary Order Info - Two Column Grid */}
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {/* Pickup Date */}
        <InfoTile icon={<Calendar className="size-5" />} label="Dato">
          <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
            {getRelativeDateDisplay(order.scheduled_date)}
          </p>
        </InfoTile>

        {/* Pickup Time */}
        <InfoTile icon={<Clock className="size-5" />} label="Tidspunkt">
          <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
            {pickupTimeRange}
          </p>
        </InfoTile>

        {/* Pickup Address */}
        <InfoTile icon={<MapPin className="size-5" />} label="Adresse">
          <p className="font-medium text-dark-gray">{order.street}</p>
          <p className="text-sm text-medium-gray">
            {order.postal_code} {order.city}
          </p>
        </InfoTile>

        {/* Order Number */}
        <InfoTile icon={<Package className="size-5" />} label="Ordrenummer">
          <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
            {order.order_number}
          </p>
        </InfoTile>

        {/* Pickup Instructions */}
        {order.special_instructions_address && (
          <InfoTile icon={<FileText className="size-5" />} label="Henteinstruksjoner" wide>
            <p className="text-sm text-dark-gray">{order.special_instructions_address}</p>
          </InfoTile>
        )}
      </div>

      {/* CTA - View Order Details */}
      <Link
        href={`/orders/details/${order.id}`}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
      >
        Se ordredetaljer
      </Link>
    </div>
  );
}
