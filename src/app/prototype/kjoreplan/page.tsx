'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "Dagens kjøreplan" (cleaner daily route)
//
// Mock-only UX prototype for user testing. No server, no auth, no DB — all data
// is inline (see mockData.ts). Safe to delete this whole folder after testing.
// Route helpers in routeUtils.ts and the Google Maps deep links are production-ready.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import {
  MOCK_CLEANER_START,
  MOCK_ROUTE_START_MINUTES,
  MOCK_STOPS,
} from './mockData';
import {
  buildGoogleMapsUrl,
  computeSchedule,
  estimateRoute,
  formatTime,
  optimizeRoute,
} from './routeUtils';
import { RouteSummary } from './components/RouteSummary';
import { TimelineStop } from './components/TimelineStop';
import { StickyNextBar } from './components/StickyNextBar';

export default function KjoreplanPrototypePage() {
  // Nearest-neighbour route from the cleaner's start point. Stable across renders.
  const orderedStops = useMemo(
    () => optimizeRoute(MOCK_CLEANER_START, MOCK_STOPS),
    []
  );
  const schedule = useMemo(
    () => computeSchedule(MOCK_CLEANER_START, orderedStops, MOCK_ROUTE_START_MINUTES),
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

  // First not-yet-completed stop is the "next" (hero) stop.
  const nextStop = orderedStops.find((s) => !completedIds.has(s.id)) ?? null;
  const remaining = orderedStops.length - completedIds.size;

  const dateLabel = new Date().toLocaleDateString('no-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-soft-gray pb-28">
      {/* Prototype banner */}
      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte ordrer
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/" className="inline-block">
            <span className="text-xl font-bold text-nordic-blue">NooraCare</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <RouteSummary
          dateLabel={dateLabel}
          totalStops={orderedStops.length}
          pickups={pickups}
          deliveries={deliveries}
          completed={completedIds.size}
          estimate={estimate}
          startLabel={MOCK_CLEANER_START.label}
          googleMapsUrl={googleMapsUrl}
        />

        <ol className="list-none">
          {/* Start node */}
          <li className="relative flex gap-3 pb-3">
            <div className="relative flex w-9 shrink-0 justify-center">
              <span className="absolute left-1/2 top-9 -bottom-3 w-px -translate-x-1/2 bg-gray-200" />
              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-dark-gray text-white">
                <MapPin className="size-4" />
              </span>
            </div>
            <div className="flex-1 pt-1.5">
              <p className="text-sm font-medium text-dark-gray">
                Start · {formatTime(MOCK_ROUTE_START_MINUTES)}
              </p>
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
      </main>

      <StickyNextBar nextStop={nextStop} remaining={remaining} />
    </div>
  );
}
