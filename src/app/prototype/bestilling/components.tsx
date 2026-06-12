'use client';

// Shared UI primitives for the bestilling prototype. Kept in one file so the
// whole flow lives under /prototype/bestilling and deletes in one folder.

import { Check, Info, Minus, Plus, ShoppingBag } from 'lucide-react';
import { formatKr, PROTO_PRICING, type PriceResult } from './pricing';

export const MAX = 12;

export function clamp(n: number): number {
  return Math.max(0, Math.min(MAX, n));
}

export function Section({
  icon,
  title,
  subtitle,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <section
      className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
            {icon}
          </span>
          <div>
            <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
              {title}
            </h2>
            <p className="mt-1 text-sm text-medium-gray">{subtitle}</p>
          </div>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </section>
  );
}

export function Explainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
      <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
      <p>{children}</p>
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  unit,
  perUnit,
}: {
  value: number;
  onChange: (n: number) => void;
  unit: string;
  perUnit: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <StepButton
          ariaLabel="Færre"
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-5" />
        </StepButton>

        <div className="flex min-w-[4.5rem] flex-col items-center">
          <span className="font-serif text-3xl font-semibold tabular-nums text-dark-gray">
            {value}
          </span>
          <span className="text-xs text-medium-gray">{unit}</span>
        </div>

        <StepButton
          ariaLabel="Flere"
          disabled={value >= MAX}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-5" />
        </StepButton>
      </div>

      <span className="text-right text-sm text-medium-gray">{perUnit}</span>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

/** A growing row of bags so the count feels tangible, not just a number. */
export function BagVisual({ count }: { count: number }) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-cream-dark/60 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShoppingBag
          key={i}
          className="size-6 text-sea-green animate-in fade-in zoom-in-50 duration-300"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        />
      ))}
    </div>
  );
}

export function IroningToggle({
  label,
  hint,
  checked,
  disabled,
  disabledHint,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  disabledHint: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
        disabled
          ? 'cursor-not-allowed border-cream-dark/60 bg-cream/40 opacity-60'
          : checked
            ? 'border-sea-green bg-sea-green/8'
            : 'border-cream-dark bg-white hover:border-sea-green/50'
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-dark-gray">{label}</p>
        <p className="text-sm text-medium-gray">{disabled ? disabledHint : hint}</p>
      </div>

      <span
        className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-sea-green' : 'bg-cream-dark'
        }`}
      >
        <span
          className={`absolute flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        >
          {checked && <Check className="size-3 text-sea-green" />}
        </span>
      </span>
    </button>
  );
}

/** Itemised price breakdown — used live on step 1 and as review on step 3. */
export function Breakdown({ price }: { price: PriceResult }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
      {price.hasItems ? (
        <div className="divide-y divide-cream-dark/60">
          {price.lines.map((line) => (
            <div
              key={line.key}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <div className="min-w-0">
                <p className="font-medium text-dark-gray">{line.label}</p>
                {line.detail && (
                  <p className="text-sm text-medium-gray">{line.detail}</p>
                )}
              </div>
              <p className="shrink-0 font-medium tabular-nums text-dark-gray">
                {formatKr(line.amountOre)}
              </p>
            </div>
          ))}

          {price.minimumApplied && (
            <div className="flex items-start gap-2 bg-cream/60 px-5 py-3 text-sm text-medium-gray">
              <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
              <span>
                Minste bestilling er {formatKr(PROTO_PRICING.minimum_ore)}.
                Beløpet er justert opp til dette.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
          <ShoppingBag className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Legg til noe å vaske for å se prisen.</p>
        </div>
      )}
    </div>
  );
}

/** Tentative-price disclaimer, shown wherever a total appears. */
export function PriceDisclaimer() {
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3">
      <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
      <p className="text-sm leading-relaxed text-medium-gray">
        Dette er et{' '}
        <span className="font-medium text-dark-gray">omtrentlig estimat</span>.
        Endelig pris kan endres når renseren har sett og veid det du faktisk
        sender inn.
      </p>
    </div>
  );
}
