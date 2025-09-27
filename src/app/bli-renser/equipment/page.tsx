export default function EquipmentPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <a href="/" className="text-2xl font-bold text-nordic-blue">RenVask</a>
            <div className="text-sm text-medium-gray">
              Steg 4 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-medium-gray">Fremdrift</span>
            <span className="text-sm text-medium-gray">80%</span>
          </div>
          <div className="w-full bg-soft-gray rounded-full h-2">
            <div className="bg-nordic-blue h-2 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-gray mb-4">
              Informasjon om vaskemaskinen
            </h1>
            <p className="text-lg text-medium-gray">
              Fortell oss om vaskeutstyret ditt så kunder vet hva de kan forvente.
            </p>
          </div>

          <form action="/bli-renser/profile" method="GET" className="space-y-8">
            {/* Washing Machine Image */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Bilde av vaskemaskinen</h3>
              <p className="text-sm text-medium-gray mb-4">
                Last opp et bilde som viser vaskemaskinen din. Dette gir kunder tillit til utstyret ditt.
              </p>

              <div className="border-2 border-dashed border-soft-gray rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-soft-gray rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-medium-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-medium-gray mb-2">Klikk for å laste opp eller dra og slipp</p>
                <p className="text-sm text-medium-gray">JPG, PNG eller GIF (maks 10MB)</p>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="machineImage"
                />
                <label
                  htmlFor="machineImage"
                  className="mt-4 inline-block bg-nordic-blue text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600"
                >
                  Velg bilde
                </label>
              </div>
            </div>

            {/* Machine Details */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Detaljer om vaskemaskinen</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-dark-gray mb-2">
                    Merke og modell *
                  </label>
                  <input
                    type="text"
                    id="brand"
                    placeholder="f.eks. Miele W1, Bosch WAU28T64SN, etc."
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  />
                </div>

                <div>
                  <label htmlFor="serialNumber" className="block text-sm font-medium text-dark-gray mb-2">
                    Serienummer
                  </label>
                  <input
                    type="text"
                    id="serialNumber"
                    placeholder="Serienummer på maskinen (valgfritt)"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  />
                  <p className="text-sm text-medium-gray mt-1">
                    Frivillig, men hjelper med kvalitetssikring
                  </p>
                </div>

                <div>
                  <label htmlFor="capacity" className="block text-sm font-medium text-dark-gray mb-2">
                    Maksimal vekt per vask (kg) *
                  </label>
                  <select
                    id="capacity"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  >
                    <option value="">Velg kapasitet</option>
                    <option value="5">5 kg</option>
                    <option value="6">6 kg</option>
                    <option value="7">7 kg</option>
                    <option value="8">8 kg</option>
                    <option value="9">9 kg</option>
                    <option value="10">10 kg</option>
                    <option value="11">11 kg</option>
                    <option value="12">12 kg eller mer</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-dark-gray mb-2">
                    Årsmodell *
                  </label>
                  <select
                    id="year"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  >
                    <option value="">Velg år</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                    <option value="2022">2022</option>
                    <option value="2021">2021</option>
                    <option value="2020">2020</option>
                    <option value="2019">2019</option>
                    <option value="2018">2018</option>
                    <option value="2017">2017</option>
                    <option value="2016">2016</option>
                    <option value="2015">2015 eller eldre</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Machine Programs */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Tilgjengelige vaskeprogrammer</h3>
              <p className="text-sm text-medium-gray mb-4">
                Hvilke vaskeprogrammer har maskinen din? Dette hjelper kunder å velge riktig behandling for klærne sine.
              </p>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    defaultChecked
                  />
                  <span className="ml-3 text-dark-gray">Bomull (standard)</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                    defaultChecked
                  />
                  <span className="ml-3 text-dark-gray">Syntetisk</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Ull/silke</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Finvask</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Intensive/hvite klær</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Sport/treningsklær</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Øko/lang vask</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Hurtigvask</span>
                </label>
              </div>
            </div>

            {/* Additional Features */}
            <div className="bg-soft-gray rounded-lg p-6">
              <h3 className="text-lg font-medium text-dark-gray mb-4">Ekstra funksjoner</h3>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Dampfunksjon</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Antibakteriell vask</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Allergivask</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Ekstra skylling</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Flekkfjerning</span>
                </label>
              </div>
            </div>

            {/* Machine Condition */}
            <div>
              <label htmlFor="condition" className="block text-sm font-medium text-dark-gray mb-2">
                Tilstand på vaskemaskinen *
              </label>
              <select
                id="condition"
                className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
              >
                <option value="">Beskriv tilstanden</option>
                <option value="excellent">Utmerket - Som ny</option>
                <option value="very-good">Meget bra - Minimal slitasje</option>
                <option value="good">Bra - Normal slitasje for alderen</option>
                <option value="fair">Tilfredsstillende - Noe synlig slitasje</option>
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <a
                href="/bli-renser/services"
                className="px-6 py-3 border border-soft-gray text-medium-gray font-medium rounded-lg hover:bg-soft-gray"
              >
                Tilbake
              </a>
              <button
                type="submit"
                className="px-6 py-3 bg-nordic-blue text-white font-medium rounded-lg hover:bg-blue-600"
              >
                Fortsett til profil
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}