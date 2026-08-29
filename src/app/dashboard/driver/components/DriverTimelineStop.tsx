'use client';

import { useState } from 'react';
import {
  Check,
  Home,
  Lock,
  MapPin,
  Navigation,
  Package,
  Phone,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildSingleDestinationUrl } from '@/lib/utils/route';
import type { DriverStop } from '@/lib/services/driver-route';

interface DriverTimelineStopProps {
  stop: DriverStop;
  position: number;
  legKm: number | null;
  isExpanded: boolean;
  isBlocked: boolean;
  isBusy: boolean;
  isLast: boolean;
  onExpand: () => void;
  onComplete: () => void;
}

const TYPE_META: Record<
  DriverStop['type'],
  { label: string; Icon: LucideIcon; chip: string; completeLabel: string }
> = {
  customer_pickup: {
    label: 'Henting hos kunde',
    Icon: Package,
    chip: 'bg-nordic-blue/10 text-nordic-blue',
    completeLabel: 'Hentet',
  },
  cleaner_dropoff: {
    label: 'Levering til renser',
    Icon: WashingMachine,
    chip: 'bg-nordic-blue/10 text-nordic-blue',
    completeLabel: 'Levert til renser',
  },
  cleaner_collect: {
    label: 'Henting hos renser',
    Icon: WashingMachine,
    chip: 'bg-sea-green/10 text-sea-green',
    completeLabel: 'Hentet hos renser',
  },
  customer_delivery: {
    label: 'Levering til kunde',
    Icon: Home,
    chip: 'bg-sea-green/10 text-sea-green',
    completeLabel: 'Levert',
  },
};

export function DriverTimelineStop({
  stop,
  position,
  legKm,
  isExpanded,
  isBlocked,
  isBusy,
  isLast,
  onExpand,
  onComplete,
}: DriverTimelineStopProps) {
  const [showDeliveryConfirm, setShowDeliveryConfirm] = useState(false);
  const { label, Icon, chip, completeLabel } = TYPE_META[stop.type];

  const isDelivery = stop.type === 'customer_delivery';
  const coord =
    stop.latitude !== null && stop.longitude !== null
      ? { latitude: stop.latitude, longitude: stop.longitude }
      : null;

  const handlePrimary = () => {
    if (isDelivery && !showDeliveryConfirm) {
      setShowDeliveryConfirm(true);
      return;
    }
    setShowDeliveryConfirm(false);
    onComplete();
  };

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {/* Connector rail */}
      <div className="relative flex w-9 shrink-0 justify-center">
        {!isLast && (
          <span
            aria-hidden
            className="absolute left-1/2 top-9 -bottom-3 w-px -translate-x-1/2 bg-cream-dark"
          />
        )}
        <span
          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            isExpanded
              ? 'bg-nordic-blue text-white ring-4 ring-nordic-blue/15'
              : 'border-2 border-cream-dark bg-warm-white text-medium-gray'
          }`}
        >
          {position}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {isExpanded ? (
          <div className="rounded-3xl border-2 border-nordic-blue bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}
              >
                <Icon className="size-3.5" />
                {label}
              </span>
              <span className="flex items-center gap-2 text-right text-xs text-medium-gray">
                {stop.overdue && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                    Forsinket
                  </span>
                )}
                {legKm !== null && <span>{legKm.toFixed(1)} km</span>}
              </span>
            </div>

            <h3 className="font-serif text-xl font-semibold text-dark-gray">{stop.contact_name}</h3>
            <p className="mt-0.5 flex items-start gap-1 text-sm text-medium-gray">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {stop.street}, {stop.postal_code} {stop.city}
              </span>
            </p>
            {stop.estimated_delivery && (
              <p className="mt-1 text-xs text-medium-gray">
                Estimert levering{' '}
                {new Date(stop.estimated_delivery).toLocaleDateString('no-NO', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            )}

            {/* Orders at this stop */}
            <ul className="mt-3 space-y-1 rounded-2xl bg-cream/70 px-3 py-2 text-sm text-dark-gray">
              {stop.orders.map((order) => (
                <li key={order.id} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate">
                    #{order.order_number} · {order.customer_name}
                  </span>
                  {order.contents_label && (
                    <span className="shrink-0 text-xs text-medium-gray">
                      {order.contents_label}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {stop.special_instructions && (
              <p className="mt-2 rounded-2xl bg-cream/70 px-3 py-2 text-sm text-dark-gray">
                {stop.special_instructions}
              </p>
            )}

            {coord && (
              <a
                href={buildSingleDestinationUrl(coord)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block"
              >
                <Button
                  size="lg"
                  className="w-full rounded-full bg-nordic-blue text-white shadow-soft hover:bg-nordic-blue"
                >
                  <Navigation className="size-4" />
                  Naviger hit
                </Button>
              </a>
            )}

            {showDeliveryConfirm ? (
              <div className="mt-3 space-y-3 rounded-2xl bg-cream/70 px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-300">
                <p className="text-sm text-dark-gray">
                  Bekreft at vasken er levert til kunden. Dette kan ikke angres.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-full"
                    onClick={() => setShowDeliveryConfirm(false)}
                    disabled={isBusy}
                  >
                    Avbryt
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-full bg-sea-green text-white hover:bg-sea-green"
                    onClick={handlePrimary}
                    disabled={isBusy}
                  >
                    <Check className="size-4" />
                    {isBusy ? 'Fullfører...' : 'Bekreft levering'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className={`${coord ? 'mt-2' : 'mt-4'} flex gap-2`}>
                {stop.phone && (
                  <a href={`tel:${stop.phone.replace(/\s/g, '')}`} className="flex-1">
                    <Button variant="outline" className="h-11 w-full rounded-full">
                      <Phone className="size-4" />
                      Ring
                    </Button>
                  </a>
                )}
                <Button
                  className="h-11 flex-1 rounded-full bg-sea-green text-white hover:bg-sea-green"
                  onClick={handlePrimary}
                  disabled={isBusy || isBlocked}
                >
                  <Check className="size-4" />
                  {isBusy ? 'Lagrer...' : completeLabel}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={isBlocked ? undefined : onExpand}
            className={`flex items-center gap-3 rounded-2xl border border-cream-dark/80 p-3 ${
              isBlocked ? 'bg-cream/60' : 'cursor-pointer bg-warm-white/70'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                <Icon
                  className={`size-3.5 ${
                    stop.type === 'customer_pickup' || stop.type === 'cleaner_dropoff'
                      ? 'text-nordic-blue'
                      : 'text-sea-green'
                  }`}
                />
                <span className="text-xs font-medium text-medium-gray">{label}</span>
                {isBlocked && <Lock className="size-3 text-medium-gray" />}
                {stop.overdue && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                    Forsinket
                  </span>
                )}
              </div>
              <p className="truncate font-medium text-dark-gray">{stop.contact_name}</p>
              <p className="truncate text-sm text-medium-gray">
                {stop.street}
                {stop.orders.length > 1 ? ` · ${stop.orders.length} ordrer` : ''}
              </p>
            </div>
            {coord && (
              <a
                href={buildSingleDestinationUrl(coord)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Naviger til ${stop.contact_name}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="icon" className="size-11 rounded-full">
                  <Navigation className="size-4" />
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
