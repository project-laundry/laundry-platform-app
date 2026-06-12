'use client';

import {
  ArrowRight,
  BedDouble,
  Check,
  PackageCheck,
  Shirt,
  WashingMachine,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { ADVANCE_LABEL, type LoadType, type OrderGroup } from '../washroom';

interface OrderGroupCardProps {
  group: OrderGroup;
  onAdvance: (id: string) => void;
}

// Icon per load type — we sort by what was ordered (clothes vs bedding), not
// by colour. Bedding is always its own wash.
const LOAD_ICON: Record<LoadType, LucideIcon> = {
  Klær: Shirt,
  Sengetøy: BedDouble,
};

// All loads in a group share a stage (groups are formed within a stage section).
export function OrderGroupCard({ group, onAdvance }: OrderGroupCardProps) {
  const stage = group.loads[0].stage;

  const accent =
    stage === 'vask'
      ? 'border-l-sea-green'
      : stage === 'tork'
        ? 'border-l-nordic-blue-light'
        : stage === 'bretting'
          ? 'border-l-nordic-blue'
          : stage === 'klar'
            ? 'border-l-sea-green'
            : 'border-l-cream-dark';

  return (
    <div
      className={`rounded-3xl border border-l-4 border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur ${accent}`}
    >
      {/* Order header — shown once for the whole group */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight text-dark-gray">
            {group.customer_name}
          </p>
          <p className="font-mono text-xs text-medium-gray">
            {group.order_number}
          </p>
        </div>
        {group.loads.length > 1 && (
          <span className="shrink-0 rounded-full bg-cream px-2.5 py-0.5 text-xs font-medium text-medium-gray">
            {group.loads.length} laster
          </span>
        )}
      </div>

      {/* Stage hint — same for every load in the group */}
      {stage === 'vask' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-sea-green">
          <WashingMachine className="size-3.5" />
          Vasker nå
        </p>
      )}
      {stage === 'tork' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-nordic-blue">
          <Wind className="size-3.5" />
          Henger til lufttørk
        </p>
      )}

      {/* One row per wash load */}
      <ul className="mt-3 divide-y divide-cream-dark/60 border-t border-cream-dark/60">
        {group.loads.map((load) => {
          const LoadIcon = LOAD_ICON[load.loadType];
          return (
            <li key={load.id} className="py-2.5 first:pt-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-dark-gray">
                  <LoadIcon className="size-3.5 text-sea-green" />
                  {load.loadType}
                </span>

                {stage === 'klar' ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-sea-green">
                    <PackageCheck className="size-4" />
                    Klar
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAdvance(load.id)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.97] ${
                      stage === 'bretting' ? 'bg-sea-green' : 'bg-nordic-blue'
                    }`}
                  >
                    {stage === 'bretting' ? (
                      <Check className="size-4" />
                    ) : (
                      <ArrowRight className="size-4" />
                    )}
                    {ADVANCE_LABEL[stage]}
                  </button>
                )}
              </div>

              {load.notes && (
                <p className="mt-2 rounded-2xl bg-cream/70 px-3 py-2 text-xs text-dark-gray">
                  {load.notes}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
