'use client';

// Body of the "Vaskerom" cleaning flow — no page chrome, so it renders both
// standalone (vaskerom/page.tsx) and inside the dashboard tabs. A manual stage
// board: each load advances one tap at a time, no machine limits, no timers.
// Reports the active (not-yet-Klar) count up via onActiveChange for the tab badge.

import { useEffect, useState } from 'react';
import {
  Inbox,
  PackageCheck,
  Shirt,
  WashingMachine,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { INITIAL_LOADS } from './mockData';
import {
  groupByOrder,
  loadsInStage,
  NEXT_STAGE,
  STAGES,
  type Stage,
  type WashLoad,
} from './washroom';
import { OrderGroupCard } from './components/OrderGroupCard';

const STAGE_ICON: Record<Stage, LucideIcon> = {
  mottatt: Inbox,
  vask: WashingMachine,
  tork: Wind,
  bretting: Shirt,
  klar: PackageCheck,
};

interface VaskeromViewProps {
  onActiveChange?: (count: number) => void;
  // When rendered inside the dashboard tabs the tab already says "Vaskerom",
  // so we drop the big standalone hero title and keep just the status line.
  embedded?: boolean;
}

export function VaskeromView({ onActiveChange, embedded = false }: VaskeromViewProps) {
  const [loads, setLoads] = useState<WashLoad[]>(INITIAL_LOADS);

  const advance = (id: string) => {
    setLoads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const next = NEXT_STAGE[l.stage];
        return next ? { ...l, stage: next } : l;
      })
    );
  };

  const activeLoads = loads.filter((l) => l.stage !== 'klar');
  const inProgress = activeLoads.length;
  const orderCount = new Set(activeLoads.map((l) => l.orderId)).size;

  useEffect(() => {
    onActiveChange?.(inProgress);
  }, [inProgress, onActiveChange]);

  return (
    <div className="space-y-6">
      {/* Hero — mirrors the onboarding flow: sea-green eyebrow + serif title.
          Suppressed when embedded in the dashboard (the tab is the title). */}
      <section className="animate-in fade-in slide-in-from-bottom-3 duration-700">
        {!embedded && (
          <>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
              I dag
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
              Vaskerom
            </h1>
          </>
        )}
        <p className={`text-medium-gray ${embedded ? '' : 'mt-3'}`}>
          {inProgress} vaskelaster fra {orderCount}{' '}
          {orderCount === 1 ? 'ordre' : 'ordrer'} underveis.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
          <Wind className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p>Klærne henges til lufttørk — derfor tar tørk litt tid.</p>
        </div>
      </section>

      {/* Stage sections */}
      {STAGES.map((cfg, i) => {
        const items = loadsInStage(loads, cfg.key);
        const groups = groupByOrder(items);
        const Icon = STAGE_ICON[cfg.key];

        return (
          <section
            key={cfg.key}
            className="animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: `${80 * (i + 1)}ms` }}
          >
            <div className="mb-3 flex items-center gap-3 px-1">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Icon className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
                {cfg.label}
              </h2>
              <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-cream-dark/60 px-2 py-0.5 text-xs font-medium text-medium-gray">
                {items.length}
              </span>
            </div>

            {groups.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-cream-dark px-3 py-5 text-center text-xs text-medium-gray">
                Ingen plagg her
              </p>
            ) : (
              <div className="space-y-2.5">
                {groups.map((group) => (
                  <OrderGroupCard
                    key={group.orderId}
                    group={group}
                    onAdvance={advance}
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
