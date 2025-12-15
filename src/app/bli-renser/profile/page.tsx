import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-medium-gray">
              Steg 5 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-medium-gray">Fremdrift</span>
            <span className="text-sm text-medium-gray">100%</span>
          </div>
          <div className="w-full bg-soft-gray rounded-full h-2">
            <div className="bg-success-green h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-gray mb-4">
              Fullfør profilen din
            </h1>
            <p className="text-lg text-medium-gray">
              Last opp et profilbilde og fortell litt om deg selv for å bygge tillit med kundene.
            </p>
          </div>

          <form action="/bli-renser/success" method="GET" className="space-y-8">
            {/* Profile Picture / Logo */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Profilbilde eller logo</h3>
              <p className="text-sm text-medium-gray mb-4">
                Et profesjonelt bilde eller logo hjelper kunder å kjenne deg igjen og skaper tillit.
              </p>

              <div className="flex items-start gap-6">
                {/* Image Upload Area */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 border-2 border-dashed border-soft-gray rounded-lg flex items-center justify-center bg-soft-gray/30">
                    <div className="text-center">
                      <svg className="w-8 h-8 text-medium-gray mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-xs text-medium-gray">Ditt bilde</p>
                    </div>
                  </div>
                </div>

                {/* Upload Options */}
                <div className="flex-1">
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="profileImage"
                    />
                    <label
                      htmlFor="profileImage"
                      className="block w-full text-center bg-nordic-blue text-white px-4 py-3 rounded-lg cursor-pointer"
                    >
                      Last opp bilde
                    </label>
                    <p className="text-sm text-medium-gray text-center">
                      JPG, PNG eller GIF (maks 5MB)<br />
                      Anbefalt størrelse: 400x400 piksler
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Fortell om deg selv</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-dark-gray mb-2">
                    Visningsnavn *
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    placeholder="Hvordan vil du at kunder skal se deg? (f.eks. 'Anna' eller 'Bergen Rensetjeneste')"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  />
                  <p className="text-sm text-medium-gray mt-1">
                    Dette navnet vises til kunder når de ser profilen din
                  </p>
                </div>                
              </div>
            </div>

            {/* Experience */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Erfaring</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-dark-gray mb-2">
                    Hvor lang erfaring har du med rengjøring? *
                  </label>
                  <select
                    id="experience"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  >
                    <option value="">Velg erfaringsnivå</option>
                    <option value="beginner">Nybegynner - Jeg lærer fortsatt</option>
                    <option value="some">Noe erfaring - 1-2 år</option>
                    <option value="experienced">Erfaren - 3-5 år</option>
                    <option value="expert">Ekspert - 5+ år</option>
                    <option value="professional">Profesjonell - Jeg driver eget rengjøringsfirma</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-3">
                    Hvilke typer klær har du mest erfaring med? (valgfritt)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Hverdagsklær (t-skjorter, jeans, etc.)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Forretningsklær (skjorter, dresser, etc.)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Delikate stoffer (silke, ull, etc.)</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Sportsklær og aktivitetstøy</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Barnetøy</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                      />
                      <span className="ml-3 text-dark-gray">Sengetøy og håndklær</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-dark-gray mb-3">
                Hvilke språk snakker du? *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    defaultChecked
                  />
                  <span className="ml-3 text-dark-gray">Norsk</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Engelsk</span>
                </label>                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Annet språk</span>
                </label>
              </div>
            </div>

            {/* Final Review */}
            <div className="bg-soft-gray rounded-lg p-6">
              <h3 className="text-lg font-medium text-dark-gray mb-4">Før du sender inn</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-success-green rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-dark-gray">Kontaktinformasjon er fylt ut</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-success-green rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-dark-gray">Virksomhet og juridisk informasjon</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-success-green rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-dark-gray">Tjenester og serviceområde</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-success-green rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-dark-gray">Informasjon om vaskemaskinen</span>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-warning-orange rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <span className="text-dark-gray">Profil og presentasjon (nåværende steg)</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-lg border border-warning-orange/20">
                <h4 className="font-medium text-dark-gray mb-2">Hva skjer videre?</h4>
                <ul className="text-sm text-medium-gray space-y-1">
                  <li>• Vi gjennomgår søknaden din innen 1-2 virkedager</li>
                  <li>• Du får beskjed på e-post når profilen din er godkjent</li>
                  <li>• Du kan da begynne å motta oppdrag gjennom NooraCare-appen</li>
                </ul>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <a
                href="/bli-renser/equipment"
                className="px-6 py-3 border border-soft-gray text-medium-gray font-medium rounded-lg hover:bg-soft-gray"
              >
                Tilbake
              </a>
              <button
                type="submit"
                className="px-8 py-3 bg-success-green text-white font-medium rounded-lg hover:bg-green-600 text-lg"
              >
                Send inn søknad
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}