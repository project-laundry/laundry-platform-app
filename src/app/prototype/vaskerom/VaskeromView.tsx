'use client';

// Body of the "Vaskerom" cleaning flow — no page chrome, so it renders both
// standalone (vaskerom/page.tsx) and inside the dashboard tabs. Owns its loads +
// machine timer; reports the "needs action" count up via onNeedsActionChange so
// the dashboard tab can pulse a live alert badge even while this tab is hidden.

import { useEffect, useMemo, useState } from 'react';
import {
  Inbox,
  PackageCheck,
  Shirt,
  TriangleAlert,
  WashingMachine,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { INITIAL_LOADS } from './mockData';
import {
  advanceBlockedReason,
  freeMachines,
  isFinished,
  loadsInStage,
  NEXT_STAGE,
  pickFreeMachine,
  STAGE_BY_KEY,
  STAGES,
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

  // Tick every second: decrement any running machine cycle (stops at 0).
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

  const advance = (id: string) => {
    setLoads((prev) => {
      const load = prev.find((l) => l.id === id);
      if (!load) return prev;
      const next = NEXT_STAGE[load.stage];
      if (!next || advanceBlockedReason(load, prev)) return prev;

      const nextCfg = STAGE_BY_KEY[next];
      const enteringMachine = nextCfg.kind === 'machine';
      const machineLabel = enteringMachine ? pickFreeMachine(prev, next) : null;
      const cycle = enteringMachine ? nextCfg.durationSec ?? null : null;

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

  // Finished machine loads are pulled to the top "needs action" zone.
  const needsAction = useMemo(() => loads.filter(isFinished), [loads]);
  const needsActionCount = needsAction.length;
  const inProgress = loads.filter((l) => l.stage !== 'klar').length;
  const vaskFree = freeMachines(loads, 'vask');
  const torkFree = freeMachines(loads, 'tork');

  useEffect(() => {
    onNeedsActionChange?.(needsActionCount);
  }, [needsActionCount, onNeedsActionChange]);

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

        <div className="mt-4 flex flex-wrap gap-2">
          <MachineChip
            label="Vaskemaskiner"
            free={vaskFree}
            total={STAGE_BY_KEY.vask.capacity ?? 0}
          />
          <MachineChip
            label="Tørketromler"
            free={torkFree}
            total={STAGE_BY_KEY.tork.capacity ?? 0}
          />
        </div>
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
                canAdvance={!advanceBlockedReason(load, loads)}
                blockedReason={advanceBlockedReason(load, loads)}
                onAdvance={advance}
                onForceFinish={forceFinish}
              />
            ))}
          </div>
        </section>
      )}

      {/* Stage sections */}
      {STAGES.map((cfg, i) => {
        // Finished machine loads live in the top zone, not in their stage section.
        const items = loadsInStage(loads, cfg.key).filter((l) => !isFinished(l));
        const Icon = STAGE_ICON[cfg.key];
        const free = cfg.kind === 'machine' ? freeMachines(loads, cfg.key) : null;

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
              {free !== null && (
                <span className="ml-auto text-xs text-medium-gray">
                  {free} av {cfg.capacity} ledig
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
                    canAdvance={!advanceBlockedReason(load, loads)}
                    blockedReason={advanceBlockedReason(load, loads)}
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

function MachineChip({
  label,
  free,
  total,
}: {
  label: string;
  free: number;
  total: number;
}) {
  const full = free <= 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        full ? 'bg-white/10 text-white/60' : 'bg-sea-green/20 text-white'
      }`}
    >
      <span
        className={`size-2 rounded-full ${full ? 'bg-white/40' : 'bg-sea-green'}`}
      />
      {label}: {full ? 'fulle' : `${free} av ${total} ledig`}
    </span>
  );
}
