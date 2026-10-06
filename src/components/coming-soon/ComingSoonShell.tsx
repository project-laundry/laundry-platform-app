import Link from 'next/link';
import { ArrowDown, ArrowRight, Gift, Users } from 'lucide-react';
import { Wordmark } from '@/components/layout/AppHeader';
import { Footer } from '@/components/landing/Footer';
import { WaitlistForm } from '@/components/coming-soon/WaitlistForm';
import type { WaitlistAudience } from '@/types/database';

// Below this many signups the counter does more harm than good, so it's hidden.
const MIN_COUNT_TO_SHOW = 20;

/** Anchor the hero's "scroll" hint points at; the page gives it to its steps section. */
export const HOW_IT_WORKS_ID = 'slik-virker-det';

/** Page shell shared by the two coming-soon pages: Snø backdrop for the
 *  sections, a transparent bar over the Fjord hero, footer. */
export function ComingSoonShell({
  audience,
  switchHref,
  switchLabel,
  children,
}: {
  audience: WaitlistAudience;
  switchHref: string;
  switchLabel: string;
  children: React.ReactNode;
}) {
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

      {/* Transparent bar sitting on the Fjord hero. */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Wordmark tone="light" />
          <Link
            href={switchHref}
            className="rounded-full border border-sno/25 px-4 py-1.5 text-sm font-medium text-sno/90 transition-colors hover:border-sol hover:text-sol"
          >
            {switchLabel}
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <Footer showPricing={audience === 'customer'} />
    </div>
  );
}

