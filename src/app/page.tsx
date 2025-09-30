export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            <nav className="hidden md:flex gap-8">
              <a href="#slik-virker-det" className="text-medium-gray hover:text-dark-gray font-medium">Slik virker det</a>
              <a href="#priser" className="text-medium-gray hover:text-dark-gray font-medium">Priser</a>
              <a href="#områder" className="text-medium-gray hover:text-dark-gray font-medium">Områder</a>
            </nav>
            <div className="flex gap-3">
              <a href="/auth/login" className="text-nordic-blue font-semibold px-4 py-2 hover:bg-soft-gray rounded-lg">
                Logg inn
              </a>
              <a href="/auth/signup" className="bg-nordic-blue text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-600">
                Kom i gang
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="text-center">
            <h2 className="text-5xl lg:text-6xl font-bold text-dark-gray mb-6 leading-tight">
              Aldri vask klær igjen
            </h2>
            <p className="text-xl text-medium-gray mb-10 max-w-3xl mx-auto leading-relaxed">
              Koble deg til pålitelige lokale rensere i Bergen og Oslo.
              Profesjonell henting og levering som passer din travle hverdag.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/auth/signup" className="bg-nordic-blue text-white font-semibold px-8 py-4 rounded-lg hover:bg-blue-600 text-lg text-center">
                Kom i gang
              </a>
              <a href="/bli-renser" className="border-2 border-nordic-blue text-nordic-blue font-semibold px-8 py-4 rounded-lg hover:bg-blue-50 text-lg text-center block">
                Bli en renser
              </a>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="slik-virker-det" className="bg-soft-gray py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-dark-gray mb-4">Slik virker det</h3>
              <p className="text-xl text-medium-gray">Enkelt i tre steg</p>
            </div>

            <div className="grid md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-nordic-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 11v-1a4 4 0 118 0v1M3 11h18" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-dark-gray mb-3">1. Bestill klesvask</h4>
                <p className="text-medium-gray leading-relaxed">
                  Velg tid som passer deg. Vi kommer og henter vasken hjemme hos deg.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-dark-gray mb-3">2. Vi vasker</h4>
                <p className="text-medium-gray leading-relaxed">
                  Profesjonelle rensere tar vare på klærne dine med største omhu.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-dark-gray mb-3">3. Leveres hjem</h4>
                <p className="text-medium-gray leading-relaxed">
                  Få rene klær levert direkte hjem til deg i løpet av 2-3 dager.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Areas */}
        <section id="områder" className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-4xl font-bold text-dark-gray mb-4">Vi leverer i</h3>
            <p className="text-xl text-medium-gray mb-12">Starter i Norges to største byer</p>

            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="bg-white border-2 border-soft-gray rounded-2xl p-8 hover:border-nordic-blue transition-colors">
                <h4 className="text-2xl font-bold text-dark-gray mb-2">Bergen</h4>
                <p className="text-medium-gray">Tilgjengelig nå</p>
              </div>
              <div className="bg-white border-2 border-soft-gray rounded-2xl p-8 hover:border-nordic-blue transition-colors">
                <h4 className="text-2xl font-bold text-dark-gray mb-2">Oslo</h4>
                <p className="text-medium-gray">Tilgjengelig nå</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="priser" className="bg-soft-gray py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-dark-gray mb-4">Enkel prising</h3>
              <p className="text-xl text-medium-gray">Velg planen som passer deg</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              

              <div className="bg-white rounded-2xl p-8 border border-soft-gray">
                <h4 className="text-2xl font-bold text-dark-gray mb-2">Annenhver uke</h4>
                <p className="text-4xl font-bold text-dark-gray mb-1">249 <span className="text-lg text-medium-gray font-normal">NOK/mnd</span></p>
                <p className="text-medium-gray mb-8">Vaskes annenhver uke</p>
                <a href="/auth/signup" className="block w-full bg-soft-gray text-dark-gray font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors text-center">
                  Velg plan
                </a>
              </div>

              <div className="bg-white rounded-2xl p-8 border-2 border-nordic-blue relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-nordic-blue text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Mest populær
                </div>
                <h4 className="text-2xl font-bold text-dark-gray mb-2">Ukentlig</h4>
                <p className="text-4xl font-bold text-dark-gray mb-1">399 <span className="text-lg text-medium-gray font-normal">NOK/mnd</span></p>
                <p className="text-medium-gray mb-8">Vaskes hver uke</p>
                <a href="/auth/signup" className="block w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors text-center">
                  Velg plan
                </a>
              </div>

              <div className="bg-white rounded-2xl p-8 border border-soft-gray">
                <h4 className="text-2xl font-bold text-dark-gray mb-2">Enkeltvask</h4>
                <p className="text-4xl font-bold text-dark-gray mb-1">149 <span className="text-lg text-medium-gray font-normal">NOK</span></p>
                <p className="text-medium-gray mb-8">Betal per vask</p>
                <a href="/auth/signup" className="block w-full bg-soft-gray text-dark-gray font-semibold py-3 rounded-lg hover:bg-gray-200 transition-colors text-center">
                  Velg plan
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-4xl font-bold text-dark-gray mb-4">Trygg og pålitelig</h3>
              <p className="text-xl text-medium-gray">Norsk kvalitet du kan stole på</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-nordic-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-dark-gray mb-3">Verifiserte rensere</h4>
                <p className="text-medium-gray">
                  Alle våre rensere er bakgrunnssjekket og sertifisert.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-fresh-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-fresh-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-dark-gray mb-3">Forsikret service</h4>
                <p className="text-medium-gray">
                  Full dekning for skader eller tap av klær.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-dark-gray mb-3">Kundefokusert</h4>
                <p className="text-medium-gray">
                  Din tilfredsstillelse er vår høyeste prioritet.
                </p>
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
              <h3 className="text-2xl font-bold text-nordic-blue mb-4">NooraCare</h3>
              <p className="text-gray-400 leading-relaxed">
                Kobler deg med pålitelige lokale rensere i Norge.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Serviceområder</h4>
              <ul className="space-y-3 text-gray-400">
                <li>Bergen</li>
                <li>Oslo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Støtte</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Kontakt oss</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Ofte stilte spørsmål</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Hjelp</a></li>
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
