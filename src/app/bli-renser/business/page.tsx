'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BusinessInfoPage() {
  const [businessType, setBusinessType] = useState('');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-soft-gray">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-medium-gray">
              Steg 2 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-medium-gray">Fremdrift</span>
            <span className="text-sm text-medium-gray">40%</span>
          </div>
          <div className="w-full bg-soft-gray rounded-full h-2">
            <div className="bg-nordic-blue h-2 rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>

        {/* Form Section */}
        <div className="bg-white">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-dark-gray mb-4">
              Virksomhet og juridisk informasjon
            </h1>
            <p className="text-lg text-medium-gray">
              Vi trenger noen juridiske opplysninger for å kunne behandle betalinger og overholde norsk lovgivning.
            </p>
          </div>

          <form action="/bli-renser/services" method="GET" className="space-y-6">
            {/* Business Type */}
            <div>
              <label className="block text-sm font-medium text-dark-gray mb-2">
                Hvordan driver du virksomheten din? *
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="businessType"
                    value="individual"
                    checked={businessType === 'individual'}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Som privatperson</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="businessType"
                    value="business"
                    checked={businessType === 'business'}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue"
                  />
                  <span className="ml-3 text-dark-gray">Som registrert virksomhet</span>
                </label>
              </div>
            </div>

            {/* Social Security Number / Organization Number */}
            {businessType && (
              <div>
                <label htmlFor="identification" className="block text-sm font-medium text-dark-gray mb-2">
                  {businessType === 'individual' ? 'Fødselsnummer *' : 'Organisasjonsnummer *'}
                </label>
                <input
                  type="text"
                  id="identification"
                  name="identification"
                  placeholder={businessType === 'individual' ? '11 siffer (DDMMÅÅXXXXX)' : '9 siffer (XXXXXXXXX)'}
                  maxLength={businessType === 'individual' ? 11 : 9}
                  className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                />
                <p className="text-sm text-medium-gray mt-1">
                  {businessType === 'individual'
                    ? 'Ditt personnummer brukes for skatteformål og betalingsbehandling'
                    : 'Virksomhetens organisasjonsnummer fra Brønnøysundregistrene'
                  }
                </p>
              </div>
            )}

            {/* Business Registration (conditional) */}
            {businessType === 'business' && (
              <div className="bg-soft-gray rounded-lg p-4">
                <h3 className="font-medium text-dark-gray mb-3">Virksomhetsinformasjon</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="businessName" className="block text-sm font-medium text-dark-gray mb-2">
                      Firmanavn *
                    </label>
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      placeholder="Navn på din registrerte virksomhet"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="businessAddress" className="block text-sm font-medium text-dark-gray mb-2">
                      Forretningsadresse *
                    </label>
                    <textarea
                      id="businessAddress"
                      name="businessAddress"
                      rows={3}
                      placeholder="Gateadresse, postnummer og by"
                      required
                      className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bank Account Information */}
            <div>
              <h3 className="text-lg font-medium text-dark-gray mb-4">Bankkontoinformasjon</h3>
              <p className="text-sm text-medium-gray mb-4">
                Dette er hvor vi sender utbetalingene dine hver uke.
              </p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-dark-gray mb-2">
                    Kontonummer *
                  </label>
                  <input
                    type="text"
                    id="accountNumber"
                    placeholder="XXXX.XX.XXXXX (11 siffer)"
                    className="w-full px-4 py-3 border border-soft-gray rounded-lg focus:outline-none focus:border-nordic-blue"
                  />
                </div>                
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-soft-gray rounded-lg p-4">
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue mt-1"
                  />
                  <span className="ml-3 text-sm text-dark-gray">
                    Jeg bekrefter at alle opplysninger jeg har oppgitt er korrekte og fullstendige *
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue mt-1"
                  />
                  <span className="ml-3 text-sm text-dark-gray">
                    Jeg godtar <a href="#" className="text-nordic-blue hover:underline">vilkårene</a> for å være renser hos NooraCare *
                  </span>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-nordic-blue border-soft-gray focus:ring-nordic-blue mt-1"
                  />
                  <span className="ml-3 text-sm text-dark-gray">
                    Jeg samtykker til behandling av personopplysninger i henhold til <a href="#" className="text-nordic-blue hover:underline">personvernpolitikken</a> *
                  </span>
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <a
                href="/bli-renser"
                className="px-6 py-3 border border-soft-gray text-medium-gray font-medium rounded-lg hover:bg-soft-gray"
              >
                Tilbake
              </a>
              <button
                type="submit"
                className="px-6 py-3 bg-nordic-blue text-white font-medium rounded-lg hover:bg-blue-600"
              >
                Fortsett til tjenesteinformasjon
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}