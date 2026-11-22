import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BedDouble, ShoppingBag, Truck } from 'lucide-react';
import {
  ACCENT_CHIPS,
  ComingSoonHero,
  ComingSoonShell,
  CrossPromo,
  HOW_IT_WORKS_ID,
  comingSoonCard,
} from '@/components/coming-soon/ComingSoonShell';
import { HowItWorksStory } from '@/components/coming-soon/HowItWorksStory';
import { serviceAreaText } from '@/lib/config/postal-codes';
import { CLEANER_MIN_PAYOUT_PER_ORDER_ORE, PRICING, formatKr } from '@/lib/config/pricing';

// Customer landing page: a hero with one «Bestill henting» button, followed by
// the illustrated how-it-works story, the prices and a closing order CTA. The
// order flow requires an account, so the button takes signed-out visitors to
// signup first (src/proxy.ts) and back into the flow afterwards.
// No testimonials until there are real ones.
// The description comes from the root layout.
export const metadata: Metadata = {
  title: 'NooraCare – Slipp klesvasken. En nabo tar den.',
};

const ORDER_HREF = '/orders/wash';

// The per-bag price always carries the order minimum (CLAUDE.md, customer wording).
const PRICES = [
  {
    icon: ShoppingBag,
    title: 'Klær',
    amount: formatKr(PRICING.per_bag_ore),
    unit: 'per pose',
    text: `Vasket, tørket og brettet. Minste bestilling ${formatKr(PRICING.minimum_order_ore)}.`,
  },
  {
    icon: BedDouble,
    title: 'Sengetøy',
    amount: formatKr(PRICING.per_bedding_set_ore),
    unit: 'per sett',
    text: 'Hvert sett vaskes for seg.',
  },
  {
    icon: Truck,
    title: 'Henting og levering',
    amount: formatKr(PRICING.pickup_delivery_fee_ore),
    unit: 'per bestilling',
    text: 'Hentet og levert på døren hjemme hos deg.',
  },
];

function HeroAction() {
  return (
    <div className="text-center lg:text-left">
      <Link
        href={ORDER_HREF}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-7 py-4 text-lg font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] sm:w-auto"
      >
        Bestill henting
        <ArrowRight className="size-5" />
      </Link>
    </div>
  );
}

function Prices() {
  return (
    <section className="pb-16 sm:pb-24">
      <div className="mx-auto max-w-5xl px-5">
        <header className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-frost-deep">Priser</p>
          <h2 className="mt-3 font-serif text-4xl font-semibold leading-[1.08] tracking-tight text-dark-gray sm:text-5xl">
            Du ser prisen før du bestiller
          </h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {PRICES.map((item, index) => (
            <div key={item.title} className={comingSoonCard}>
              <span
                className={`flex size-10 items-center justify-center rounded-full text-fjord ${ACCENT_CHIPS[index % ACCENT_CHIPS.length]}`}
              >
                <item.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-medium-gray">{item.title}</h3>
              <p className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold tabular-nums text-dark-gray">{item.amount}</span>
                <span className="text-sm text-medium-gray">{item.unit}</span>
              </p>
              <p className="mt-2 text-sm text-medium-gray">{item.text}</p>
            </div>
          ))}
        </div>

        <p className="mx-auto mt-6 max-w-2xl text-center text-medium-gray">
          I tillegg kommer et servicegebyr på {formatKr(PRICING.service_fee_ore)}. Du får et estimat når du bestiller,
          og renseren setter den endelige prisen etter henting.{' '}
          <Link
            href="/pris-kalkulator"
            className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-fjord underline decoration-sol decoration-2 underline-offset-4 transition-colors hover:text-sea-green"
          >
            Regn ut prisen din
            <ArrowRight className="size-4" />
          </Link>
        </p>

        {/* Closing CTA: the one Fjord block on the page. */}
        <div className="mt-12 flex flex-col items-center gap-5 rounded-3xl bg-fjord p-7 text-center text-sno shadow-[var(--shadow-card)] sm:mt-16 sm:flex-row sm:items-center sm:justify-between sm:p-10 sm:text-left">
          <div>
            <h2 className="font-serif text-2xl font-semibold leading-tight sm:text-3xl">
              Klar til å slippe klesvasken?
            </h2>
            <p className="mt-2 text-sno/75">Bestillingen tar et par minutter. Du betaler med Vipps når tøyet er ferdig.</p>
          </div>
          <Link
            href={ORDER_HREF}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-sol px-6 py-3.5 font-semibold text-fjord shadow-soft transition-all hover:brightness-105 active:scale-[0.98]"
          >
            Bestill henting
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <ComingSoonShell
      links={[
        { href: `/#${HOW_IT_WORKS_ID}`, label: 'Slik virker det' },
        { href: '/pris-kalkulator', label: 'Priser' },
        { href: '/bli-renser', label: 'Bli renser' },
      ]}
      switchHref="/auth/login"
      switchLabel="Logg inn"
    >
      <ComingSoonHero
        badge={`Nå åpent i ${serviceAreaText()}`}
        title="Nå slipper du"
        highlight="klesvasken."
        subtitle="Vi henter skittentøyet hjemme hos deg, vasker og tørker det, og leverer det rent tilbake på døren."
        action={<HeroAction />}
        image={{
          src: '/images/hero-bench.jpg',
          alt: 'En stabel brettet tøy og en gul klespose på en benk i lyst tre',
          // Keep the bench at the right edge on narrow landscape screens, and
          // its legs in the frame on very wide ones.
          position: '100% 70%',
          // Portrait counterpart for phones, cropped square from the bottom:
          // the bench and the bag, with the wall above them.
          mobileSrc: '/images/hero-bench-mobile.jpg',
          mobilePosition: '50% 100%',
        }}
      />

      <HowItWorksStory />

      <Prices />

      <CrossPromo
        text={`Har du vaskemaskin? Tjen minst ${formatKr(CLEANER_MIN_PAYOUT_PER_ORDER_ORE)} per oppdrag på å vaske for naboene.`}
        href="/bli-renser"
        cta="Bli renser"
      />
    </ComingSoonShell>
  );
}
