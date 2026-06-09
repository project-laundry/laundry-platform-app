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
}

export function VaskeromView({ onActiveChange }: VaskeromViewProps) {
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
    <div className="space-y-4">
      {/* Console summary */}
      <section className="animate-fade-in rounded-2xl bg-dark-gray p-5 text-white shadow-card">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">
          I dag
        </p>
        <h2 className="font-serif text-2xl font-semibold">Vaskerom</h2>
        <p className="mt-0.5 text-sm text-white/70">
          {inProgress} vaskelaster fra {orderCount} {orderCount === 1 ? 'ordre' : 'ordrer'}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-white/50">
          <Wind className="size-3.5" />
          Tørk: klærne henges til lufttørk
        </p>
      </section>

      {/* Stage sections */}
      {STAGES.map((cfg, i) => {
        const items = loadsInStage(loads, cfg.key);
        const groups = groupByOrder(items);
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
            </div>

            {groups.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-medium-gray">
                Ingen plagg her
              </p>
            ) : (
              <div className="space-y-2">
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
