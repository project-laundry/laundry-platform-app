export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</a>
            <div className="text-sm text-medium-gray">
              Steg 3 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-medium-gray">Fremdrift</span>
            <span className="text-sm text-medium-gray">60%</span>
          </div>
          <div className="w-full bg-soft-gray rounded-full h-2">
            <div className="bg-nordic-blue h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-gray mb-4">
              Tjenester du tilbyr
            </h1>
            <p className="text-lg text-medium-gray">
              Fortell oss om rensetjenestene du tilbyr og ditt serviceområde.
            </p>
          </div>

          <form action="/bli-renser/equipment" method="GET" className="space-y-8">
            {/* Base Address */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Basisadresse</h3>
              <p className="text-sm text-medium-gray mb-4">
                Hvor er vaskemaskinen din plassert? Dette blir utgangspunktet for ditt serviceområde.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="baseStreet" className="block text-sm font-medium text-dark-gray mb-2">
                    Gateadresse *
                  </label>
                  <input
                    type="text"
                    id="baseStreet"
                    placeholder="Gatenavn og nummer"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="basePostalCode" className="block text-sm font-medium text-dark-gray mb-2">
                      Postnummer *
                    </label>
                    <input
                      type="text"
                      id="basePostalCode"
                      placeholder="4 siffer"
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                  <div>
                    <label htmlFor="baseCity" className="block text-sm font-medium text-dark-gray mb-2">
                      By *
                    </label>
                    <input
                      type="text"
                      id="baseCity"
                      placeholder="Bergen, Oslo, etc."
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Pickup and Delivery */}
            <div className="bg-soft-gray rounded-lg p-6">
              <h3 className="text-lg font-medium text-dark-gray mb-4">Henting og levering</h3>

              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Jeg kan hente/levere klær hos kunde</span>
                </label>                                

                {/* Service Radius */}
                <div className="mt-6">
                  <label htmlFor="serviceRadius" className="block text-sm font-medium text-dark-gray mb-2">
                    Serviceradius (km) *
                  </label>
                  <select
                    id="serviceRadius"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue bg-white"
                  >
                    <option value="">Hvor langt reiser du for henting/levering?</option>
                    <option value="2">Opp til 2 km</option>
                    <option value="5">Opp til 5 km</option>
                    <option value="10">Opp til 10 km</option>
                    <option value="15">Opp til 15 km</option>
                    <option value="20">Opp til 20 km</option>
                    <option value="25">Opp til 25 km eller mer</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Additional Services */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Tilleggstjenester</h3>
              <p className="text-sm text-medium-gray mb-4">
                Hvilke ekstratjenester kan du tilby utover vanlig vask?
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border border-soft-gray rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    />
                    <div className="ml-3">
                      <span className="text-dark-gray font-medium">Tørketrommel</span>
                      <p className="text-sm text-medium-gray">Jeg har en tørketrommel tilgjengelig</p>
                    </div>
                  </div>
                  <span className="text-sm text-success-green font-medium">+50 NOK</span>
                </label>

                <label className="flex items-center justify-between p-4 border border-soft-gray rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    />
                    <div className="ml-3">
                      <span className="text-dark-gray font-medium">Tørkerom/tørkeheng</span>
                      <p className="text-sm text-medium-gray">Plass til å henge opp klær for tørking</p>
                    </div>
                  </div>
                  <span className="text-sm text-success-green font-medium">+30 NOK</span>
                </label>

                <label className="flex items-center justify-between p-4 border border-soft-gray rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    />
                    <div className="ml-3">
                      <span className="text-dark-gray font-medium">Stryketjeneste</span>
                      <p className="text-sm text-medium-gray">Kan stryke klær etter vask og tørking</p>
                    </div>
                  </div>
                  <span className="text-sm text-success-green font-medium">+100 NOK</span>
                </label>
              </div>
            </div>

            {/* Capacity */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Kapasitet</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="dailyCapacity" className="block text-sm font-medium text-dark-gray mb-2">
                    Hvor mange vaskemaskinkjøringer kan du gjøre per dag? *
                  </label>
                  <select
                    id="dailyCapacity"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  >
                    <option value="">Velg antall kjøringer</option>
                    <option value="1-2">1-2 kjøringer</option>
                    <option value="3-4">3-4 kjøringer</option>
                    <option value="5-6">5-6 kjøringer</option>
                    <option value="7-8">7-8 kjøringer</option>
                    <option value="9+">9+ kjøringer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="weeklyOrders" className="block text-sm font-medium text-dark-gray mb-2">
                    Hvor mange oppdrag kan du håndtere per uke? *
                  </label>
                  <select
                    id="weeklyOrders"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  >
                    <option value="">Velg antall oppdrag</option>
                    <option value="1-5">1-5 oppdrag</option>
                    <option value="6-10">6-10 oppdrag</option>
                    <option value="11-20">11-20 oppdrag</option>
                    <option value="21-30">21-30 oppdrag</option>
                    <option value="30+">30+ oppdrag</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <a
                href="/bli-renser/business"
                className="px-6 py-3 border border-soft-gray text-medium-gray font-medium rounded-lg hover:bg-soft-gray"
              >
                Tilbake
              </a>
              <button
                type="submit"
                className="px-6 py-3 bg-nordic-blue text-white font-medium rounded-lg hover:bg-blue-600"
              >
                Fortsett til utstyr
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}