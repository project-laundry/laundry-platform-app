import Link from 'next/link';
import { Calendar, MapPin, FileText, Clock } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
  getSubscriptionFrequencyLabel,
} from '@/lib/utils/subscription-status';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { getRelativeDateDisplay } from '@/lib/utils/date-format';
import type { Subscription, OrderWithRelations } from '@/types/database';

interface SubscriptionOverviewCardProps {
  subscription: Subscription;
  nextOrder?: OrderWithRelations | null;
}

function InfoTile({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-cream/70 p-4">
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
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            {getSubscriptionFrequencyLabel(frequency)}
          </p>
          <h3 className="mt-1 font-serif text-2xl font-semibold text-dark-gray">
            Ditt abonnement
          </h3>
          <p className="mt-1 text-sm text-medium-gray">Her er din kommende henting</p>
        </div>
        <StatusBadge variant={getSubscriptionStatusVariant(status)}>
          {getSubscriptionStatusLabel(status)}
        </StatusBadge>
      </div>

      {nextOrder ? (
        <>
          {/* Primary Order Info - Two Column Grid */}
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {/* Pickup Date */}
            <InfoTile icon={<Calendar className="size-5" />} label="Dato">
              <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
                {getRelativeDateDisplay(nextOrder.scheduled_date)}
              </p>
            </InfoTile>

            {/* Pickup Time */}
            <InfoTile icon={<Clock className="size-5" />} label="Tidspunkt">
              <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
                {pickupTimeRange}
              </p>
            </InfoTile>

            {/* Pickup Address */}
            {address && (
              <InfoTile icon={<MapPin className="size-5" />} label="Adresse">
                <p className="font-medium text-dark-gray">{address.street}</p>
                <p className="text-sm text-medium-gray">
                  {address.postal_code} {address.city}
                </p>
              </InfoTile>
            )}

            {/* Pickup Instructions */}
            {address?.special_instructions && (
              <InfoTile icon={<FileText className="size-5" />} label="Henteinstruksjoner">
                <p className="text-sm text-dark-gray">{address.special_instructions}</p>
              </InfoTile>
            )}
          </div>

          {/* CTA - View Order Details */}
          <Link
            href={`/orders/details/${nextOrder.id}`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Se ordredetaljer
          </Link>
        </>
      ) : (
        <>
          {/* No upcoming order */}
          <div className="mt-6 rounded-2xl bg-cream/70 p-8 text-center">
            <p className="font-serif text-lg font-semibold text-medium-gray">
              Ingen kommende henting planlagt
            </p>
          </div>

          {/* CTA - Create New Order */}
          <Link
            href="/orders/wash"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Bestill ny henting
          </Link>
        </>
      )}
    </div>
  );
}
