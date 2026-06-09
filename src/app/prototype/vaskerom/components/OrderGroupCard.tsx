'use client';

import {
  ArrowRight,
  Check,
  PackageCheck,
  Shirt,
  WashingMachine,
  Wind,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADVANCE_LABEL, LOAD_TYPE_DOT, type OrderGroup } from '../washroom';

interface OrderGroupCardProps {
  group: OrderGroup;
  onAdvance: (id: string) => void;
}

// All loads in a group share a stage (groups are formed within a stage section).
export function OrderGroupCard({ group, onAdvance }: OrderGroupCardProps) {
  const stage = group.loads[0].stage;

  const accent =
    stage === 'vask'
      ? 'border-l-sea-green'
      : stage === 'tork'
        ? 'border-l-sky-400'
        : stage === 'bretting'
          ? 'border-l-nordic-blue'
          : stage === 'klar'
            ? 'border-l-success-green'
            : 'border-l-slate-300';

  return (
    <div
      className={`rounded-xl border border-l-4 border-gray-200 bg-white p-3 shadow-sm ${accent}`}
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
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-medium-gray">
            {group.loads.length} laster
          </span>
        )}
      </div>

      {/* Stage hint — same for every load in the group */}
      {stage === 'vask' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-sea-green">
          <WashingMachine className="size-3.5" />
          Vasker nå
        </p>
      )}
      {stage === 'tork' && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-sky-600">
          <Wind className="size-3.5" />
          Henger til lufttørk
        </p>
      )}

      {/* One row per wash load */}
      <ul className="mt-2 divide-y divide-gray-100 border-t border-gray-100">
        {group.loads.map((load) => (
          <li key={load.id} className="py-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-dark-gray">
                  <span
                    className={`size-2.5 rounded-full ${LOAD_TYPE_DOT[load.loadType]}`}
                  />
                  {load.loadType}
                </span>
                {load.needs_ironing && (
                  <span title="Stryking inkludert" aria-label="Stryking inkludert">
                    <Shirt className="size-4 text-medium-gray" />
                  </span>
                )}
              </div>

              {stage === 'klar' ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success-green">
                  <PackageCheck className="size-4" />
                  Klar
                </span>
              ) : (
                <Button
                  size="sm"
                  className={`shrink-0 ${
                    stage === 'bretting'
                      ? 'bg-sea-green text-white hover:bg-sea-green'
                      : ''
                  }`}
                  onClick={() => onAdvance(load.id)}
                >
                  {stage === 'bretting' ? (
                    <Check className="size-4" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                  {ADVANCE_LABEL[stage]}
                </Button>
              )}
            </div>

            {load.notes && (
              <p className="mt-1.5 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-dark-gray">
                {load.notes}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
