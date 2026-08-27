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
  // Inside the dashboard the tab already says "Kjøreplan", so we drop the big
  // standalone hero title and show the date as a modest label instead.
  embedded?: boolean;
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
  embedded = false,
}: RouteSummaryProps) {
  const pct = totalStops === 0 ? 0 : (completed / totalStops) * 100;
  const dateCapitalized = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 duration-700">
      {/* Hero — mirrors the onboarding flow: sea-green eyebrow + serif title. */}
      {embedded ? (
        <p className="font-medium text-dark-gray">{dateCapitalized}</p>
      ) : (
        <>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            {dateLabel}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Dagens kjøreplan
          </h1>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-medium-gray">
        <span className="inline-flex items-center gap-1.5">
          <ArrowDownToLine className="size-4 text-nordic-blue" /> {pickups} henting
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Home className="size-4 text-sea-green" /> {deliveries} levering
        </span>
        <span className="text-medium-gray/80">
          ~{estimate.km.toFixed(1)} km
        </span>
      </div>

      {/* Progress + planning link */}
      <div className="mt-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="mb-1.5 flex justify-between text-xs text-medium-gray">
          <span>Fremdrift</span>
          <span className="font-medium text-dark-gray">
            {completed} av {totalStops} fullført
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-cream-dark/60">
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
