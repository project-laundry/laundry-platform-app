'use client';

import {
  Check,
  Home,
  MapPin,
  Navigation,
  Package,
  Phone,
  Shirt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildSingleDestinationUrl, formatTime } from '../routeUtils';
import type { StopSchedule } from '../routeUtils';
import type { RouteStop } from '../mockData';

type StopState = 'next' | 'upcoming' | 'completed';

interface TimelineStopProps {
  stop: RouteStop;
  position: number;
  schedule: StopSchedule;
  state: StopState;
  isLast: boolean;
  onToggleComplete: (id: string) => void;
}

const TYPE_META = {
  pickup: {
    label: 'Henting',
    Icon: Package,
    chip: 'bg-nordic-blue/10 text-nordic-blue',
  },
  delivery: {
    label: 'Levering',
    Icon: Home,
    chip: 'bg-sea-green/10 text-sea-green',
  },
} as const;

export function TimelineStop({
  stop,
  position,
  schedule,
  state,
  isLast,
  onToggleComplete,
}: TimelineStopProps) {
  const { label, Icon, chip } = TYPE_META[stop.type];
  const eta = formatTime(schedule.arrivalMinutes);

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {/* Connector rail */}
      <div className="relative flex w-9 shrink-0 justify-center">
        {!isLast && (
          <span
            aria-hidden
            className={`absolute left-1/2 top-9 -bottom-3 w-px -translate-x-1/2 ${
              state === 'completed' ? 'bg-sea-green/40' : 'bg-gray-200'
            }`}
          />
        )}
        <span
          className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
            state === 'completed'
              ? 'bg-sea-green text-white'
              : state === 'next'
                ? 'bg-nordic-blue text-white ring-4 ring-nordic-blue/15'
                : 'border-2 border-gray-300 bg-white text-medium-gray'
          }`}
        >
          {state === 'completed' ? <Check className="size-4" /> : position}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {state === 'next' && (
          <div className="rounded-2xl border-2 border-nordic-blue bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}
              >
                <Icon className="size-3.5" />
                {label}
              </span>
              <span className="text-right text-xs text-medium-gray">
                ca. {eta} · {schedule.legKm.toFixed(1)} km
              </span>
            </div>

            <h3 className="font-serif text-xl font-semibold text-dark-gray">
              {stop.customer_name}
            </h3>
            <p className="mt-0.5 flex items-start gap-1 text-sm text-medium-gray">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {stop.street}, {stop.postal_code} {stop.city}
              </span>
            </p>

            {stop.needs_ironing && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-dark-gray">
                <Shirt className="size-3" />
                Stryking
              </span>
            )}

            {stop.special_instructions && (
              <p className="mt-3 rounded-lg bg-nordic-blue/5 px-3 py-2 text-sm text-dark-gray">
                {stop.special_instructions}
              </p>
            )}

            {/* Actions — large, thumb-friendly */}
            <a
              href={buildSingleDestinationUrl(stop)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block"
            >
              <Button variant="hero" size="lg" className="w-full">
                <Navigation className="size-4" />
                Naviger hit
              </Button>
            </a>
            <div className="mt-2 flex gap-2">
              <a href={`tel:${stop.phone.replace(/\s/g, '')}`} className="flex-1">
                <Button variant="outline" className="h-11 w-full">
                  <Phone className="size-4" />
                  Ring
                </Button>
              </a>
              <Button
                className="h-11 flex-1 bg-sea-green text-white hover:bg-sea-green"
                onClick={() => onToggleComplete(stop.id)}
              >
                <Check className="size-4" />
                Fullført
              </Button>
            </div>
          </div>
        )}

        {state === 'upcoming' && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 flex items-center gap-1.5">
                <Icon
                  className={`size-3.5 ${
                    stop.type === 'pickup' ? 'text-nordic-blue' : 'text-sea-green'
                  }`}
                />
                <span className="text-xs font-medium text-medium-gray">
                  {label} · ca. {eta}
                </span>
              </div>
              <p className="truncate font-medium text-dark-gray">
                {stop.customer_name}
              </p>
              <p className="truncate text-sm text-medium-gray">{stop.street}</p>
            </div>
            <a
              href={buildSingleDestinationUrl(stop)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Naviger til ${stop.customer_name}`}
            >
              <Button variant="outline" size="icon" className="size-11">
                <Navigation className="size-4" />
              </Button>
            </a>
          </div>
        )}

        {state === 'completed' && (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-transparent px-3 py-2">
            <p className="truncate text-sm text-medium-gray line-through">
              {stop.customer_name}
            </p>
            <button
              onClick={() => onToggleComplete(stop.id)}
              className="shrink-0 text-sm font-medium text-nordic-blue hover:underline"
            >
              Angre
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
