'use client';

// Shared chrome for the 3-step order flow: backdrop, header, progress bar,
// step titles, and the sticky estimate bar with the primary CTA.

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { formatKr, type PriceResult } from '@/lib/config/pricing';

export type OrderFlowStep = 1 | 2 | 3;

const STEP_META: Record<OrderFlowStep, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: 'Steg 1 av 3',
    title: 'Hva skal vi vaske?',
    subtitle:
      'Velg hva du sender inn, så får du et prisanslag med en gang. Endelig pris settes etter henting.',
  },
  2: {
    eyebrow: 'Steg 2 av 3',
    title: 'Hvor og når?',
    subtitle: 'Hvor henter vi, og når passer det for deg?',
  },
  3: {
    eyebrow: 'Steg 3 av 3',
    title: 'Oppsummering',
    subtitle: 'Sjekk at alt stemmer før du godkjenner avtalen.',
  },
};

const BACK_ROUTES: Record<OrderFlowStep, string> = {
  1: '/dashboard',
  2: '/orders/wash',
  3: '/orders/pickup',
};

export function OrderFlowShell({
  step,
  price,
  canAdvance,
  onAdvance,
  isSubmitting = false,
  children,
}: {
  step: OrderFlowStep;
  price: PriceResult;
  canAdvance: boolean;
  /** Steps 1–2: navigate forward. Step 3: submit to Vipps. */
  onAdvance: () => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const meta = STEP_META[step];

  // Scroll back to top on step change so the new step starts at its header.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <header className="border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={() => router.push(BACK_ROUTES[step])}
            className="flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
          >
            <ChevronLeft className="size-4" />
            Tilbake
          </button>
          <Link href="/dashboard" className="text-xl font-bold text-nordic-blue">
            NooraCare
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-44 pt-6">
        <ProgressDots step={step} />

        <div
          key={step}
          className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            {meta.eyebrow}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">{meta.subtitle}</p>
        </div>

        {children}
      </main>

      {/* ── Sticky total + primary action ──────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-[0.14em] text-medium-gray">
              Estimert pris
            </p>
            <p className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">
              {price.hasItems ? (
                <>ca. {formatKr(price.totalOre)}</>
              ) : (
                <span className="text-medium-gray">—</span>
              )}
            </p>
          </div>

          {step === 3 ? (
            <button
              type="button"
              disabled={!canAdvance || isSubmitting}
              onClick={onAdvance}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 font-semibold text-white shadow-soft transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: '#FF5B24' }}
            >
              {isSubmitting ? (
                'Behandler …'
              ) : (
                <>
                  Godkjenn med <span className="font-serif lowercase">vipps</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance || isSubmitting}
              onClick={onAdvance}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              {isSubmitting ? 'Sjekker …' : 'Gå videre'}
              {!isSubmitting && <ArrowRight className="size-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ step }: { step: OrderFlowStep }) {
  return (
    <div className="flex items-center gap-2">
      {([1, 2, 3] as const).map((n) => (
        <div
          key={n}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            n <= step ? 'bg-sea-green' : 'bg-cream-dark'
          }`}
        />
      ))}
    </div>
  );
}
