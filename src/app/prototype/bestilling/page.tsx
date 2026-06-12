'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE — "Hva skal vi vaske?" order flow (3 steps → Vipps handoff).
//
// Tests a more transparent ordering experience: the customer actively picks
// what they send and sees a live, itemised price the whole way, then fills in
// where/when and reviews before the Vipps checkout would begin.
//
//   Steg 1  Hva       – bags, bedding, ironing (StepWash)
//   Steg 2  Hvor & når – address + pickup date + frequency (StepWhereWhen)
//   Steg 3  Betaling   – review + "Betal med Vipps" → VippsHandoff
//
// Mock-only UX prototype: no server, no auth, no DB, no real order or payment.
// Delete the /prototype/bestilling folder to remove. Pricing in ./pricing.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { isValidPostalCodeFormat } from '@/lib/config/postal-codes';
import { calculatePrice, formatKr, type Selection } from './pricing';
import type { Address, Schedule } from './types';
import { StepWash } from './StepWash';
import { StepWhereWhen } from './StepWhereWhen';
import { StepReview } from './StepReview';
import { VippsHandoff } from './VippsHandoff';

type Step = 1 | 2 | 3;

const STEP_META: Record<Step, { eyebrow: string; title: string; subtitle: string }> = {
  1: {
    eyebrow: 'Steg 1 av 3',
    title: 'Hva skal vi vaske?',
    subtitle:
      'Velg hva du sender inn, så regner vi ut prisen med en gang. Du ser nøyaktig hva du betaler for.',
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

export default function BestillingPrototypePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [handoff, setHandoff] = useState(false);

  const [sel, setSel] = useState<Selection>({
    bags: 1,
    beddingSets: 0,
    ironClothes: false,
    ironBedding: false,
  });
  const [address, setAddress] = useState<Address>({
    street: '',
    postalCode: '',
    city: null,
    instructions: '',
  });
  const [schedule, setSchedule] = useState<Schedule>({
    pickupDate: '',
    isRecurring: false,
    frequency: 'weekly',
  });

  const price = useMemo(() => calculatePrice(sel), [sel]);

  // Scroll back to top on step change so the new step starts at its header.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const whereWhenValid =
    address.street.trim().length > 0 &&
    isValidPostalCodeFormat(address.postalCode) &&
    address.city !== null &&
    schedule.pickupDate !== '';

  const canAdvance =
    step === 1 ? price.hasItems : step === 2 ? whereWhenValid : true;

  const goBack = () => {
    if (step === 1) router.push('/prototype');
    else setStep((s) => (s - 1) as Step);
  };

  const advance = () => {
    if (!canAdvance) return;
    if (step === 3) setHandoff(true);
    else setStep((s) => (s + 1) as Step);
  };

  const meta = STEP_META[step];

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

      <div className="bg-yellow-100 px-4 py-2 text-center text-xs font-medium text-yellow-800">
        Prototype – testdata, ingen ekte bestilling
      </div>

      <header className="border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
          >
            <ChevronLeft className="size-4" />
            Tilbake
          </button>
          <Link href="/prototype" className="text-xl font-bold text-nordic-blue">
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

        {step === 1 && <StepWash sel={sel} setSel={setSel} price={price} />}
        {step === 2 && (
          <StepWhereWhen
            address={address}
            setAddress={setAddress}
            schedule={schedule}
            setSchedule={setSchedule}
          />
        )}
        {step === 3 && (
          <StepReview
            sel={sel}
            address={address}
            schedule={schedule}
            price={price}
          />
        )}
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
              onClick={advance}
              className="inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3.5 font-semibold text-white shadow-soft transition-all hover:brightness-105 active:scale-[0.98]"
              style={{ backgroundColor: '#FF5B24' }}
            >
              Godkjenn med <span className="font-serif lowercase">vipps</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAdvance}
              onClick={advance}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              Gå videre
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </div>

      {handoff && (
        <VippsHandoff
          estimateLabel={`ca. ${formatKr(price.totalOre)}`}
          onClose={() => setHandoff(false)}
        />
      )}
    </div>
  );
}

function ProgressDots({ step }: { step: Step }) {
  const labels = ['Hva', 'Hvor & når', 'Betaling'];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                done || active ? 'bg-sea-green' : 'bg-cream-dark'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}
