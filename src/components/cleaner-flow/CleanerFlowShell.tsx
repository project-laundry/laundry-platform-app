// Shared chrome for the 5-step cleaner onboarding flow: backdrop, header,
// back link, progress bars, step title and the sticky submit bar. Mirrors
// OrderFlowShell so the two flows can't drift visually (BRANDBOOK §4).

import { ArrowRight } from 'lucide-react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';

export type CleanerFlowStep = 1 | 2 | 3 | 4 | 5;

const STEPS: CleanerFlowStep[] = [1, 2, 3, 4, 5];

const STEP_META: Record<CleanerFlowStep, { title: string; subtitle: string; back: string }> = {
  1: {
    title: 'Virksomhet og utbetaling',
    subtitle: 'Vi trenger noen opplysninger for å kunne betale deg og følge norsk lov.',
    back: '/bli-renser',
  },
  2: {
    title: 'Hvor vasker du?',
    subtitle: 'Adressen der vaskemaskinen din står. Sjåføren vår leverer og henter tøyet her.',
    back: '/bli-renser/business',
  },
  3: {
    title: 'Vaskemaskinen din',
    subtitle: 'Fortell oss om maskinen du vasker med, så vet vi hvor mye du kan ta imot.',
    back: '/bli-renser/services',
  },
  4: {
    title: 'Profilen din',
    subtitle: 'Navnet kundene ser, og hvor mye erfaring du har med klesvask.',
    back: '/bli-renser/equipment',
  },
  5: {
    title: 'Bekreft og send inn',
    subtitle: 'Sjekk at alt stemmer før du sender søknaden.',
    back: '/bli-renser/profile',
  },
};

export function CleanerFlowShell({
  step,
  formId,
  ctaLabel,
  canAdvance,
  isSubmitting = false,
  submittingLabel = 'Sender …',
  children,
}: {
  step: CleanerFlowStep;
  /** id of the <form> rendered inside `children`; the sticky button submits it. */
  formId: string;
  ctaLabel: string;
  canAdvance: boolean;
  isSubmitting?: boolean;
  submittingLabel?: string;
  children: React.ReactNode;
}) {
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

      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 pb-44 pt-6">
        <div className="mb-4">
          <BackLink href={meta.back} />
        </div>

        <div className="flex items-center gap-2">
          {STEPS.map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-sea-green' : 'bg-cream-dark'
              }`}
            />
          ))}
        </div>

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg {step} av {STEPS.length}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            {meta.title}
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">{meta.subtitle}</p>
        </div>

        {children}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form={formId}
            disabled={!canAdvance || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            {isSubmitting ? submittingLabel : ctaLabel}
            {!isSubmitting && <ArrowRight className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A card section inside the flow: round sea-green icon chip + serif title (BRANDBOOK §4 "Card / section"). */
export function CleanerFlowSection({
  icon,
  title,
  hint,
  delay = 60,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  /** animationDelay in ms — stagger sibling sections by 60ms. */
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-medium-gray">{hint}</p>}
        </div>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
