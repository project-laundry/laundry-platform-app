import Link from 'next/link';
import { Wordmark } from '@/components/layout/AppHeader';
import {
  ClipboardList,
  Coins,
  MapPin,
  Package,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';

export default function BecomeCleanerPage() {
  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-cream-dark/70 bg-warm-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <Wordmark />
          <nav className="hidden gap-6 md:flex">
            <a href="#hvorfor" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Hvorfor</a>
            <a href="#kom-i-gang" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Kom i gang</a>
            <a href="#slik-virker-det" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Slik virker det</a>
            <a href="#sporsmal" className="text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue">Spørsmål</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green">
              Logg inn
            </Link>
            <Link
              href="/bli-renser/signup"
              className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-5 py-2.5 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Registrer deg som renser
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-5">
            <div className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
              {/* Left side - Content */}
              <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
                  Tjen penger ved å rense med NooraCare i Norge
                </h1>
                <p className="mt-4 max-w-md text-lg text-medium-gray">
                  Sett din egen timeplan. Få betalt for hver oppdrag. Koble deg til kunder som trenger dine rensetjenester.
                </p>
              </div>

              {/* Right side - CTA Card */}
              <div
                className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
                style={{ animationDelay: '60ms' }}
              >
                <h3 className="font-serif text-2xl font-semibold text-dark-gray">Bli en renser</h3>
                <p className="mt-3 text-medium-gray">
                  Registrer deg i dag og begynn å tjene penger med dine egne rensetjenester. Prosessen tar bare noen minutter.
                </p>
                <Link
                  href="/bli-renser/signup"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
                >
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
          </div>
        </section>

        {/* Why Become a Cleaner Section */}
        <section id="hvorfor" className="border-y border-cream-dark/60 bg-warm-white/40 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Hvorfor bli en NooraCare renser?
              </h2>
              <p className="mt-3 text-lg text-medium-gray">
                NooraCare gir deg muligheten til å tjene penger når det passer deg, med støtte langs hele veien.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
                <span className="flex size-12 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Coins className="size-6" />
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Fleksibel inntekt</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Bestem selv når du vil jobbe. Tjen penger på dine egne vilkår med konkurransedyktige priser.
                </p>
              </div>

              <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
                <span className="flex size-12 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Smartphone className="size-6" />
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Enkel bruk</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Brukervennlig app som gjør det enkelt å finne oppdrag, kommunisere med kunder og motta betaling.
                </p>
              </div>

              <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
                <span className="flex size-12 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                  <Users className="size-6" />
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Lokalt nettverk</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Bli en del av et lokalt nettverk av rensere og bygg langvarige relasjoner med kunder i ditt område.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started Section */}
        <section id="kom-i-gang" className="py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">Kom i gang</h2>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sea-green/12 font-serif text-xl font-semibold text-sea-green">
                  1
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Registrer deg</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Fyll ut registreringsskjemaet og last opp nødvendige dokumenter. Prosessen tar bare noen minutter.
                </p>
              </div>

              <div className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sea-green/12 font-serif text-xl font-semibold text-sea-green">
                  2
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Last opp dokumenter</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Vi trenger å verifisere identiteten din og bakgrunnen for å sikre trygghet for alle parter.
                </p>
              </div>

              <div className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sea-green/12 font-serif text-xl font-semibold text-sea-green">
                  3
                </span>
                <h3 className="mt-5 font-serif text-lg font-semibold text-dark-gray">Start å arbeide</h3>
                <p className="mt-2 text-sm text-medium-gray">
                  Når du er godkjent, kan du begynne å motta oppdrag og tjene penger med en gang.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How the App Works Section */}
        <section id="slik-virker-det" className="border-y border-cream-dark/60 bg-warm-white/40 py-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Slik fungerer NooraCare renser-appen
              </h2>
              <p className="mt-3 text-lg text-medium-gray">
                Alt du trenger for å administrere oppdragene dine og tjene penger effektivt.
              </p>
            </div>

            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Left side - Phone mockup */}
              <div className="mx-auto w-full max-w-sm rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur">
                <div className="rounded-2xl bg-nordic-blue p-5 text-white">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif font-semibold">Oppdrag i nærheten</h3>
                    <div className="size-3 rounded-full bg-sea-green-light"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-white/20 p-3">
                      <p className="text-sm">Henting: Sandviken</p>
                      <p className="text-xs opacity-75">5 kg • 15 min unna</p>
                    </div>
                    <div className="rounded-2xl bg-white/20 p-3">
                      <p className="text-sm">Levering: Arna</p>
                      <p className="text-xs opacity-75">3 kg • 20 min unna</p>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-between text-center">
                  <div>
                    <p className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">12</p>
                    <p className="text-sm text-medium-gray">Fullførte</p>
                  </div>
                  <div>
                    <p className="font-serif text-2xl font-semibold tabular-nums text-dark-gray">98%</p>
                    <p className="text-sm text-medium-gray">Vurdering</p>
                  </div>
                </div>
              </div>

              {/* Right side - Features */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <ClipboardList className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-dark-gray">Godta oppdrag</h3>
                    <p className="mt-1 text-sm text-medium-gray">
                      Se tilgjengelige oppdrag i ditt område og velg de som passer din timeplan og preferanser.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <MapPin className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-dark-gray">Hent hos kunden</h3>
                    <p className="mt-1 text-sm text-medium-gray">
                      Få veibeskrivelse direkte til kundens adresse og bekreft henting gjennom appen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <Package className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-dark-gray">Lever på nytt</h3>
                    <p className="mt-1 text-sm text-medium-gray">
                      Lever de rene klærne tilbake til kunden og få betalt automatisk gjennom appen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                    <Wallet className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-dark-gray">Tjen penger hver uke</h3>
                    <p className="mt-1 text-sm text-medium-gray">
                      Få utbetalt inntektene dine ukentlig direkte til bankkontoen din.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="sporsmal" className="py-16">
          <div className="mx-auto max-w-3xl px-5">
            <div className="mb-12 text-center">
              <h2 className="font-serif text-3xl font-semibold text-dark-gray sm:text-4xl">
                Ofte stilte spørsmål fra rensere
              </h2>
            </div>

            <div className="space-y-4">
              <details className="rounded-2xl border border-cream-dark bg-white p-5">
                <summary className="cursor-pointer font-medium text-dark-gray">
                  Kan jeg starte å rense med NooraCare i min by?
                </summary>
                <p className="mt-3 text-sm text-medium-gray">
                  For øyeblikket er NooraCare tilgjengelig i Bergen og Oslo. Vi arbeider med å utvide til flere byer i Norge.
                </p>
              </details>

              <details className="rounded-2xl border border-cream-dark bg-white p-5">
                <summary className="cursor-pointer font-medium text-dark-gray">
                  Hvor mye kan jeg tjene som renser med NooraCare?
                </summary>
                <p className="mt-3 text-sm text-medium-gray">
                  Inntektene varierer basert på antall oppdrag du fullfører og størrelsen på hver order. Aktive rensere tjener typisk mellom 200-800 NOK per dag.
                </p>
              </details>

              <details className="rounded-2xl border border-cream-dark bg-white p-5">
                <summary className="cursor-pointer font-medium text-dark-gray">
                  Trenger jeg egen bil for å være renser?
                </summary>
                <p className="mt-3 text-sm text-medium-gray">
                  Nei, du kan bruke offentlig transport, sykkel eller gå til fots for kortere avstander. Mange av våre rensere bruker ikke bil.
                </p>
              </details>

              <details className="rounded-2xl border border-cream-dark bg-white p-5">
                <summary className="cursor-pointer font-medium text-dark-gray">
                  Er å rense med NooraCare sikkert?
                </summary>
                <p className="mt-3 text-sm text-medium-gray">
                  Ja, alle kunder er verifisert og vi har 24/7 støtte. Du kan også se kundevurderinger før du godtar et oppdrag.
                </p>
              </details>

              <details className="rounded-2xl border border-cream-dark bg-white p-5">
                <summary className="cursor-pointer font-medium text-dark-gray">
                  Hvor ofte får jeg betalt for å rense med NooraCare?
                </summary>
                <p className="mt-3 text-sm text-medium-gray">
                  Du får utbetalt inntektene dine hver uke direkte til bankkontoen din via Vipps eller bankoverføring.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="pb-16">
          <div className="mx-auto max-w-5xl px-5">
            <div className="rounded-3xl bg-nordic-blue p-8 shadow-[var(--shadow-card)] sm:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-2">
                <div className="text-left text-white">
                  <h2 className="font-serif text-3xl font-semibold leading-tight sm:text-4xl">
                    Vær din egen sjef. Start å rense og tjen!
                  </h2>
                  <p className="mt-4 text-lg opacity-90">
                    Registrer deg i dag og begynn å tjene penger med dine egne rensetjenester.
                  </p>
                  <Link
                    href="/bli-renser/signup"
                    className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 font-medium text-nordic-blue shadow-soft transition-all hover:bg-cream active:scale-[0.98]"
                  >
                    Registrer deg
                  </Link>
                </div>

                {/* Mini phone mockup */}
                <div className="mx-auto w-full max-w-xs rounded-3xl bg-warm-white p-5 shadow-[var(--shadow-card)]">
                  <div className="rounded-2xl bg-nordic-blue p-4 text-center text-white">
                    <h3 className="font-serif font-semibold">Få online</h3>
                    <div className="mt-2 rounded-full bg-white/20 py-2">
                      <p className="text-sm">3 oppdrag tilgjengelig</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-medium-gray">Denne uken</span>
                      <span className="font-serif font-semibold tabular-nums text-dark-gray">1 450 NOK</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-medium-gray">Total</span>
                      <span className="font-serif font-semibold tabular-nums text-dark-gray">12 890 NOK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-cream-dark/70 bg-warm-white/70 py-16 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="mb-4 block font-serif text-2xl font-semibold text-nordic-blue">NooraCare</Link>
              <p className="text-sm text-medium-gray">
                Kobler deg med pålitelige lokale rensere i Norge.
              </p>
            </div>
            <div>
              <h4 className="mb-4 font-serif text-lg font-semibold text-dark-gray">NooraCare</h4>
              <ul className="space-y-3 text-sm text-medium-gray">
                <li><a href="/auth/signup" className="transition-colors hover:text-nordic-blue">Bruk NooraCare</a></li>
                <li><a href="#" className="transition-colors hover:text-nordic-blue">Priser</a></li>
                <li><a href="#" className="transition-colors hover:text-nordic-blue">Serviceområder</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-serif text-lg font-semibold text-dark-gray">Partner med NooraCare</h4>
              <ul className="space-y-3 text-sm text-medium-gray">
                <li><a href="/bli-renser" className="transition-colors hover:text-nordic-blue">Bli en renser</a></li>
                <li><a href="#" className="transition-colors hover:text-nordic-blue">Renseverktøy</a></li>
                <li><a href="#" className="transition-colors hover:text-nordic-blue">Ressurser</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-serif text-lg font-semibold text-dark-gray">Selskap</h4>
              <ul className="space-y-3 text-sm text-medium-gray">
                <li><a href="#" className="transition-colors hover:text-nordic-blue">Om oss</a></li>
                <li><Link href="/personvern-renser" className="transition-colors hover:text-nordic-blue">Personvern</Link></li>
                <li><Link href="/salgsvilkar" className="transition-colors hover:text-nordic-blue">Vilkår</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-cream-dark/60 pt-8 text-center text-sm text-medium-gray">
            <p>&copy; 2024 NooraCare. Alle rettigheter forbeholdt.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
