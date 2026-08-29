'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MapPin, Undo2 } from 'lucide-react';
import type { DriverStop } from '@/lib/services/driver-route';
import {
  buildGoogleMapsUrl,
  computeLegKm,
  estimateRouteKm,
  optimizeStops,
  type Coord,
} from '@/lib/utils/route';
import { completeDriverStopAction, undoDriverStopAction } from '../actions';
import { DriverRouteSummary } from './DriverRouteSummary';
import { DriverTimelineStop } from './DriverTimelineStop';
import { DriverStickyNextBar } from './DriverStickyNextBar';

// Route start when the driver hasn't shared their location: the city centre.
const CITY_START: Record<string, Coord> = {
  bergen: { latitude: 60.3913, longitude: 5.3221 },
  oslo: { latitude: 59.9139, longitude: 10.7522 },
};
const FALLBACK_START: Coord = CITY_START.bergen;

interface LastAction {
  label: string;
  stopType: DriverStop['type'];
  orderIds: string[];
}

interface DriverRouteViewProps {
  stops: DriverStop[];
  // Admins get one pill per city with stops; drivers get [] (city is fixed).
  cityOptions: { key: string; label: string; count: number }[];
  selectedCityKey: string | null;
  // Stored start point from the driver's profile (null → city-centre fallback).
  initialStart: Coord | null;
  startLabel: string;
  skippedOrderNumbers: string[];
}

export function DriverRouteView({
  stops,
  cityOptions,
  selectedCityKey,
  initialStart,
  startLabel,
  skippedOrderNumbers,
}: DriverRouteViewProps) {
  const router = useRouter();
  const [startOverride, setStartOverride] = useState<Coord | null>(null);
  const [locating, setLocating] = useState(false);
  const [busyStopId, setBusyStopId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const start =
    startOverride ??
    initialStart ??
    (selectedCityKey ? (CITY_START[selectedCityKey] ?? FALLBACK_START) : FALLBACK_START);

  const orderedStops = useMemo(() => optimizeStops(start, stops), [start, stops]);
  const legs = useMemo(() => computeLegKm(start, orderedStops), [start, orderedStops]);
  const totalKm = useMemo(() => estimateRouteKm(start, orderedStops), [start, orderedStops]);
  const mapsUrl = useMemo(() => buildGoogleMapsUrl(start, orderedStops), [start, orderedStops]);

  const stopIds = useMemo(() => new Set(orderedStops.map((s) => s.id)), [orderedStops]);
  // A stop is blocked while a prerequisite stop is still in the list (not done).
  const isBlocked = (stop: DriverStop) => stop.dependsOn.some((dep) => stopIds.has(dep));
  const nextStop = orderedStops.find((stop) => !isBlocked(stop)) ?? null;
  const activeStopId =
    expandedId && stopIds.has(expandedId) ? expandedId : (nextStop?.id ?? null);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartOverride({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocating(false);
      },
      () => setLocating(false),
      { maximumAge: 60_000, timeout: 10_000 }
    );
  };

  const handleComplete = async (stop: DriverStop) => {
    setBusyStopId(stop.id);
    setError(null);
    try {
      const orderIds = stop.orders.map((order) => order.id);
      const result = await completeDriverStopAction(stop.type, orderIds);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere stoppet');
        return;
      }
      // Deliveries charge the customer and cannot be undone.
      setLastAction(
        stop.type === 'customer_delivery'
          ? null
          : { label: `${stop.contact_name} · ${stop.street}`, stopType: stop.type, orderIds }
      );
      setExpandedId(null);
      router.refresh();
    } catch {
      setError('En feil oppstod');
    } finally {
      setBusyStopId(null);
    }
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    setError(null);
    const result = await undoDriverStopAction(lastAction.stopType, lastAction.orderIds);
    if (!result.success) {
      setError(result.error || 'Kunne ikke angre');
      return;
    }
    setLastAction(null);
    router.refresh();
  };

  const selectCity = (key: string) => {
    setLastAction(null);
    setExpandedId(null);
    setError(null);
    router.push(`/dashboard/driver?city=${encodeURIComponent(key)}`);
  };

  return (
    <>
      <div className="space-y-5">
        <DriverRouteSummary
          stops={orderedStops}
          cityOptions={cityOptions}
          selectedCityKey={selectedCityKey}
          onSelectCity={selectCity}
          totalKm={totalKm}
          mapsUrl={mapsUrl}
          onUseMyLocation={useMyLocation}
          locating={locating}
          usingOwnLocation={startOverride !== null}
        />

        {skippedOrderNumbers.length > 0 && (
          <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>Ordre uten renser kunne ikke rutes: #{skippedOrderNumbers.join(', #')}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {lastAction && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-cream-dark/80 bg-warm-white/80 px-4 py-2.5 text-sm">
            <p className="min-w-0 truncate text-medium-gray">Fullført: {lastAction.label}</p>
            <button
              type="button"
              onClick={handleUndo}
              className="inline-flex shrink-0 items-center gap-1.5 font-medium text-nordic-blue hover:underline"
            >
              <Undo2 className="size-4" />
              Angre
            </button>
          </div>
        )}

        {orderedStops.length === 0 ? (
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
            <p className="font-medium text-dark-gray">Ingen stopp i dag</p>
            <p className="mt-1 text-sm text-medium-gray">
              Hentinger og leveringer dukker opp her når de er klare.
            </p>
          </div>
        ) : (
          <ol className="list-none">
            {/* Start node */}
            <li className="relative flex gap-3 pb-3">
              <div className="relative flex w-9 shrink-0 justify-center">
                <span className="absolute left-1/2 top-9 -bottom-3 w-px -translate-x-1/2 bg-cream-dark" />
                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-dark-gray text-white">
                  <MapPin className="size-4" />
                </span>
              </div>
              <div className="flex-1 pt-1.5">
                <p className="text-sm font-medium text-dark-gray">Start</p>
                <p className="text-sm text-medium-gray">
                  {startOverride ? 'Din posisjon' : startLabel}
                </p>
              </div>
            </li>

            {orderedStops.map((stop, index) => (
              <DriverTimelineStop
                key={stop.id}
                stop={stop}
                position={index + 1}
                legKm={legs[index]}
                isExpanded={stop.id === activeStopId}
                isBlocked={isBlocked(stop)}
                isBusy={busyStopId === stop.id}
                isLast={index === orderedStops.length - 1}
                onExpand={() => setExpandedId(stop.id)}
                onComplete={() => handleComplete(stop)}
              />
            ))}
          </ol>
        )}
      </div>

      {orderedStops.length > 0 && (
        <DriverStickyNextBar nextStop={nextStop} remaining={orderedStops.length} />
      )}
    </>
  );
}
