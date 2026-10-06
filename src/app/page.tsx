import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarClock, Truck, Wallet, WashingMachine } from 'lucide-react';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  CrossPromo,
  HOW_IT_WORKS_ID,
  SectionHeading,
  StepList,
  comingSoonCard,
} from '@/components/coming-soon/ComingSoonShell';
import { LAUNCH_WINDOW_LABEL, WAITLIST_OFFER_SPOTS } from '@/components/coming-soon/launch';
import { CLEANER_MIN_PAYOUT_PER_ORDER_ORE, PRICING, formatKr } from '@/lib/config/pricing';
import { getWaitlistCount } from '@/lib/database/waitlist';

// Pre-launch landing page. The full landing page is parked at /lansering;
// at launch, move src/app/lansering/page.tsx back here.
// The description comes from the root layout.
export const metadata: Metadata = {
  title: 'NooraCare – Slipp klesvasken. En nabo tar den.',
};

// Direct, concrete titles — what the service is, not how it feels.
const OFFER = [
  {
    icon: WashingMachine,
    title: 'Vask, tørk og bretting',
    text: 'Hverdagsklær og sengetøy, vasket og ferdig brettet.',
  },
  {
    icon: Truck,
    title: 'Henting og levering',
    text: 'Vi henter tøyet hjemme hos deg og leverer det rent tilbake på døren.',
  },
  {
    icon: CalendarClock,
    title: 'Fast eller én gang',
    text: 'Hver uke, annenhver uke, hver måned – eller bare når du trenger det.',
  },
];

const STEPS = [
  {
    title: 'Bestill henting',
    text: 'Fortell oss hva som skal vaskes, og velg dag for henting.',
  },
  {
    title: 'Vi henter tøyet',
    text: 'Sjåføren vår henter posene hjemme hos deg.',
  },
  {
    title: 'En lokal renser vasker',
    text: 'En godkjent renser i nærheten vasker, tørker og bretter.',
  },
  {
    title: 'Rent tøy tilbake',
    text: 'Vi leverer tøyet hjem, og du betaler enkelt med Vipps.',
  },
];

// Re-read the signup counter every 5 minutes.
export const revalidate = 300;

export default async function ComingSoonPage() {
  const count = await getWaitlistCount('customer');

  return (
    <ComingSoonShell audience="customer" switchHref="/bli-renser" switchLabel="Bli renser">
      <ComingSoonHero
        audience="customer"
        badge={`Åpner i Bergen og Oslo ${LAUNCH_WINDOW_LABEL}`}
        title="Snart slipper du"
        highlight="klesvasken."
        subtitle="En godkjent renser i området vasker tøyet ditt. Vi henter og leverer hjem til deg. Sett deg på listen, så får du beskjed først."
        offer={{ title: 'Halv pris på første vask', detail: `for de ${WAITLIST_OFFER_SPOTS} første på listen` }}
        count={count}
      />

      {/* What you get */}
      <section className="border-b border-lin/70 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Dette tilbyr vi" title="Hele klesvasken, tatt hånd om" />
          <div className="grid gap-3 sm:grid-cols-3">
            {OFFER.map((item, index) => (
              <div key={item.title} className={comingSoonCard}>
                <span
                  className={`flex size-10 items-center justify-center rounded-full text-fjord ${ACCENT_CHIPS[index % ACCENT_CHIPS.length]}`}
                >
                  <item.icon className="size-5" />
                </span>
                <h3 className="mt-3 font-serif text-lg font-semibold text-dark-gray">{item.title}</h3>
                <p className="mt-1 text-sm text-medium-gray">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Price anchor — nobody joins a list for a service they can't price. */}
          <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-cream/70 px-4 py-3.5 text-sm text-medium-gray sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 size-4 shrink-0 text-frost-deep" />
              <p>
                <span className="font-serif text-base font-semibold text-dark-gray">
                  {formatKr(PRICING.per_bag_ore)} per pose, minste bestilling{' '}
                  <span className="whitespace-nowrap">{formatKr(PRICING.minimum_order_ore)}</span>.
                </span>{' '}
                Du betaler med Vipps når tøyet er ferdig vasket. Ingen binding.
              </p>
            </div>
            <Link
              href="/pris-kalkulator"
              className="inline-flex shrink-0 items-center gap-1.5 self-start font-medium text-nordic-blue transition-colors hover:text-sea-green sm:self-auto"
            >
              Se full prisliste
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id={HOW_IT_WORKS_ID} className="scroll-mt-6 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Slik virker det" title="Fire steg til rent tøy" />
          <StepList steps={STEPS} />
        </div>
      </section>

      <CrossPromo
        eyebrow="Har du vaskemaskin?"
        title="Tjen penger på å vaske for naboene"
        text={`Du tjener minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag, og sjåføren vår tar all henting og levering.`}
        href="/bli-renser"
        cta="Bli renser"
      />
    </ComingSoonShell>
  );
}
