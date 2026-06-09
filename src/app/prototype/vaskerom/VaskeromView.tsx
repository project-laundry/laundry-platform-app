'use client';

// Body of the "Vaskerom" cleaning flow — no page chrome, so it renders both
// standalone (vaskerom/page.tsx) and inside the dashboard tabs. Owns its loads,
// the editable washing-machine count, and the wash timer; reports the "needs
// action" count up via onNeedsActionChange so the dashboard tab can pulse a live
// alert badge even while this tab is hidden.

import { useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  Minus,
  PackageCheck,
  Plus,
  Shirt,
  TriangleAlert,
  WashingMachine,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { DEFAULT_WASHER_COUNT, INITIAL_LOADS } from './mockData';
import {
  canStartWash,
  DEFAULT_WASH_MIN,
  freeWashers,
  isFinished,
  loadsInStage,
  MAX_WASHERS,
  NEXT_STAGE,
  pickFreeWasher,
  STAGES,
  washersInUse,
  type LaundryLoad,
  type Stage,
} from './washroom';
import { LoadCard } from './components/LoadCard';

const STAGE_ICON: Record<Stage, LucideIcon> = {
  mottatt: Inbox,
  vask: WashingMachine,
  tork: Wind,
  bretting: Shirt,
  klar: PackageCheck,
};

interface VaskeromViewProps {
  onNeedsActionChange?: (count: number) => void;
}

export function VaskeromView({ onNeedsActionChange }: VaskeromViewProps) {
  const [loads, setLoads] = useState<LaundryLoad[]>(INITIAL_LOADS);
  const [washerCount, setWasherCount] = useState(DEFAULT_WASHER_COUNT);

  // Tick every second: decrement the running wash cycle (stops at 0).
  useEffect(() => {
    const id = setInterval(() => {
      setLoads((prev) =>
        prev.map((l) =>
          l.remainingSec !== null && l.remainingSec > 0
            ? { ...l, remainingSec: l.remainingSec - 1 }
            : l
        )
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const advance = (id: string, durationSec?: number) => {
    setLoads((prev) => {
      const load = prev.find((l) => l.id === id);
      if (!load) return prev;
      const next = NEXT_STAGE[load.stage];
      if (!next) return prev;
      if (load.stage === 'mottatt' && !canStartWash(prev, washerCount)) return prev;

      const enteringVask = next === 'vask';
      const machineLabel = enteringVask ? pickFreeWasher(prev, washerCount) : null;
      const cycle = enteringVask ? durationSec ?? DEFAULT_WASH_MIN * 60 : null;

      return prev.map((l) =>
        l.id === id
          ? { ...l, stage: next, machineLabel, remainingSec: cycle, totalSec: cycle }
          : l
      );
    });
  };

  const forceFinish = (id: string) => {
    setLoads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, remainingSec: 0 } : l))
    );
  };

  // Finished washes are pulled to the top "needs action" zone.
  const needsAction = useMemo(() => loads.filter(isFinished), [loads]);
  const needsActionCount = needsAction.length;
  const inProgress = loads.filter((l) => l.stage !== 'klar').length;

  const inUse = washersInUse(loads);
  const free = freeWashers(loads, washerCount);
  const minWashers = Math.max(1, inUse); // can't have fewer machines than are running

  useEffect(() => {
    onNeedsActionChange?.(needsActionCount);
  }, [needsActionCount, onNeedsActionChange]);

  const blockReason = (load: LaundryLoad): string | null =>
    load.stage === 'mottatt' && !canStartWash(loads, washerCount)
      ? 'Vaskemaskinen er opptatt'
      : null;

  return (
    <div className="space-y-4">
      {/* Console summary */}
      <section className="animate-fade-in rounded-2xl bg-dark-gray p-5 text-white shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">
          I dag
        </p>
        <h2 className="font-serif text-2xl font-semibold">Vaskerom</h2>
        <p className="mt-0.5 text-sm text-white/70">
          {inProgress} plagg under arbeid
        </p>

        {/* Editable washing-machine count */}
        <div className="mt-4 flex items-center gap-3">
          <WashingMachine className="size-4 text-white/70" />
          <span className="text-sm text-white/80">Vaskemaskiner</span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Færre vaskemaskiner"
              onClick={() => setWasherCount((c) => Math.max(minWashers, c - 1))}
              disabled={washerCount <= minWashers}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="w-5 text-center font-mono text-lg tabular-nums">
              {washerCount}
            </span>
            <button
              aria-label="Flere vaskemaskiner"
              onClick={() => setWasherCount((c) => Math.min(MAX_WASHERS, c + 1))}
              disabled={washerCount >= MAX_WASHERS}
              className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <span className="ml-auto text-xs text-white/60">
            {free > 0 ? `${free} ledig` : 'opptatt'}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
          <Wind className="size-3.5" />
          Tørk: klærne henges til lufttørk – ingen maskin
        </p>
      </section>

      {/* Needs action now */}
      {needsAction.length > 0 && (
        <section className="animate-fade-in rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-700">
            <TriangleAlert className="size-5" />
            Krever handling nå
            <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
              {needsAction.length}
            </span>
          </h3>
          <div className="space-y-2">
            {needsAction.map((load) => (
              <LoadCard
                key={load.id}
                load={load}
                canAdvance={!blockReason(load)}
                blockedReason={blockReason(load)}
                onAdvance={advance}
                onForceFinish={forceFinish}
              />
            ))}
          </div>
        </section>
      )}

      {/* Stage sections */}
      {STAGES.map((cfg, i) => {
        // Finished washes live in the top zone, not in their stage section.
        const items = loadsInStage(loads, cfg.key).filter((l) => !isFinished(l));
        const Icon = STAGE_ICON[cfg.key];

        return (
          <section
            key={cfg.key}
            className="animate-fade-in"
            style={{ animationDelay: `${0.05 * (i + 1)}s` }}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <Icon className="size-4 text-medium-gray" />
              <h3 className="text-sm font-semibold uppercase tracking-wide text-medium-gray">
                {cfg.label}
              </h3>
              <span className="text-xs text-medium-gray">({items.length})</span>
              {cfg.key === 'vask' && (
                <span className="ml-auto text-xs text-medium-gray">
                  {free} av {washerCount} ledig
                </span>
              )}
            </div>

            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-medium-gray">
                Ingen plagg her
              </p>
            ) : (
              <div className="space-y-2">
                {items.map((load) => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    canAdvance={!blockReason(load)}
                    blockedReason={blockReason(load)}
                    onAdvance={advance}
                    onForceFinish={forceFinish}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
