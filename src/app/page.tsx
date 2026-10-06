import type { Metadata } from 'next';
import { CalendarClock, Shirt, Truck, WashingMachine, Wallet } from 'lucide-react';
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
export const metadata: Metadata = {
  title: 'NooraCare – Klesvask hentet og levert hjem | Kommer snart',
  description:
    'NooraCare henter, vasker og leverer klesvasken din i Bergen og Oslo. Vi åpner snart – sett deg på ventelisten.',
};

const OFFER = [
  {
    icon: WashingMachine,
    title: 'Vask, tørk og bretting',
    text: 'Hverdagsklær og sengetøy, vasket og ferdig brettet.',
  },
  {
    icon: Shirt,
    title: 'Stryking',
    text: 'Skjorter, kjoler og sengetøy, presset og klart til bruk.',
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
    text: 'En godkjent renser i nærheten vasker, tørker, bretter og stryker.',
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
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <div className="mt-6 flex items-start gap-2 rounded-2xl bg-lin/60 px-3.5 py-2.5 text-sm text-medium-gray">
            <Wallet className="mt-0.5 size-4 shrink-0 text-frost-deep" />
            <p>Du betaler først når tøyet er vasket, og bare for det som faktisk ble vasket.</p>
          </div>
        </div>
      </section>
    </ComingSoonShell>
  );
}