/** The soap bubbles from the logo: two Morgensol rings. Decorative only. */
function Bubbles({ className, tone = 'text-sol' }: { className: string; tone?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 44" fill="none" className={`${tone} ${className}`}>
      <circle cx="10" cy="9" r="6" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="27" cy="29" r="10" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

/** Full-screen Fjord hero with the waitlist form — the "hype" part of the page.
 *  Mirrors the secondary logo (BRANDBOOK §1): Snø on Fjord, Morgensol bubbles. */
export function ComingSoonHero({
  audience,
  badge,
  title,
  highlight,
  subtitle,
  offer,
  count,
}: {
  audience: WaitlistAudience;
  badge: string;
  title: string;
  /** Second headline line, set in Morgensol. */
  highlight: string;
  subtitle: string;
  /** The concrete reason to sign up today, shown inside the form card as two
   *  short lines so it never wraps awkwardly on a phone. */
  offer?: { title: string; detail: string };
  count: number | null;
}) {
  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden rounded-b-[2.5rem] bg-fjord text-sno sm:rounded-b-[4rem]">
      {/* Soft Frost light from the top, a warm Fersken glow in the corner. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70% 55% at 50% 0%, hsl(var(--frost) / 0.28), transparent 70%), radial-gradient(50% 45% at 100% 100%, hsl(var(--fersken) / 0.16), transparent 70%), radial-gradient(45% 40% at 0% 85%, hsl(var(--sol) / 0.10), transparent 70%)',
        }}
      />
      {/* Scattered bubbles, like the ones rising from the logo's towel stack. */}
      <Bubbles className="absolute left-[6%] top-[18%] -z-10 hidden size-14 opacity-40 sm:block" tone="text-frost" />
      <Bubbles className="absolute bottom-[14%] right-[7%] -z-10 size-12 rotate-45 opacity-50 sm:size-20" />
      <Bubbles className="absolute bottom-[22%] left-[10%] -z-10 hidden size-8 -rotate-12 opacity-30 sm:block" tone="text-fersken" />

      <div className="mx-auto w-full max-w-3xl px-5 pb-14 pt-24 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-sno/20 bg-sno/5 px-4 py-1.5 text-sm tracking-wide text-sno/85 backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
          <span className="size-2 rounded-full bg-sol" />
          {badge}
        </span>

        <h1
          className="relative mx-auto mt-6 w-fit font-serif text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '60ms' }}
        >
          {title}
          <br />
          <span className="text-sol">{highlight}</span>
          <Bubbles className="absolute -right-7 -top-8 size-9 sm:-right-12 sm:-top-10 sm:size-12" />
        </h1>

        <p
          className="mx-auto mt-5 max-w-md text-lg text-sno/75 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '120ms' }}
        >
          {subtitle}
        </p>

        <div
          className="mx-auto mt-8 max-w-md rounded-3xl border border-sno/15 bg-sno/[0.07] p-5 text-left shadow-[0_30px_80px_-20px_rgb(0_0_0/0.45)] backdrop-blur-md sm:p-6 animate-in fade-in slide-in-from-bottom-3 duration-500"
          style={{ animationDelay: '180ms' }}
        >
          {offer && (
            <p className="mb-4 flex items-start gap-2.5 rounded-2xl bg-fersken px-3.5 py-3 text-[clamp(11.5px,calc((100vw_-_100px)/24),14px)] text-fjord shadow-soft sm:px-4 sm:text-sm">
              <Gift className="mt-0.5 hidden size-4 shrink-0 sm:block" />
              <span className="flex flex-wrap items-baseline gap-x-1">
                <span className="font-semibold">{offer.title}</span>
                <span>{offer.detail}</span>
              </span>
            </p>
          )}
          <WaitlistForm audience={audience} />
          {count !== null && count >= MIN_COUNT_TO_SHOW && (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-sno/65">
              <Users className="size-4" />
              Bli med <span className="font-semibold tabular-nums text-sol">{count}</span> andre
            </p>
          )}
        </div>

        {/* The hero fills the viewport, so say that there's more below it. */}
        <a
          href={`#${HOW_IT_WORKS_ID}`}
          className="mt-10 inline-flex items-center gap-1.5 text-sm text-sno/60 transition-colors hover:text-sol animate-in fade-in duration-700"
          style={{ animationDelay: '400ms' }}
        >
          Slik virker det
          <ArrowDown className="size-4" />
        </a>
      </div>
    </section>
  );
}

/** Playful accent fills for icon chips and step numbers, cycled by index (BRANDBOOK §1). */
export const ACCENT_CHIPS = ['bg-sol/35', 'bg-frost/45', 'bg-fersken/40'] as const;

export const comingSoonCard =
  'rounded-3xl border border-lin bg-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-6';

/** Section header used by both pages. */
export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-frost-deep">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-2xl font-semibold text-dark-gray sm:text-3xl">{title}</h2>
    </div>
  );
}

/** Numbered "how it works" list. */
export function StepList({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => (
        <li key={step.title} className={`flex items-start gap-4 ${comingSoonCard}`}>
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-lg font-semibold text-fjord ${ACCENT_CHIPS[index % ACCENT_CHIPS.length]}`}
          >
            {index + 1}
          </span>
          <div>
            <h3 className="font-serif text-lg font-semibold text-dark-gray">{step.title}</h3>
            <p className="mt-1 text-sm text-medium-gray">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Expandable Q&A list. */
export function FaqList({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <details key={item.q} className={`group ${comingSoonCard}`}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-lg font-semibold text-dark-gray [&::-webkit-details-marker]:hidden">
            {item.q}
            <ArrowDown className="size-4 shrink-0 text-frost-deep transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm text-medium-gray">{item.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Strip above the footer that sends visitors to the other audience's page.
 *  A marketplace needs both sides; the customer page is where cleaners-to-be
 *  land first, and vice versa. */
export function CrossPromo({
  eyebrow,
  title,
  text,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <section className="pb-12">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex flex-col gap-5 rounded-3xl bg-fjord p-6 text-sno shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-frost">{eyebrow}</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold">{title}</h2>
            <p className="mt-2 max-w-lg text-sno/75">{text}</p>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-sol px-6 py-3.5 font-semibold text-fjord shadow-soft transition-all hover:brightness-105 active:scale-[0.98]"
          >
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
