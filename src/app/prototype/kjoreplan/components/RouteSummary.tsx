'use client';

import { ArrowDownToLine, Home, Map as MapIcon } from 'lucide-react';
import type { RouteEstimate } from '../routeUtils';

interface RouteSummaryProps {
  dateLabel: string;
  totalStops: number;
  pickups: number;
  deliveries: number;
  completed: number;
  estimate: RouteEstimate;
  startLabel: string;
  googleMapsUrl: string;
}

export function RouteSummary({
  dateLabel,
  totalStops,
  pickups,
  deliveries,
  completed,
  estimate,
  startLabel,
  googleMapsUrl,
}: RouteSummaryProps) {
  const pct = totalStops === 0 ? 0 : (completed / totalStops) * 100;

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-soft">
      {/* Nordic gradient header band */}
      <div className="bg-gradient-to-br from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] px-5 pb-5 pt-4 text-white">
        <p className="text-xs font-medium uppercase tracking-wider text-white/70">
          {dateLabel}
        </p>
        <h1 className="font-serif text-2xl font-semibold">Dagens kjøreplan</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
          <span className="inline-flex items-center gap-1.5">
            <ArrowDownToLine className="size-4" /> {pickups} henting
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Home className="size-4" /> {deliveries} levering
          </span>
          <span className="text-white/70">
            ~{estimate.km.toFixed(1)} km · ~{estimate.minutes} min
          </span>
        </div>
      </div>

      {/* Progress + planning link */}
      <div className="px-5 py-4">
        <div className="mb-1.5 flex justify-between text-xs text-medium-gray">
          <span>Fremdrift</span>
          <span className="font-medium text-dark-gray">
            {completed} av {totalStops} fullført
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-sea-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-medium-gray">
            Start: {startLabel}
          </p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-nordic-blue hover:underline"
          >
            <MapIcon className="size-4" />
            Se hele ruten
          </a>
        </div>
      </div>
    </section>
  );
}
