import Link from 'next/link';

export default function BecomeCleanerPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <nav className="hidden md:flex gap-8">
              <a href="#hvorfor" className="text-medium-gray hover:text-dark-gray font-medium">Hvorfor</a>
              <a href="#kom-i-gang" className="text-medium-gray hover:text-dark-gray font-medium">Kom i gang</a>
              <a href="#slik-virker-det" className="text-medium-gray hover:text-dark-gray font-medium">Slik virker det</a>
              <a href="#sporsmal" className="text-medium-gray hover:text-dark-gray font-medium">Spørsmål</a>
            </nav>
            <div className="flex gap-3">
              <a href="/auth/login" className="text-nordic-blue font-semibold px-4 py-2 hover:bg-soft-gray rounded-lg">
                Logg inn
              </a>
              <a href="/bli-renser/business" className="bg-nordic-blue text-white font-semibold px-6 py-2 rounded-lg">
                Registrer deg som renser
              </a>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 py-20 lg:py-28 items-center">
              {/* Left side - Content */}
              <div>
                <h1 className="text-5xl lg:text-6xl font-bold text-dark-gray mb-6 leading-tight">
                  Tjen penger ved å rense med NooraCare i Norge
                </h1>
                <p className="text-xl text-medium-gray mb-10 leading-relaxed">
                  Sett din egen timeplan. Få betalt for hver oppdrag. Koble deg til kunder som trenger dine rensetjenester.
                </p>                
              </div>

              {/* Right side - Registration Form */}
              <div className="bg-white rounded-2xl shadow-lg border border-soft-gray p-8">
                <h3 className="text-2xl font-bold text-dark-gray mb-6">Bli en renser</h3>
                <form action="/bli-renser/business" method="GET" className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="Fornavn"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Etternavn"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      name="email"
                      placeholder="E-postadresse"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Telefonnummer"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                  <div>
                    <select name="city" required className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue text-medium-gray">
                      <option value="">Velg din by</option>
                      <option value="bergen">Bergen</option>
                      <option value="oslo">Oslo</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg"
                  >
                    Start registrering
                  </button>
                </form>
                <p className="text-sm text-medium-gray mt-4 text-center">
                  Har du allerede en konto? <a href="/auth/login" className="text-nordic-blue hover:underline">Logg inn</a>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Become a Cleaner Section */}
        <section id="hvorfor" className="bg-soft-gray py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-dark-gray mb-4">Hvorfor bli en NooraCare renser?</h2>
              <p className="text-xl text-medium-gray">
                NooraCare gir deg muligheten til å tjene penger når det passer deg, med støtte langs hele veien.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-16 h-16 bg-nordic-blue/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Fleksibel inntekt</h3>
                <p className="text-medium-gray">
                  Bestem selv når du vil jobbe. Tjen penger på dine egne vilkår med konkurransedyktige priser.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Enkel bruk</h3>
                <p className="text-medium-gray">
                  Brukervennlig app som gjør det enkelt å finne oppdrag, kommunisere med kunder og motta betaling.
                </p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Lokalt nettverk</h3>
                <p className="text-medium-gray">
                  Bli en del av et lokalt nettverk av rensere og bygg langvarige relasjoner med kunder i ditt område.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started Section */}
        <section id="kom-i-gang" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-dark-gray mb-4">Kom i gang</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-nordic-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-nordic-blue">1</span>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Registrer deg</h3>
                <p className="text-medium-gray">
                  Fyll ut registreringsskjemaet og last opp nødvendige dokumenter. Prosessen tar bare noen minutter.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-fresh-green">2</span>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Last opp dokumenter</h3>
                <p className="text-medium-gray">
                  Vi trenger å verifisere identiteten din og bakgrunnen for å sikre trygghet for alle parter.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-success-green">3</span>
                </div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">Start å arbeide</h3>
                <p className="text-medium-gray">
                  Når du er godkjent, kan du begynne å motta oppdrag og tjene penger med en gang.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How the App Works Section */}
        <section id="slik-virker-det" className="bg-soft-gray py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-dark-gray mb-4">Slik fungerer NooraCare renser-appen</h2>
              <p className="text-xl text-medium-gray">
                Alt du trenger for å administrere oppdragene dine og tjene penger effektivt.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left side - Phone mockup */}
              <div className="bg-white rounded-3xl p-8 shadow-lg max-w-sm mx-auto">
                <div className="bg-nordic-blue rounded-2xl p-6 text-white mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Oppdrag i nærheten</h3>
                    <div className="w-3 h-3 bg-fresh-green rounded-full"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-white/20 rounded-lg p-3">
                      <p className="text-sm">Henting: Sandviken</p>
                      <p className="text-xs opacity-75">5 kg • 15 min unna</p>
                    </div>
                    <div className="bg-white/20 rounded-lg p-3">
                      <p className="text-sm">Levering: Arna</p>
                      <p className="text-xs opacity-75">3 kg • 20 min unna</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between text-center">
                  <div>
                    <p className="text-2xl font-bold text-dark-gray">12</p>
                    <p className="text-sm text-medium-gray">Fullførte</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-dark-gray">98%</p>
                    <p className="text-sm text-medium-gray">Vurdering</p>
                  </div>
                </div>
              </div>

              {/* Right side - Features */}
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-nordic-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-gray mb-2">Godta oppdrag</h3>
                    <p className="text-medium-gray">
                      Se tilgjengelige oppdrag i ditt område og velg de som passer din timeplan og preferanser.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-fresh-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-gray mb-2">Hent hos kunden</h3>
                    <p className="text-medium-gray">
                      Få veibeskrivelse direkte til kundens adresse og bekreft henting gjennom appen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-success-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-gray mb-2">Lever på nytt</h3>
                    <p className="text-medium-gray">
                      Lever de rene klærne tilbake til kunden og få betalt automatisk gjennom appen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-warning-orange/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-6 h-6 text-warning-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-dark-gray mb-2">Tjen penger hver uke</h3>
                    <p className="text-medium-gray">
                      Få utbetalt inntektene dine ukentlig direkte til bankkontoen din.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="sporsmal" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-dark-gray mb-4">Ofte stilte spørsmål fra rensere</h2>
            </div>

            <div className="space-y-6">
              <details className="bg-white border border-soft-gray rounded-lg p-6">
                <summary className="font-semibold text-dark-gray cursor-pointer">
                  Kan jeg starte å rense med NooraCare i min by?
                </summary>
                <p className="mt-4 text-medium-gray">
                  For øyeblikket er NooraCare tilgjengelig i Bergen og Oslo. Vi arbeider med å utvide til flere byer i Norge.
                </p>
              </details>

              <details className="bg-white border border-soft-gray rounded-lg p-6">
                <summary className="font-semibold text-dark-gray cursor-pointer">
                  Hvor mye kan jeg tjene som renser med NooraCare?
                </summary>
                <p className="mt-4 text-medium-gray">
                  Inntektene varierer basert på antall oppdrag du fullfører og størrelsen på hver order. Aktive rensere tjener typisk mellom 200-800 NOK per dag.
                </p>
              </details>

              <details className="bg-white border border-soft-gray rounded-lg p-6">
                <summary className="font-semibold text-dark-gray cursor-pointer">
                  Trenger jeg egen bil for å være renser?
                </summary>
                <p className="mt-4 text-medium-gray">
                  Nei, du kan bruke offentlig transport, sykkel eller gå til fots for kortere avstander. Mange av våre rensere bruker ikke bil.
                </p>
              </details>

              <details className="bg-white border border-soft-gray rounded-lg p-6">
                <summary className="font-semibold text-dark-gray cursor-pointer">
                  Er å rense med NooraCare sikkert?
                </summary>
                <p className="mt-4 text-medium-gray">
                  Ja, alle kunder er verifisert og vi har 24/7 støtte. Du kan også se kundevurderinger før du godtar et oppdrag.
                </p>
              </details>

              <details className="bg-white border border-soft-gray rounded-lg p-6">
                <summary className="font-semibold text-dark-gray cursor-pointer">
                  Hvor ofte får jeg betalt for å rense med NooraCare?
                </summary>
                <p className="mt-4 text-medium-gray">
                  Du får utbetalt inntektene dine hver uke direkte til bankkontoen din via Vipps eller bankoverføring.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="bg-nordic-blue py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-white text-left lg:text-left">
                <h2 className="text-4xl font-bold mb-4">Vær din egen sjef. Start å rense og tjen!</h2>
                <p className="text-xl opacity-90 mb-8">
                  Registrer deg i dag og begynn å tjene penger med dine egne rensetjenester.
                </p>
                <a href="/bli-renser/business" className="bg-white text-nordic-blue font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 text-lg">
                  Registrer deg
                </a>
              </div>

              {/* Mini phone mockup */}
              <div className="bg-white rounded-2xl p-6 max-w-xs mx-auto shadow-lg">
                <div className="bg-nordic-blue rounded-xl p-4 text-white text-center">
                  <h3 className="font-bold mb-2">Få online</h3>
                  <div className="bg-white/20 rounded-lg py-2">
                    <p className="text-sm">3 oppdrag tilgjengelig</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-medium-gray">Denne uken</span>
                    <span className="font-bold text-dark-gray">1 450 NOK</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-medium-gray">Total</span>
                    <span className="font-bold text-dark-gray">12 890 NOK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-dark-gray text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link href="/" className="text-2xl font-bold text-nordic-blue mb-4 block">NooraCare</Link>
              <p className="text-gray-400 leading-relaxed">
                Kobler deg med pålitelige lokale rensere i Norge.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">NooraCare</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/auth/signup" className="hover:text-white transition-colors">Bruk NooraCare</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Priser</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Serviceområder</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Partner med NooraCare</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="/bli-renser" className="hover:text-white transition-colors">Bli en renser</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Renseverktøy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ressurser</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Selskap</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Om oss</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Personvern</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Vilkår</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 NooraCare. Alle rettigheter forbeholdt.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}