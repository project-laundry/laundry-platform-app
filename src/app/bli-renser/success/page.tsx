export default function RegistrationSuccessPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-nordic-blue">RenVask</a>
            <div className="text-sm text-success-green font-medium">
              Registrering fullført!
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Section */}
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 bg-success-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-success-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-dark-gray mb-4">
            Takk for din interesse!
          </h1>
          <p className="text-xl text-medium-gray mb-8">
            Din søknad for å bli renser hos RenVask er mottatt og vil bli gjennomgått av vårt team.
          </p>

          {/* What happens next */}
          <div className="bg-soft-gray rounded-lg p-8 mb-8 text-left">
            <h2 className="text-2xl font-bold text-dark-gray mb-6 text-center">Hva skjer videre?</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-nordic-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-nordic-blue font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-gray mb-2">Gjennomgang av søknad</h3>
                  <p className="text-medium-gray">
                    Vi gjennomgår all informasjonen du har oppgitt og kontrollerer at alt er i orden.
                    Dette tar vanligvis 1-2 virkedager.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-fresh-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-fresh-green font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-gray mb-2">Verifisering</h3>
                  <p className="text-medium-gray">
                    Vi verifiserer identiteten din og kontrollerer referanser for å sikre trygghet for alle parter.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-success-green/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-success-green font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-dark-gray mb-2">Godkjenning og onboarding</h3>
                  <p className="text-medium-gray">
                    Når alt er godkjent får du tilgang til renser-portalen og kan begynne å motta oppdrag!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border border-soft-gray rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-dark-gray mb-4">Har du spørsmål?</h3>
            <p className="text-medium-gray mb-4">
              Vi er her for å hjelpe deg gjennom prosessen. Ta gjerne kontakt hvis du har spørsmål.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-dark-gray">support@renvask.no</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-nordic-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-dark-gray">+47 12 34 56 78</span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-warning-orange/10 border border-warning-orange/20 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-warning-orange flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="text-left">
                <h4 className="font-medium text-dark-gray mb-2">Viktig informasjon</h4>
                <p className="text-sm text-medium-gray">
                  Du vil motta en bekreftelse på e-post innen 24 timer. Sjekk også spam-mappen din
                  hvis du ikke finner den i innboksen.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <a
              href="/"
              className="w-full bg-nordic-blue text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-600 inline-block"
            >
              Tilbake til forsiden
            </a>
            <a
              href="/auth/login"
              className="w-full border border-soft-gray text-medium-gray font-medium py-3 px-6 rounded-lg hover:bg-soft-gray inline-block"
            >
              Logg inn på eksisterende konto
            </a>
          </div>

          {/* Social Proof */}
          <div className="mt-12 text-center">
            <p className="text-sm text-medium-gray mb-4">
              Bli en del av vårt voksende nettverk av rensere
            </p>
            <div className="flex justify-center items-center gap-8 text-sm text-medium-gray">
              <div>
                <div className="text-2xl font-bold text-nordic-blue">150+</div>
                <div>Aktive rensere</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-fresh-green">98%</div>
                <div>Kundetilfredshet</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success-green">24/7</div>
                <div>Støtte</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}