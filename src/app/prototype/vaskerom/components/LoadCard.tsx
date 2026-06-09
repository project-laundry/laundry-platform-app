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
import { ADVANCE_LABEL, type LaundryLoad } from '../washroom';

interface LoadCardProps {
  load: LaundryLoad;
  onAdvance: (id: string) => void;
}

function bagsLabel(n: number) {
  return `${n} ${n === 1 ? 'pose' : 'poser'}`;
}

export function LoadCard({ load, onAdvance }: LoadCardProps) {
  // State → left accent
  const accent =
    load.stage === 'vask'
      ? 'border-l-sea-green'
      : load.stage === 'tork'
        ? 'border-l-sky-400'
        : load.stage === 'bretting'
          ? 'border-l-nordic-blue'
          : load.stage === 'klar'
            ? 'border-l-success-green'
            : 'border-l-slate-300';

  return (
    <div
      className={`rounded-xl border border-l-4 border-gray-200 bg-white p-3 shadow-sm ${accent}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-tight text-dark-gray">
            {load.customer_name}
          </p>
          <p className="font-mono text-xs text-medium-gray">{load.order_number}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-medium-gray">
            {bagsLabel(load.bags)}
          </span>
          {load.needs_ironing && (
            <span
              className="text-medium-gray"
              title="Stryking inkludert"
              aria-label="Stryking inkludert"
            >
              <Shirt className="size-4" />
            </span>
          )}
        </div>
      </div>

      {/* Notes */}
      {load.notes && (
        <p className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-dark-gray">
          {load.notes}
        </p>
      )}

      {/* Stage status hint */}
      {load.stage === 'vask' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sea-green">
          <WashingMachine className="size-3.5" />
          Vasker nå
        </p>
      )}
      {load.stage === 'tork' && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-sky-600">
          <Wind className="size-3.5" />
          Henger til lufttørk
        </p>
      )}

      {/* Action */}
      <div className="mt-3">
        {load.stage === 'klar' ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success-green">
            <PackageCheck className="size-4" />
            Klar til levering
          </p>
        ) : (
          <Button
            className={`h-11 w-full ${
              load.stage === 'bretting'
                ? 'bg-sea-green text-white hover:bg-sea-green'
                : ''
            }`}
            onClick={() => onAdvance(load.id)}
          >
            {load.stage === 'bretting' ? (
              <Check className="size-4" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {ADVANCE_LABEL[load.stage]}
          </Button>
        )}
      </div>
    </div>
  );
}
