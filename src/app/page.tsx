import type { Metadata } from 'next';
import { CalendarClock, Truck, WashingMachine } from 'lucide-react';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  SectionHeading,
  StepList,
  comingSoonCard,
} from '@/components/coming-soon/ComingSoonShell';
import { getWaitlistCount } from '@/lib/database/waitlist';

// Pre-launch landing page. The full landing page is parked at /lansering;
// at launch, move src/app/lansering/page.tsx back here.
// The description comes from the root layout.
export const metadata: Metadata = {
  title: 'NooraCare – Slipp klesvasken. En nabo tar den.',
};

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
    text: 'Vi leverer tøyet hjem. Du betaler med Vipps for det som faktisk ble vasket.',
  },
];

// Re-read the signup counter every 5 minutes.
export const revalidate = 300;

export default async function ComingSoonPage() {
  const count = await getWaitlistCount('customer');

  return (
    <ComingSoonShell switchHref="/bli-renser" switchLabel="Bli renser">
      <ComingSoonHero
        audience="customer"
        badge="Kommer snart til Bergen og Oslo"
        title="Snart slipper du"
        highlight="klesvasken."
        subtitle="Vi henter, vasker og leverer tøyet ditt hjem. Sett deg på listen, så får du beskjed først når vi åpner."
        count={count}
      />

      {/* What we offer */}
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
        </div>
      </section>

      {/* How it works */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-5">
          <SectionHeading eyebrow="Slik virker det" title="Fire steg til rent tøy" />
          <StepList steps={STEPS} />
        </div>
      </section>
    </ComingSoonShell>
  );
}
