'use client';

// Body of the "Dagens kjøreplan" flow — no page chrome (banner/header), so it
// can render both standalone (kjoreplan/page.tsx) and inside the dashboard tabs.
// Owns its own state; reports stops-remaining up via onRemainingChange so the
// dashboard tab can show a live badge.

import { useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { MOCK_CLEANER_START, MOCK_STOPS } from './mockData';
import {
  buildGoogleMapsUrl,
  computeSchedule,
  estimateRoute,
  optimizeRoute,
} from './routeUtils';
import { RouteSummary } from './components/RouteSummary';
import { TimelineStop } from './components/TimelineStop';
import { StickyNextBar } from './components/StickyNextBar';

interface KjoreplanViewProps {
  onRemainingChange?: (remaining: number) => void;
  // Suppresses the big standalone hero title when rendered in the dashboard tabs.
  embedded?: boolean;
}

export function KjoreplanView({ onRemainingChange, embedded = false }: KjoreplanViewProps) {
  // Nearest-neighbour route from the cleaner's start point. Stable across renders.
  const orderedStops = useMemo(
    () => optimizeRoute(MOCK_CLEANER_START, MOCK_STOPS),
    []
  );
  const schedule = useMemo(
    () => computeSchedule(MOCK_CLEANER_START, orderedStops),
    [orderedStops]
  );
  const estimate = useMemo(
    () => estimateRoute(MOCK_CLEANER_START, orderedStops),
    [orderedStops]
  );
  const googleMapsUrl = useMemo(
    () => buildGoogleMapsUrl(MOCK_CLEANER_START, orderedStops),
    [orderedStops]
  );

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pickups = orderedStops.filter((s) => s.type === 'pickup').length;
  const deliveries = orderedStops.length - pickups;

  const nextStop = orderedStops.find((s) => !completedIds.has(s.id)) ?? null;
  const remaining = orderedStops.length - completedIds.size;

  useEffect(() => {
    onRemainingChange?.(remaining);
  }, [remaining, onRemainingChange]);

  const dateLabel = new Date().toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <>
      <div className="space-y-5">
        <RouteSummary
          dateLabel={dateLabel}
          totalStops={orderedStops.length}
          pickups={pickups}
          deliveries={deliveries}
          completed={completedIds.size}
          estimate={estimate}
          startLabel={MOCK_CLEANER_START.label}
          googleMapsUrl={googleMapsUrl}
          embedded={embedded}
        />

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
              <p className="text-sm text-medium-gray">{MOCK_CLEANER_START.label}</p>
            </div>
          </li>

          {orderedStops.map((stop, index) => {
            const isCompleted = completedIds.has(stop.id);
            const state = isCompleted
              ? 'completed'
              : stop.id === nextStop?.id
                ? 'next'
                : 'upcoming';
            return (
              <TimelineStop
                key={stop.id}
                stop={stop}
                position={index + 1}
                schedule={schedule[index]}
                state={state}
                isLast={index === orderedStops.length - 1}
                onToggleComplete={toggleComplete}
              />
            );
          })}
        </ol>
      </div>

      <StickyNextBar nextStop={nextStop} remaining={remaining} />
    </>
  );
}
