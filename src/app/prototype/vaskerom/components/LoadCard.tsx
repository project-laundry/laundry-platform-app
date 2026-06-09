'use client';

import {
  ArrowRight,
  Check,
  PackageCheck,
  Shirt,
  Timer,
  WashingMachine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ADVANCE_LABEL,
  formatCountdown,
  isFinished,
  isRunning,
  type LaundryLoad,
} from '../washroom';

interface LoadCardProps {
  load: LaundryLoad;
  canAdvance: boolean;
  blockedReason: string | null;
  onAdvance: (id: string) => void;
  onForceFinish: (id: string) => void;
}

function bagsLabel(n: number) {
  return `${n} ${n === 1 ? 'pose' : 'poser'}`;
}

export function LoadCard({
  load,
  canAdvance,
  blockedReason,
  onAdvance,
  onForceFinish,
}: LoadCardProps) {
  const running = isRunning(load);
  const finished = isFinished(load);
  const inMachine = load.stage === 'vask' || load.stage === 'tork';

  // State → left accent + container styling
  const accent = finished
    ? 'border-l-amber-500 bg-amber-50'
    : running
      ? 'border-l-sea-green bg-white'
      : load.stage === 'klar'
        ? 'border-l-success-green bg-white'
        : load.stage === 'bretting'
          ? 'border-l-nordic-blue bg-white'
          : 'border-l-slate-300 bg-white';

  const progressPct =
    load.totalSec && load.remainingSec !== null
      ? Math.min(100, Math.max(0, (1 - load.remainingSec / load.totalSec) * 100))
      : 0;

  return (
    <div
      className={`rounded-xl border border-l-4 border-gray-200 p-3 shadow-sm transition-colors ${accent}`}
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

      {/* Notes (queue + manual stages, where the cleaner acts on them) */}
      {load.notes && !inMachine && (
        <p className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-dark-gray">
          {load.notes}
        </p>
      )}

      {/* Machine countdown */}
      {inMachine && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs text-medium-gray">
              <WashingMachine className="size-3.5" />
              {load.machineLabel}
            </span>
            {finished ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                <span className="size-2 animate-pulse rounded-full bg-amber-500" />
                Ferdig – ta ut
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-sea-green">
                <span className="size-2 animate-pulse rounded-full bg-sea-green" />
                Pågår
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-2xl font-semibold tabular-nums ${
                finished ? 'text-amber-600' : 'text-dark-gray'
              }`}
            >
              {finished ? '00:00' : formatCountdown(load.remainingSec ?? 0)}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                  finished ? 'bg-amber-500' : 'bg-sea-green'
                }`}
                style={{ width: `${finished ? 100 : progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3">
        {load.stage === 'klar' ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-success-green">
            <PackageCheck className="size-4" />
            Klar til levering
          </p>
        ) : running ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-xs text-medium-gray">
              <Timer className="size-3.5" />
              Du kan gjøre andre oppgaver mens den går
            </span>
            <button
              onClick={() => onForceFinish(load.id)}
              className="text-xs font-medium text-nordic-blue hover:underline"
            >
              Ferdig nå
            </button>
          </div>
        ) : (
          <>
            <Button
              className={`h-11 w-full ${
                finished
                  ? 'bg-amber-500 text-white hover:bg-amber-500'
                  : load.stage === 'bretting'
                    ? 'bg-sea-green text-white hover:bg-sea-green'
                    : ''
              }`}
              disabled={!canAdvance}
              onClick={() => onAdvance(load.id)}
            >
              {load.stage === 'bretting' ? (
                <Check className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {ADVANCE_LABEL[load.stage]}
            </Button>
            {!canAdvance && blockedReason && (
              <p className="mt-1.5 text-center text-xs text-amber-600">
                {blockedReason}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
