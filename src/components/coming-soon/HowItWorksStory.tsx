import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import primaryLogo from '@/assets/brand/primaerlogo.png';
import { PRICING, formatKr } from '@/lib/config/pricing';
import { ACCENT_CHIPS, HOW_IT_WORKS_ID, WAITLIST_ID } from '@/components/coming-soon/ComingSoonShell';
import { WAITLIST_OFFER_SPOTS } from '@/components/coming-soon/launch';

// "Slik virker det" as a zig-zag story: five illustrated steps, a dashed flow
// line between them, and a closing CTA back up to the waitlist form. Every
// claim here must hold for a neighbor washing in a home machine and a driver
// doing the pickup — no turnaround promises, no product claims, and the
// per-bag price never without the order minimum (CLAUDE.md).

const MOCKUP_BAGS = 5;

/** One step: illustration on one side, number + title + text on the other.
 *  Alternates sides on wide screens; stacks (picture first) on phones. */
function Step({
  index,
  title,
  reverse = false,
  visual,
  children,
}: {
  index: number;
  title: string;
  reverse?: boolean;
  visual: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    // minmax(0, …) so the oversized illustration stage can't widen the column
    // past the screen on phones; the section clips its overflow instead.
    <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-4 sm:min-h-[420px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-10">
      <div
        aria-hidden
        className={`relative flex h-[290px] items-center justify-center sm:h-[400px] ${reverse ? 'sm:order-2' : ''}`}
      >
        {/* Fixed-size stage, scaled down on phones so the scenes keep their proportions. */}
        <div className="relative flex h-[400px] w-[460px] shrink-0 scale-[.7] items-center justify-center sm:scale-100">
          {visual}
        </div>
      </div>
      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <span
          className={`flex size-10 items-center justify-center rounded-full font-serif text-lg font-semibold text-fjord ${ACCENT_CHIPS[index % ACCENT_CHIPS.length]}`}
        >
          {index + 1}
        </span>
        <h3 className="font-serif text-2xl font-semibold leading-tight text-dark-gray sm:text-3xl">{title}</h3>
        <div className="max-w-sm text-medium-gray sm:text-lg">{children}</div>
      </div>
    </div>
  );
}

/** Dashed Morgensol line from one step to the next: an S-curve across the
 *  grid on wide screens, a short vertical arrow on phones. */
function Connector({ flip = false }: { flip?: boolean }) {
  return (
    <>
      <svg aria-hidden viewBox="0 0 1120 140" className="-my-8 hidden w-full sm:block">
        <path
          d={flip ? 'M760 10 C720 120 380 20 320 130' : 'M360 10 C400 120 740 20 800 130'}
          className="fill-none stroke-sol motion-safe:animate-flow"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="14 10"
          markerEnd="url(#how-arrow)"
        />
      </svg>
      <div aria-hidden className="my-5 flex flex-col items-center sm:hidden">
        <span className="h-12 border-l-4 border-dashed border-sol" />
        <span className="-mt-2.5 size-3 rotate-45 border-b-4 border-r-4 border-sol" />
      </div>
    </>
  );
}

function Chip({
  tone,
  className,
  children,
}: {
  tone: 'light' | 'dark';
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`absolute flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm ${
        tone === 'dark' ? 'bg-fjord text-sno' : 'bg-white text-dark-gray shadow-[var(--shadow-card)]'
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------- Scenes ---------- */

/** Step 1: the order screen, as the real flow looks (bags, pickup, Fjord CTA). */
function PhoneScene() {
  const total = formatKr(MOCKUP_BAGS * PRICING.per_bag_ore);
  return (
    <div className="h-[400px] w-[210px] -rotate-[8deg] rounded-[36px] bg-fjord p-2.5 shadow-[0_30px_60px_-10px_hsl(var(--fjord)/0.35)] motion-safe:animate-float">
      <div className="flex h-full flex-col gap-2 rounded-[28px] bg-warm-white px-3.5 pb-3.5 pt-5">
        <Image src={primaryLogo} alt="" className="h-5 w-auto self-start" />
        <p className="font-serif text-lg font-semibold text-dark-gray">Bestill henting</p>
        <p className="text-[11px] text-medium-gray">Hva skal vaskes?</p>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-sea-green bg-sea-green/10 px-2.5 py-1 text-xs text-sea-green">
            Hverdagsklær
          </span>
          <span className="rounded-full border border-cream-dark px-2.5 py-1 text-xs text-dark-gray">Sengetøy</span>
        </div>
        <p className="text-[11px] text-medium-gray">Antall poser</p>
        <div className="flex items-center justify-between rounded-xl border border-cream-dark bg-white px-2.5 py-1.5 text-sm">
          <span className="flex size-6 items-center justify-center rounded-full bg-cream text-dark-gray">−</span>
          <b className="tabular-nums text-dark-gray">{MOCKUP_BAGS} poser</b>
          <span className="flex size-6 items-center justify-center rounded-full bg-cream text-dark-gray">+</span>
        </div>
        <p className="text-[11px] text-medium-gray">Henting</p>
        <div className="rounded-xl border border-cream-dark bg-white px-2.5 py-2 text-xs text-dark-gray">
          Tirsdag · hver 2. uke
        </div>
        <div className="mt-auto flex justify-between border-t border-cream-dark pt-2 text-xs">
          <span className="text-medium-gray">Totalt</span>
          <b className="font-serif text-sm tabular-nums text-dark-gray">{total}</b>
        </div>
        <span className="flex h-9 items-center justify-center rounded-full bg-sol text-xs font-semibold text-fjord motion-safe:animate-cta-pulse">
          Bestill henting
        </span>
      </div>
    </div>
  );
}

/** Step 2: a cleaner accepts. Flat illustrated avatar — no facial features.
 *  Two rings pulse outward from the avatar; the toast slides in and fades. */
function CleanerScene() {
  return (
    <>
      <span className="absolute size-44 rounded-full border-2 border-frost motion-safe:animate-ring" />
      <span
        className="absolute size-44 rounded-full border-2 border-frost motion-safe:animate-ring"
        style={{ animationDelay: '1.3s' }}
      />
      <div className="relative size-44 overflow-hidden rounded-full border-[6px] border-white bg-frost/40 shadow-[var(--shadow-card)] ring-2 ring-frost">
        <svg viewBox="0 0 100 100" className="size-full">
          <path d="M29 48C29 28 38 19 50 19s21 9 21 29v36H29z" className="fill-fjord" />
          <path d="M8 104c2-22 20-32 42-32s40 10 42 32z" className="fill-sno" />
          <path d="M44 58v10l6 7 6-7V58z" className="fill-fersken" />
          <path d="M34 36h32v10c0 12-7 20-16 20s-16-8-16-20z" className="fill-fersken" />
          <path d="M29 48C29 28 38 19 50 19s21 9 21 29h-4c0-6-5-11-17-11s-17 5-17 11z" className="fill-fjord" />
        </svg>
      </div>
      <div className="absolute right-2 top-14 flex w-[260px] rotate-3 items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-[var(--shadow-card)] motion-safe:animate-toast">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-fjord">
          <Check className="size-5 text-sno" strokeWidth={2.6} />
        </span>
        <span>
          <b className="block text-[15px] font-semibold text-dark-gray">En renser tok jobben</b>
          <small className="text-[13px] text-medium-gray">Godkjent renser · i nærheten</small>
        </span>
      </div>
      <Chip tone="dark" className="bottom-10 left-1/2 -translate-x-1/2">
        Vasker i egen maskin
      </Chip>
    </>
  );
}

/** A front door with a doormat; the pickup and delivery scenes share it. */
function Door() {
  return (
    <div className="relative h-[290px] w-[180px] shrink-0 rounded-t-2xl bg-lin px-3 pt-3">
      <div className="relative h-full rounded-t-lg bg-fjord/90">
        <span className="absolute inset-x-5 top-6 h-[100px] rounded-md border-2 border-frost/40" />
        <span className="absolute inset-x-5 top-[140px] h-[100px] rounded-md border-2 border-frost/40" />
        <span className="absolute right-4 top-[150px] size-3.5 rounded-full bg-sol" />
      </div>
    </div>
  );
}

function Doormat() {
  return <span className="absolute inset-x-[70px] bottom-[46px] h-4 rounded-full bg-fjord/10" />;
}

/** Step 3: the bag by the door, the driver on the way. */
function PickupScene() {
  return (
    <>
      <div className="flex h-full w-full items-end justify-center gap-5 pb-14">
        <Door />
        <svg viewBox="0 0 140 170" className="relative z-10 h-[160px] w-[132px] motion-safe:animate-bob">
          <path
            d="M28 40c0-14 12-20 24-10l18 14 18-14c12-10 24-4 24 10l8 110c1 12-8 18-20 18H40c-12 0-21-6-20-18z"
            className="fill-sol"
          />
          <path d="M52 30l18 14 18-14" className="fill-none stroke-fjord/40" strokeWidth={4} strokeLinecap="round" />
          <rect x="44" y="92" width="52" height="30" rx="8" className="fill-sno" />
        </svg>
      </div>
      <Doormat />
      <Chip tone="light" className="right-6 top-12">
        <span className="size-2 rounded-full bg-sol" />
        Sjåføren er på vei
      </Chip>
    </>
  );
}

/** Step 4: the washing machine, drum spinning, bubbles rising. */
function WashScene() {
  return (
    <>
      <svg viewBox="0 0 260 300" className="h-[300px] w-[260px]">
        <rect x="34" y="282" width="30" height="14" rx="4" className="fill-fjord" />
        <rect x="196" y="282" width="30" height="14" rx="4" className="fill-fjord" />
        <rect x="20" y="10" width="220" height="276" rx="34" className="fill-warm-white stroke-fjord" strokeWidth={8} />
        <path d="M20 70H240" className="stroke-fjord" strokeWidth={6} />
        <circle cx="52" cy="40" r="9" className="fill-fjord" />
        <circle cx="78" cy="40" r="9" className="fill-fjord" />
        <rect x="150" y="32" width="64" height="16" rx="8" className="fill-sol" />
        <defs>
          <clipPath id="how-drum">
            <circle cx="130" cy="176" r="72" />
          </clipPath>
        </defs>
        <circle cx="130" cy="176" r="72" className="fill-frost/40" />
        <g clipPath="url(#how-drum)">
          <g className="motion-safe:animate-drum" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
            <rect x="70" y="140" width="64" height="26" rx="13" className="fill-fersken" />
            <rect x="128" y="172" width="70" height="24" rx="12" className="fill-fjord" />
            <rect x="88" y="200" width="56" height="22" rx="11" className="fill-sol" />
            <rect x="126" y="120" width="44" height="20" rx="10" className="fill-frost" />
          </g>
          <path d="M50 200q20-14 40 0t40 0t40 0t40 0V260H50z" className="fill-frost/60" />
        </g>
        <circle cx="130" cy="176" r="72" className="fill-none stroke-fjord" strokeWidth={8} />
        <circle cx="130" cy="176" r="86" className="fill-none stroke-fjord/40" strokeWidth={3} />
      </svg>
      {/* Soap bubbles rising from the machine, like in the logo. */}
      <span className="absolute left-[350px] top-[150px] size-[22px] rounded-full border-[3px] border-sol motion-safe:animate-rise" />
      <span
        className="absolute left-[374px] top-[190px] size-3.5 rounded-full border-[3px] border-sol motion-safe:animate-rise"
        style={{ animationDelay: '1s' }}
      />
      <span
        className="absolute left-[336px] top-[200px] size-2.5 rounded-full border-2 border-frost motion-safe:animate-rise"
        style={{ animationDelay: '2s' }}
      />
      <Chip tone="light" className="bottom-8 left-1/2 -translate-x-1/2">
        Vask · tørk · bretting
      </Chip>
    </>
  );
}

/** Step 5: folded laundry back on the doormat. */
function DeliveryScene() {
  return (
    <>
      <div className="flex h-full w-full items-end justify-center gap-5 pb-14">
        <Door />
        <div className="relative z-10 h-[150px] w-[150px]">
          <svg viewBox="0 0 150 130" className="absolute bottom-0 left-0 h-[130px] w-[150px]">
            <rect x="10" y="96" width="130" height="30" rx="15" className="fill-frost" />
            <path d="M28 96v30" className="stroke-white/60" strokeWidth={3} />
            <rect x="18" y="62" width="114" height="32" rx="16" className="fill-fjord" />
            <path d="M36 62v32" className="stroke-white/50" strokeWidth={3} />
            <rect x="26" y="30" width="98" height="30" rx="15" className="fill-fersken" />
            <path d="M44 30v30" className="stroke-white/60" strokeWidth={3} />
          </svg>
          <span className="absolute -right-3 -top-4 flex size-14 items-center justify-center rounded-full bg-sol shadow-[var(--shadow-card)] motion-safe:animate-pop">
            <Check className="size-7 text-fjord" strokeWidth={2.8} />
          </span>
        </div>
      </div>
      <Doormat />
      <Chip tone="dark" className="right-5 top-12">
        Levert · rent og brettet
      </Chip>
    </>
  );
}

export function HowItWorksStory() {
  return (
    <section id={HOW_IT_WORKS_ID} className="scroll-mt-6 overflow-hidden py-16 sm:py-24">
      {/* Arrowhead shared by every connector line. */}
      <svg aria-hidden className="absolute size-0">
        <defs>
          <marker id="how-arrow" viewBox="0 0 12 12" refX="7" refY="6" markerWidth="9" markerHeight="9" orient="auto">
            <path
              d="M2 2L9 6L2 10"
              className="fill-none stroke-sol"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </marker>
        </defs>
      </svg>

      <div className="mx-auto max-w-5xl px-5">
        <header className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-frost-deep">Slik virker det</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-dark-gray sm:text-5xl">
            Fra skittentøy til rent
            <br />– uten å løfte en finger
          </h2>
          <p className="mt-4 text-lg text-medium-gray">
            Fem steg fra du trykker «bestill» til tøyet ligger brettet på døren.
          </p>
        </header>

        <Step index={0} title="Du bestiller" visual={<PhoneScene />}>
          <p>
            Velg hva som skal vaskes, hvor mange poser og når det passer å hente.{' '}
            <span className="whitespace-nowrap">{formatKr(PRICING.per_bag_ore)} per pose</span>.
          </p>
          <Link
            href="/pris-kalkulator"
            className="mt-2 inline-flex items-center gap-1.5 text-base font-medium text-nordic-blue transition-colors hover:text-sea-green"
          >
            Se full prisliste
            <ArrowRight className="size-4" />
          </Link>
        </Step>

        <Connector />

        <Step index={1} title="En renser tar jobben" reverse visual={<CleanerScene />}>
          <p>En godkjent renser i nærheten får oppdraget og bekrefter. Du ser hvem som tar vare på tøyet ditt.</p>
        </Step>

        <Connector flip />

        <Step index={2} title="Tøyet hentes på døren" visual={<PickupScene />}>
          <p>Sjåføren vår henter posene hjemme hos deg på dagen du valgte.</p>
        </Step>

        <Connector />

        <Step index={3} title="Tøyet ditt blir vasket" reverse visual={<WashScene />}>
          <p>Vasket, tørket og brettet hos renseren – med miljø- og allergivennlige produkter.</p>
        </Step>

        <Connector flip />

        <Step index={4} title="Levert på døren igjen" visual={<DeliveryScene />}>
          <p>Rent og brettet tilbake på dørmatten. Du betaler med Vipps når tøyet er ferdig.</p>
        </Step>

        {/* Closing CTA: the one Fjord block on the page, sending people back to the form. */}
        <div className="mt-10 flex flex-col items-center gap-5 rounded-3xl bg-fjord p-7 text-center text-sno shadow-[var(--shadow-card)] sm:mt-16 sm:flex-row sm:items-center sm:justify-between sm:p-10 sm:text-left">
          <div>
            <h3 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">Klar til å slippe klesvasken?</h3>
            <p className="mt-2 text-sno/75">De {WAITLIST_OFFER_SPOTS} første på listen får halv pris på første vask når vi åpner.</p>
          </div>
          <a
            href={`#${WAITLIST_ID}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-sol px-6 py-3.5 font-semibold text-fjord shadow-soft transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Sett meg på listen
            <ArrowRight className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
