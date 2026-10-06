import type { Metadata } from 'next';
import { ClipboardList, Coins, Truck } from 'lucide-react';
import { PRICING } from '@/lib/config/pricing';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  SectionHeading,
  StepList,
  comingSoonCard,
} from '@/components/coming-soon/ComingSoonShell';
import { getWaitlistCount } from '@/lib/database/waitlist';

// Pre-launch cleaner landing page. The full page (with signup) is parked at
// /bli-renser/lansering; at launch, move it back here.
export const metadata: Metadata = {
  title: 'Bli renser hos NooraCare | Kommer snart',
  description:
    'Vask tøy hjemme i din egen maskin og tjen penger. NooraCare åpner snart i Bergen og Oslo – få beskjed når du kan registrere deg.',
};

const WHY = [
  {
    icon: Coins,
    title: 'Betalt per oppdrag',
    text: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen på hvert oppdrag.`,
  },
  {
    icon: Truck,
    title: 'Ingen kjøring',
    text: 'Sjåføren vår leverer og henter tøyet hjemme hos deg. Du trenger ikke bil.',
  },
  {
    icon: ClipboardList,
    title: 'Vi tar resten',
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

// Re-read the signup counter every 5 minutes.
export const revalidate = 300;

export default async function CleanerComingSoonPage() {
  const count = await getWaitlistCount('cleaner');

  return (
    <ComingSoonShell switchHref="/" switchLabel="For kunder">
      <ComingSoonHero
        audience="cleaner"
        badge="Bli renser · kommer snart"
        title="Tjen penger på"
        highlight="vaskemaskinen din."
        subtitle="Vask tøy hjemme i din egen maskin. Vi henter og leverer. Få beskjed først når registreringen åpner i Bergen og Oslo."
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
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Slik virker det" title="Et oppdrag, steg for steg" />
          <StepList steps={STEPS} />
        </div>
      </section>
    </ComingSoonShell>
  );
}
