import Link from 'next/link';
import { Wordmark } from '@/components/layout/AppHeader';
import { Footer } from '@/components/landing/Footer';
import { PRICING, formatKr } from '@/lib/config/pricing';
import { ClipboardList, Coins, Package, Truck, WashingMachine } from 'lucide-react';

const primaryPill =
  'inline-flex items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]';

const cardClass =
  'rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur';

const WHY = [
  {
    icon: Coins,
    title: 'Betalt per oppdrag',
    text: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen på hvert oppdrag, utbetalt til bankkontoen din.`,
  },
  {
    icon: Truck,
    title: 'Ingen kjøring',
    text: 'Sjåføren vår leverer tøyet hjem til deg og henter det når det er rent. Du trenger ikke bil.',
  },
  {
    icon: ClipboardList,
    title: 'Prisen regnes ut for deg',
    text: 'Du registrerer antall vask og stryking i dashbordet. Prisen regnes ut automatisk, og kunden betaler med Vipps.',
  },
];

const GET_STARTED = [
  {
    title: 'Opprett konto',
    text: 'Registrer deg med e-post og bekreft e-postadressen din.',
  },
  {
    title: 'Fyll inn profilen',
    text: 'Virksomhet, adressen der du vasker, vaskemaskinen din og litt om deg. Du trenger ikke laste opp dokumenter.',
  },
  {
    title: 'Bli godkjent',
    text: 'Vi går gjennom søknaden innen 1–2 virkedager. Når du er godkjent, får du oppdrag i dashbordet.',
  },
];

const HOW = [
  {
    icon: ClipboardList,
    title: 'Du får et oppdrag',
    text: 'Vi kobler deg til kunder i ditt område. Oppdraget dukker opp i dashbordet ditt.',
  },
  {
    icon: Truck,
    title: 'Sjåføren leverer tøyet',
    text: 'Sjåføren vår henter hos kunden og leverer tøyet hjem til deg.',
  },
  {
    icon: WashingMachine,
    title: 'Du vasker og registrerer',
    text: 'Vask, tørk og brett. Registrer antall vask og eventuell stryking, så settes prisen automatisk.',
  },
  {
    icon: Package,
    title: 'Sjåføren henter det rene tøyet',
    text: 'Marker oppdraget som klart. Sjåføren henter det hos deg og leverer til kunden.',
  },
];

const FAQ = [
  {
    q: 'Hvor kan jeg være renser?',
    a: 'Foreløpig i Bergen og Oslo. Postnummeret ditt må ligge i et av områdene våre.',
  },
  {
    q: 'Hva trenger jeg?',
    a: 'En egen vaskemaskin hjemme og en adresse i Bergen eller Oslo som sjåføren kan levere til og hente fra. Du trenger ikke bil.',
  },
  {
    q: 'Må jeg hente eller levere tøy?',
    a: 'Nei. Sjåføren vår tar all henting og levering. Du vasker hjemme.',
  },
  {
    q: 'Hvor mye tjener jeg?',
    a: `Du får ${PRICING.cleaner_payout_percent} % av totalprisen på hvert oppdrag. Et oppdrag prises med ${formatKr(PRICING.price_per_load_ore)} per vask på 5 kg, pluss eventuell stryking.`,
  },
  {
    q: 'Hvordan får jeg betalt?',
    a: 'Kunden betaler med Vipps når du markerer oppdraget som klart. Din andel utbetales til kontonummeret du oppgir ved registrering.',
  },
  {
    q: 'Hvordan blir jeg godkjent?',
    a: 'Vi går gjennom søknaden din innen 1–2 virkedager. Du ser statusen i dashbordet ditt så snart den er behandlet.',
  },
];

export default function BecomeCleanerPage() {
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

      {/* Marketing nav — same bar metrics as AppHeader (BRANDBOOK §4), with cleaner-specific links. */}
      <header className="sticky top-0 z-30 border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Wordmark />
          <nav className="hidden gap-6 md:flex">
            <a href="#hvorfor" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Hvorfor</a>
            <a href="#slik-virker-det" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Slik virker det</a>
            <a href="#sporsmal" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Spørsmål</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green">
              Logg inn
            </Link>
            <Link
              href="/bli-renser/signup"
              className="inline-flex items-center justify-center rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Registrer deg
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-5">
          <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
                Bli renser
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
                Vask tøy hjemme og tjen penger
              </h1>
              <p className="mt-4 max-w-md text-lg text-medium-gray">
                Vi henter og leverer tøyet. Du vasker det i din egen maskin, når det passer deg,
                og får {PRICING.cleaner_payout_percent} % av prisen for hvert oppdrag.
              </p>
            </div>

            <div
              className={`${cardClass} animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8`}
              style={{ animationDelay: '60ms' }}
            >
              <h2 className="font-serif text-2xl font-semibold text-dark-gray">Kom i gang</h2>
              <p className="mt-3 text-medium-gray">
                Registreringen tar noen minutter. Vi går gjennom søknaden din innen 1–2 virkedager.
              </p>
              <Link href="/bli-renser/signup" className={`${primaryPill} mt-6 w-full`}>
                Start registrering
              </Link>
              <p className="mt-4 text-center text-sm text-medium-gray">
                Har du allerede en konto?{' '}
                <Link href="/auth/login" className="font-medium text-nordic-blue underline-offset-2 hover:underline">
                  Logg inn
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Why */}
        <section id="hvorfor" className="border-y border-cream-dark/60 bg-warm-white/40 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Hvorfor bli NooraCare-renser?
              </h2>
              <p className="mt-3 text-lg text-medium-gray">
                Du vasker. Vi tar kundene, kjøringen og betalingen.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {WHY.map((item) => (
                <div key={item.title} className={cardClass}>
                  <span className="flex size-11 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <item.icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">{item.title}</h3>
                  <p className="mt-2 text-sm text-medium-gray">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Get started */}
        <section id="kom-i-gang" className="py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">Kom i gang</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {GET_STARTED.map((step, index) => (
                <div key={step.title} className="text-center">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-sea-green/12 font-serif text-xl font-semibold text-sea-green">
                    {index + 1}
                  </span>
                  <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">{step.title}</h3>
                  <p className="mt-2 text-sm text-medium-gray">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="slik-virker-det" className="border-y border-cream-dark/60 bg-warm-white/40 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Slik virker et oppdrag
              </h2>
              <p className="mt-3 text-lg text-medium-gray">
                Fra oppdraget dukker opp til det rene tøyet er hentet.
              </p>
            </div>

            <div className="grid items-start gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                {HOW.map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                      <item.icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-dark-gray">{item.title}</h3>
                      <p className="mt-1 text-sm text-medium-gray">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payout example — every number comes from PRICING */}
              <div className={`mx-auto w-full max-w-sm ${cardClass}`}>
                <p className="text-xs uppercase tracking-[0.14em] text-medium-gray">Slik regnes betalingen</p>
                <dl className="mt-4 divide-y divide-cream-dark/60">
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-medium-gray">Vask, per 5 kg</dt>
                    <dd className="font-serif text-lg font-semibold tabular-nums text-dark-gray">
                      {formatKr(PRICING.price_per_load_ore)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-medium-gray">Stryking, per plagg fra</dt>
                    <dd className="font-serif text-lg font-semibold tabular-nums text-dark-gray">
                      {formatKr(PRICING.ironing.everyday)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-medium-gray">Din andel av totalprisen</dt>
                    <dd className="font-serif text-lg font-semibold tabular-nums text-sea-green">
                      {PRICING.cleaner_payout_percent} %
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-medium-gray">
                  Din andel regnes av hele beløpet kunden betaler for oppdraget.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="sporsmal" className="py-16">
          <div className="mx-auto max-w-3xl px-5">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Ofte stilte spørsmål
              </h2>
            </div>

            <div className="space-y-4">
              {FAQ.map((item) => (
                <details key={item.q} className="rounded-2xl border border-cream-dark bg-white p-5">
                  <summary className="cursor-pointer font-medium text-dark-gray">{item.q}</summary>
                  <p className="mt-3 text-sm text-medium-gray">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="rounded-3xl bg-nordic-blue p-8 text-center text-white shadow-[var(--shadow-card)] sm:p-12">
              <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                Klar til å komme i gang?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-lg opacity-90">
                Registreringen tar noen minutter.
              </p>
              <Link
                href="/bli-renser/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-medium text-nordic-blue shadow-soft transition-all hover:bg-cream active:scale-[0.98]"
              >
                Registrer deg
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
