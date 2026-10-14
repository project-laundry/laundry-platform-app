'use client';

// Shared UI primitives for the customer order flow (and the public price
// calculator): steppers, per-piece rows, itemised price breakdown.

import { Check, Info, Minus, Plus, ShoppingBag } from 'lucide-react';
import { formatKr, PRICING, type PriceResult } from '@/lib/config/pricing';

export const MAX = 12;
/** Garment counts can run higher than bag/bedding counts (e.g. a seeded estimate
 *  of several bags' worth), so per-piece rows get their own ceiling. */
export const MAX_PIECES = 120;

export function clamp(n: number): number {
  return Math.max(0, Math.min(MAX, n));
}

export function clampPieces(n: number): number {
  return Math.max(0, Math.min(MAX_PIECES, n));
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

/** A growing row of bags so the count feels tangible, not just a number. The
 *  bag is the Morgensol one from the landing page's how-it-works story — the
 *  one playful touch on this screen (BRANDBOOK §1), and the visual link
 *  between the marketing page and the flow. Decorative only. */
export function BagVisual({ count }: { count: number }) {
  return (
    <div aria-hidden className="mt-4 flex flex-wrap gap-1.5 border-t border-cream-dark/60 pt-4">
      {Array.from({ length: count }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 24 28"
          className="size-7 animate-in fade-in zoom-in-50 duration-300"
          style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
        >
          <path
            d="M4.5 9.5c0-3 2.2-4.2 4.6-2.2L12 10l2.9-2.7c2.4-2 4.6-.8 4.6 2.2l1.4 13.3c.2 2-1.2 3.2-3.2 3.2H6.3c-2 0-3.4-1.2-3.2-3.2z"
            className="fill-sol"
          />
          <path
            d="M9.1 7.3 12 10l2.9-2.7"
            className="fill-none stroke-fjord/40"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <rect x="7.8" y="16.5" width="8.4" height="4.6" rx="1.6" className="fill-sno" />
        </svg>
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

/** Per-piece counter for ironing (everyday garments, shirts/dresses). Same row
 *  shape as the IroningToggle, but a counter instead of a switch — that's the
 *  signal these are priced by piece. An optional `action` renders a small inline
 *  link after the hint (e.g. a one-tap "use the estimate"). */
export function PieceRow({
  label,
  hint,
  value,
  max = MAX,
  onChange,
  action,
}: {
  label: string;
  hint: string;
  value: number;
  max?: number;
  onChange: (n: number) => void;
  action?: { label: string; onClick: () => void };
}) {
  const active = value > 0;
  return (
    <div
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
        active ? 'border-sea-green bg-sea-green/8' : 'border-cream-dark bg-white'
      }`}
    >
      <div className="min-w-0">
        <p className="font-medium text-dark-gray">{label}</p>
        <p className="text-sm text-medium-gray">
          {hint}
          {action && (
            <>
              {' · '}
              <button
                type="button"
                onClick={action.onClick}
                className="font-medium text-sea-green underline-offset-2 hover:underline"
              >
                {action.label}
              </button>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <MiniStep
          ariaLabel="Færre"
          disabled={value === 0}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" />
        </MiniStep>
        <span className="min-w-[1.75rem] text-center font-serif text-xl font-semibold tabular-nums text-dark-gray">
          {value}
        </span>
        <MiniStep
          ariaLabel="Flere"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" />
        </MiniStep>
      </div>
    </div>
  );
}

function MiniStep({
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
      className="flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
    >
      {children}
    </button>
  );
}

/** How many more bags fit under the order minimum without raising the price.
 *  Turns "your 1 bag is bumped to 500 kr" into "2 more bags cost nothing
 *  extra" — same number, opposite feeling, and it nudges the order up. */
export function bagsWithinMinimum(price: PriceResult): number {
  if (!price.minimumApplied) return 0;
  return Math.floor((PRICING.minimum_order_ore - price.subtotalOre) / PRICING.per_bag_ore);
}

/** Itemised price breakdown — live on step 1 and as review on the confirm step. */
export function Breakdown({ price }: { price: PriceResult }) {
  const extraBags = bagsWithinMinimum(price);
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
                Minste bestilling er {formatKr(PRICING.minimum_order_ore)}.{' '}
                {extraBags > 0 ? (
                  <span className="font-medium text-dark-gray">
                    Du kan legge til {extraBags} {extraBags === 1 ? 'pose' : 'poser'} til
                    uten at prisen øker.
                  </span>
                ) : (
                  'Beløpet er justert opp til dette.'
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            <p className="font-medium text-dark-gray">Estimert totalt</p>
            <p className="shrink-0 font-serif text-xl font-semibold tabular-nums text-dark-gray">
              ca. {formatKr(price.totalOre)}
            </p>
          </div>
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
        Endelig pris settes når renseren har sett hva du faktisk sender inn.
      </p>
    </div>
  );
}
