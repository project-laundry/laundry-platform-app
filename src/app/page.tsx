import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Truck, Users, Wallet } from 'lucide-react';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  CrossPromo,
  FaqList,
  HOW_IT_WORKS_ID,
  SectionHeading,
  StepList,
  WAITLIST_ID,
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

// Every claim on this page must hold for a neighbor washing in a home machine
// and a driver doing the pickup: no turnaround promises, no free delivery, no
// ironing, no quality guarantee, and the per-bag price never without the
// order minimum (CLAUDE.md).
const PER_BAG = formatKr(PRICING.per_bag_ore);
const MIN_ORDER = formatKr(PRICING.minimum_order_ore);

const WHY = [
  {
    icon: Truck,
    title: 'Hentet og levert på døren',
    text: 'Sjåføren vår henter posene hjemme hos deg og leverer tøyet rent tilbake.',
  },
  {
    icon: Users,
    title: 'En godkjent renser i området',
    text: 'Tøyet vaskes, tørkes og brettes av en lokal renser i egen maskin – ikke på et anonymt vaskeri.',
  },
  {
    icon: Wallet,
    title: 'Enkel pris, betal med Vipps',
    text: `${PER_BAG} per pose, minste bestilling ${MIN_ORDER}. Du betaler når tøyet er ferdig. Ingen binding.`,
  },
];

const STEPS = [
  {
    title: 'Du bestiller',
    text: 'Velg hva som skal vaskes, hvor mange poser og når det passer å hente.',
  },
  {
    title: 'Sjåføren henter på døren',
    text: 'Sett posene klare, så henter sjåføren vår dem på dagen du valgte.',
  },
  {
    title: 'En renser vasker',
    text: 'En godkjent renser i nærheten vasker, tørker og bretter i sin egen maskin.',
  },
  {
    title: 'Rent tilbake på døren',
    text: 'Vi leverer tøyet hjem til deg, og du betaler med Vipps når det er ferdig.',
  },
];

// The questions customers ask before they sign up.
const FAQ = [
  {
    q: 'Hva koster det?',
    a: `${PER_BAG} per pose, minste bestilling ${MIN_ORDER}. Du ser et prisestimat når du bestiller, og renseren setter den endelige prisen ut fra hvor mye tøy det faktisk er. Du betaler med Vipps når tøyet er ferdig.`,
  },
  {
    q: 'Hvem vasker tøyet mitt?',
    a: 'En godkjent renser i området ditt, i sin egen vaskemaskin. Du ser hvem som tar oppdraget så snart det er bekreftet.',
  },
  {
    q: 'Hva kan jeg sende?',
    a: 'Hverdagsklær og sengetøy som tåler vanlig maskinvask. Legg ved en beskjed hvis noe trenger ekstra omtanke, så får renseren den.',
  },
  {
    q: 'Må jeg binde meg?',
    a: 'Nei. Du kan bestille én gang eller sette opp fast henting, og avslutte når du vil.',
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
        offer={{
          title: 'Halv pris på første vask',
          detail: `for de ${WAITLIST_OFFER_SPOTS} første på listen`,
        }}
        count={count}
      />

      {/* Why */}
      <section className="border-b border-lin/70 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Hvorfor NooraCare" title="Vi henter. En nabo vasker. Vi leverer." />
          <div className="grid gap-3 sm:grid-cols-3">
            {WHY.map((item, index) => (
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
          <p className="mt-4 text-sm text-medium-gray">
            <Link
              href="/pris-kalkulator"
              className="inline-flex items-center gap-1 font-medium text-fjord underline decoration-sol decoration-2 underline-offset-4 transition-colors hover:text-sea-green"
            >
              Se full prisliste
              <ArrowRight className="size-4" />
            </Link>
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id={HOW_IT_WORKS_ID} className="scroll-mt-6 border-b border-lin/70 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Slik virker det" title="Fra skittentøy til rent, steg for steg" />
          <StepList steps={STEPS} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Spørsmål og svar" title="Det folk lurer på" />
          <FaqList items={FAQ} />

          {/* Closing CTA: the one Fjord block on the page, sending people back
              up to the form so nobody has to scroll to find it. */}
          <div className="mt-10 flex flex-col items-center gap-5 rounded-3xl bg-fjord p-7 text-center text-sno shadow-[var(--shadow-card)] sm:flex-row sm:justify-between sm:p-10 sm:text-left">
            <div>
              <h3 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
                Klar til å slippe klesvasken?
              </h3>
              <p className="mt-2 text-sno/75">
                De {WAITLIST_OFFER_SPOTS} første på listen får halv pris på første vask når vi åpner.
              </p>
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

      <CrossPromo
        text={`Har du vaskemaskin? Tjen minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag på å vaske for naboene.`}
        href="/bli-renser"
        cta="Bli renser"
      />
    </ComingSoonShell>
  );
}
