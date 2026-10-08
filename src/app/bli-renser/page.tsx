import type { Metadata } from 'next';
import { ClipboardList, Coins, Truck } from 'lucide-react';
import { CLEANER_MIN_PAYOUT_PER_ORDER_ORE, PRICING, formatKr } from '@/lib/config/pricing';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  CrossPromo,
  FaqList,
  HOW_IT_WORKS_ID,
  SectionHeading,
  StepList,
  comingSoonCard,
} from '@/components/coming-soon/ComingSoonShell';
import { LAUNCH_WINDOW_LABEL } from '@/components/coming-soon/launch';
import { getWaitlistCount } from '@/lib/database/waitlist';
import { pickFaq } from './faq';

// Pre-launch cleaner landing page. The full page (with signup) is parked at
// /bli-renser/lansering; at launch, move it back here.
export const metadata: Metadata = {
  title: 'Bli renser hos NooraCare | Kommer snart',
  description: `Vask tøy hjemme i din egen maskin og tjen minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag. NooraCare åpner snart i Bergen og Oslo – få beskjed når du kan registrere deg.`,
};

const MIN_PAYOUT = formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE);

const WHY = [
  {
    icon: Coins,
    title: 'Betalt per oppdrag',
    text: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen – minst ${MIN_PAYOUT} per oppdrag, rett inn på konto.`,
  },
  {
    icon: Truck,
    title: 'Ingen kjøring',
    text: 'Sjåføren vår leverer og henter tøyet hjemme hos deg. Du trenger ikke bil.',
  },
  {
    icon: ClipboardList,
    title: 'Kunder, pris og betaling',
    text: 'Vi finner kundene, regner ut prisen og tar betalingen med Vipps.',
  },
];

const STEPS = [
  {
    title: 'Du får et oppdrag',
    text: 'Vi kobler deg til kunder i ditt område.',
  },
  {
    title: 'Sjåføren leverer tøyet',
    text: 'Tøyet hentes hos kunden og leveres hjem til deg.',
  },
  {
    title: 'Du vasker hjemme',
    text: 'Vask, tørk og brett i din egen maskin, så tøyet er klart til levering i tide.',
  },
  {
    title: 'Sjåføren henter det rene tøyet',
    text: 'Marker oppdraget som klart, så tar vi det videre til kunden.',
  },
];

// The questions cleaners ask before they commit; the full list lives on the launch page.
const FAQ = pickFaq(['needs', 'turnaround', 'damage', 'payment']);

// Re-read the signup counter every 5 minutes.
export const revalidate = 300;

export default async function CleanerComingSoonPage() {
  const count = await getWaitlistCount('cleaner');

  return (
    <ComingSoonShell audience="cleaner" switchHref="/" switchLabel="For kunder">
      <ComingSoonHero
        audience="cleaner"
        badge={`Bli renser · åpner ${LAUNCH_WINDOW_LABEL}`}
        title="Tjen penger på"
        highlight="vaskemaskinen din."
        subtitle={`Vask tøy hjemme i din egen maskin og tjen minst ${MIN_PAYOUT} per oppdrag. Vi henter og leverer. Få beskjed først når registreringen åpner i Bergen og Oslo.`}
        count={count}
      />

      {/* Why */}
      <section className="border-b border-lin/70 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Hvorfor NooraCare" title="Du vasker. Vi tar resten." />
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
        </div>
      </section>

      {/* How it works */}
      <section id={HOW_IT_WORKS_ID} className="scroll-mt-6 border-b border-lin/70 py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Slik virker det" title="Et oppdrag, steg for steg" />
          <StepList steps={STEPS} />
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Spørsmål og svar" title="Det folk lurer på" />
          <FaqList items={FAQ} />
        </div>
      </section>

      <CrossPromo
        text="Vil du heller slippe klesvasken? Vi henter, en nabo vasker, og vi leverer rent tøy hjem til deg."
        href="/"
        cta="Sett deg på kundelisten"
      />
    </ComingSoonShell>
  );
}
