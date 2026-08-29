'use client';

import {
  ArrowDownToLine,
  Home,
  LocateFixed,
  Map as MapIcon,
  WashingMachine,
} from 'lucide-react';
import type { DriverStop } from '@/lib/services/driver-route';

interface DriverRouteSummaryProps {
  stops: DriverStop[];
  cityOptions: { key: string; label: string; count: number }[];
  selectedCityKey: string | null;
  onSelectCity: (key: string) => void;
  totalKm: number;
  mapsUrl: string | null;
  onUseMyLocation: () => void;
  locating: boolean;
  usingOwnLocation: boolean;
}

export function DriverRouteSummary({
  stops,
  cityOptions,
  selectedCityKey,
  onSelectCity,
  totalKm,
  mapsUrl,
  onUseMyLocation,
  locating,
  usingOwnLocation,
}: DriverRouteSummaryProps) {
  const pickups = stops.filter((s) => s.type === 'customer_pickup').length;
  const deliveries = stops.filter((s) => s.type === 'customer_delivery').length;
  const cleanerStops = stops.filter(
    (s) => s.type === 'cleaner_dropoff' || s.type === 'cleaner_collect'
  ).length;

  const dateLabel = new Date().toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <section className="animate-in fade-in slide-in-from-bottom-3 duration-700">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">{dateLabel}</p>
      <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight text-dark-gray">
        Dagens kjøreplan
      </h2>

      {cityOptions.length > 1 && (
        <div className="mt-3 inline-flex rounded-full border border-cream-dark bg-white p-1">
          {cityOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelectCity(option.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                option.key === selectedCityKey
                  ? 'bg-sea-green/10 text-sea-green'
                  : 'text-medium-gray hover:text-dark-gray'
              }`}
            >
              {option.label}
              <span className="inline-flex items-center rounded-full bg-cream-dark/60 px-2 py-0.5 text-xs font-medium tabular-nums text-medium-gray">
                {option.count}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-medium-gray">
        <span className="inline-flex items-center gap-1.5">
          <ArrowDownToLine className="size-4 text-nordic-blue" /> {pickups} henting
        </span>
        <span className="inline-flex items-center gap-1.5">
          <WashingMachine className="size-4 text-dark-gray" /> {cleanerStops} renseri
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Home className="size-4 text-sea-green" /> {deliveries} levering
        </span>
        {totalKm > 0 && <span className="text-medium-gray/80">~{totalKm.toFixed(1)} km</span>}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-3.5 shadow-[var(--shadow-card)] backdrop-blur">
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={locating}
          className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-nordic-blue hover:underline disabled:opacity-60"
        >
          <LocateFixed className="size-4 shrink-0" />
          {locating
            ? 'Finner posisjon...'
            : usingOwnLocation
              ? 'Bruker din posisjon'
              : 'Start fra min posisjon'}
        </button>
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-nordic-blue hover:underline"
          >
            <MapIcon className="size-4" />
            Se hele ruten
          </a>
        )}
      </div>
    </section>
  );
}
