import { getImageProps } from 'next/image';
import Link from 'next/link';
import { ArrowDown, ArrowRight, Gift, Users } from 'lucide-react';
import { Wordmark } from '@/components/layout/AppHeader';
import { Footer } from '@/components/landing/Footer';
import { WaitlistForm } from '@/components/coming-soon/WaitlistForm';
import type { WaitlistAudience } from '@/types/database';

// Below this many signups the counter does more harm than good, so it's hidden.
const MIN_COUNT_TO_SHOW = 20;

/** Anchor the "how it works" section gets; the hero and the nav point at it. */
export const HOW_IT_WORKS_ID = 'slik-virker-det';

/** Anchor on the waitlist form in the hero, so CTAs further down can send
 *  people back up to it. */
export const WAITLIST_ID = 'venteliste';

/** Horizontal container shared by the bar and the hero copy, so the wordmark,
 *  the headline and the form share one left edge at every width. */
const heroContainer = 'mx-auto w-full max-w-[96rem] px-5 sm:px-8 lg:px-12 xl:px-16';

/** Page shell shared by the two coming-soon pages: Snø backdrop for the
 *  sections, a transparent bar over the light hero, footer. */
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

      {/* Transparent bar sitting on the hero. */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className={`flex items-center justify-between gap-4 py-4 ${heroContainer}`}>
          <Wordmark />
          <Link
            href={switchHref}
            className="rounded-full border border-fjord/10 bg-white/70 px-4 py-1.5 text-sm font-medium text-fjord shadow-soft backdrop-blur transition-colors hover:border-sea-green hover:text-sea-green"
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

/** The hero, campaign-style: from `lg` up one landscape photo fills the
 *  whole viewport and the copy and form sit in Fjord type on its empty left
 *  side over a soft Snø fade. Below that (phones, tablets in portrait) the
 *  copy comes first, centered, with the portrait photo under it, so the form
 *  stays above the fold and the type never lands on the subject. The
 *  landscape photo must have a plain, bright left two thirds — see the
 *  prompt in the session notes / BRANDBOOK §1 "Light hero". Without a photo
 *  the copy is centered in one column. */
export function ComingSoonHero({
  audience,
  badge,
  title,
  highlight,
  subtitle,
  offer,
  count,
  image,
}: {
  audience: WaitlistAudience;
  badge: string;
  title: string;
  /** Second headline line, underlined with a Morgensol marker stroke. */
  highlight: string;
  subtitle: string;
  /** The concrete reason to sign up today, shown above the form as two short
   *  spans so it never wraps awkwardly on a phone. */
  offer?: { title: string; detail: string };
  count: number | null;
  /** Hero photo, landscape, subject in the right third, plain wall on the
   *  left. `mobileSrc` is the portrait counterpart (plain wall in the top two
   *  thirds, subject at the bottom) shown under the copy below `lg`.
   *  `position` / `mobilePosition` are CSS object-position values for crops
   *  tighter than the photo. */
  image?: {
    src: string;
    alt: string;
    position?: string;
    mobileSrc: string;
    mobilePosition?: string;
  };
}) {
  // With a photo the copy is centered until the side-by-side layout at `lg`.
  const align = image ? 'mx-auto lg:mx-0' : 'mx-auto';
  const copy = (
    <>
      <span className="inline-flex items-center gap-2 rounded-full border border-fjord/10 bg-white/60 px-4 py-1.5 text-sm tracking-wide text-medium-gray backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
        <span className="size-2 rounded-full bg-sol" />
        {badge}
      </span>

      <h1
        className={`relative mt-6 w-fit font-serif text-5xl font-semibold leading-[0.98] tracking-tight text-dark-gray sm:text-6xl xl:text-7xl 2xl:text-[5.25rem] animate-in fade-in slide-in-from-bottom-3 duration-500 ${align}`}
        style={{ animationDelay: '60ms' }}
      >
        {title}
        <br />
        <span className="relative isolate inline-block">
          <span
            aria-hidden
            className="absolute inset-x-[-0.06em] bottom-[0.08em] -z-10 h-[0.4em] rounded-md bg-sol/70"
          />
          {highlight}
        </span>
        <Bubbles className="absolute -right-7 -top-8 size-9 sm:-right-12 sm:-top-10 sm:size-12 motion-safe:animate-bob" />
      </h1>

      <p
        className={`mt-6 max-w-md text-lg text-medium-gray sm:text-xl animate-in fade-in slide-in-from-bottom-3 duration-500 ${align}`}
        style={{ animationDelay: '120ms' }}
      >
        {subtitle}
      </p>

      <div
        id={WAITLIST_ID}
        className={`mt-8 max-w-md scroll-mt-28 text-left animate-in fade-in slide-in-from-bottom-3 duration-500 ${align}`}
        style={{ animationDelay: '180ms' }}
      >
        {offer && (
          <p className="mb-4 flex items-start gap-2.5 rounded-2xl bg-fersken px-3.5 py-3 text-[clamp(11.5px,calc((100vw_-_100px)/24),14px)] text-fjord sm:px-4 sm:text-sm">
            <Gift className="mt-0.5 hidden size-4 shrink-0 sm:block" />
            <span className="flex flex-wrap items-baseline gap-x-1">
              <span className="font-semibold">{offer.title}</span>
              <span>{offer.detail}</span>
            </span>
          </p>
        )}
        <WaitlistForm audience={audience} />
        {count !== null && count >= MIN_COUNT_TO_SHOW && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-sm text-medium-gray">
            <Users className="size-4 text-sea-green" />
            Bli med <span className="font-semibold tabular-nums text-sea-green">{count}</span> andre
          </p>
        )}
      </div>
    </>
  );

  if (!image) {
    return (
      <section className="relative isolate overflow-hidden rounded-b-[2.5rem] bg-lin/60 sm:rounded-b-[4rem]">
        <HeroGlow />
        <div className="mx-auto w-full max-w-3xl px-5 pb-16 pt-28 text-center lg:pt-36">
          {copy}
          <a
            href={`#${HOW_IT_WORKS_ID}`}
            className="mt-10 inline-flex items-center gap-1.5 text-sm text-medium-gray transition-colors hover:text-sea-green animate-in fade-in duration-700"
            style={{ animationDelay: '400ms' }}
          >
            Slik virker det
            <ArrowDown className="size-4" />
          </a>
        </div>
      </section>
    );
  }

  // Fade that keeps the type legible on the photo: from the left on wide
  // screens (copy sits on the wall), from the top when stacked (copy sits
  // above the subject).
  const fadeDesktop =
    'linear-gradient(90deg, hsl(var(--sno) / 0.85) 0%, hsl(var(--sno) / 0.55) 35%, hsl(var(--sno) / 0) 62%)';
  const fadeMobile =
    'linear-gradient(180deg, hsl(var(--sno) / 0.9) 0%, hsl(var(--sno) / 0.6) 40%, hsl(var(--sno) / 0) 60%)';

  // One photo per orientation, art-directed through <picture> so each
  // breakpoint downloads only its own file (next/image getImageProps).
  const common = { alt: image.alt, fill: true, priority: true, sizes: '100vw', quality: 90 } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: image.src });
  const {
    props: { srcSet: mobile, ...img },
  } = getImageProps({ ...common, src: image.mobileSrc });

  return (
    <section className="relative isolate min-h-[100svh] overflow-hidden rounded-b-[2.5rem] bg-sno sm:rounded-b-[4rem] lg:flex lg:items-center lg:bg-lin/60">
      {/* Stacked (below lg): a square crop of the portrait photo, anchored to
          the bottom of the hero and aimed (mobilePosition) at the subject's
          head and the bag, so her legs and the floor are cut and the hero
          stays short. The square is capped so tablets don't get a photo the
          height of the screen. The copy reserves the space above it (pb
          below), so she always lands under the form. From lg: the landscape
          photo fills the hero. */}
      <picture
        className="absolute inset-x-0 bottom-0 h-[min(100vw,44rem)] [mask-image:linear-gradient(180deg,transparent_0%,#000_18%)] animate-in fade-in duration-700 lg:top-0 lg:h-auto lg:[mask-image:none]"
        style={{ animationDelay: '120ms' }}
      >
        <source media="(min-width: 1024px)" srcSet={desktop} />
        <source srcSet={mobile} />
        <img
          {...img}
          alt={image.alt}
          className="object-cover [object-position:var(--pos-m)] lg:[object-position:var(--pos-d)]"
          style={
            {
              ...img.style,
              '--pos-m': image.mobilePosition ?? '50% 100%',
              '--pos-d': image.position ?? '50% 50%',
            } as React.CSSProperties
          }
        />
      </picture>
      <div aria-hidden className="absolute inset-0 lg:hidden" style={{ background: fadeMobile }} />
      <div aria-hidden className="absolute inset-0 hidden lg:block" style={{ background: fadeDesktop }} />

      <div className="relative z-10 w-full min-w-0">
        <div className={`pb-[min(92vw,40rem)] pt-24 lg:py-32 ${heroContainer}`}>
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-[42rem] lg:text-left">{copy}</div>
        </div>
      </div>
    </section>
  );
}

/** Soft Frost light from the top, a warm Fersken glow in the corner. */
function HeroGlow() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 -z-10"
      style={{
        background:
          'radial-gradient(70% 55% at 30% 0%, hsl(var(--frost) / 0.35), transparent 70%), radial-gradient(50% 45% at 100% 100%, hsl(var(--fersken) / 0.22), transparent 70%), radial-gradient(45% 40% at 0% 90%, hsl(var(--sol) / 0.16), transparent 70%)',
      }}
    />
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

/** One line above the footer that sends visitors to the other audience's
 *  page. A marketplace needs both sides, but the other audience is a minority
 *  here and the header already links to them, so this is a footnote: plain
 *  text and a link, never a card that competes with the page's closing CTA. */
export function CrossPromo({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <section className="pb-12">
      <p className="mx-auto max-w-5xl px-5 text-center text-medium-gray">
        {text}{' '}
        <Link
          href={href}
          className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-fjord underline decoration-sol decoration-2 underline-offset-4 transition-colors hover:text-sea-green"
        >
          {cta}
          <ArrowRight className="size-4" />
        </Link>
      </p>
    </section>
  );
}
