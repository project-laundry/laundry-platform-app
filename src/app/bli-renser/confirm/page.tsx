'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { createCleanerProfileAction } from '../actions';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

export default function ConfirmPage() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [informationAccuracyConfirmed, setInformationAccuracyConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if no data
  useEffect(() => {
    if (!cleanerData || !cleanerData.businessType) {
      router.push('/bli-renser/signup');
    }
  }, [cleanerData, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted || !privacyAccepted || !informationAccuracyConfirmed) {
      setError('Vennligst aksepter alle betingelsene for å fortsette');
      return;
    }

    if (!cleanerData) {
      setError('Mangler nødvendig data. Vennligst start prosessen på nytt.');
      return;
    }

    setLoading(true);
    setError(null);

    // Update store with checkbox values
    const completeData = {
      ...cleanerData,
      termsAccepted,
      privacyAccepted,
      informationAccuracyConfirmed
    };

    updateCleanerData(completeData);

    // Call server action to create cleaner profile
    const result = await createCleanerProfileAction(completeData as CleanerOnboardingData);

    if (!result.success) {
      setError(result.error || 'Kunne ikke opprette profil. Vennligst prøv igjen.');
      setLoading(false);
      return;
    }

    // Success! Navigate to success page
    router.push('/bli-renser/success');
  };

  if (!cleanerData) {
    return null;
  }

  const allCheckboxesAccepted = termsAccepted && privacyAccepted && informationAccuracyConfirmed;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-slate-600">
              Steg 5 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <CleanerFlowProgress currentStep={5} />

        {/* Confirmation Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-900 mb-4">
              Bekreft og send inn
            </h1>
            <p className="text-slate-600">
              Vennligst gjennomgå informasjonen din og bekreft at alt er korrekt før du sender inn søknaden.
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-6 mb-8">
            {/* Business Information */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-medium text-slate-900 mb-4">Virksomhetsinformasjon</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Type:</dt>
                  <dd className="text-slate-900 font-medium">
                    {cleanerData.businessType === 'individual' ? 'Privatperson' : 'Registrert virksomhet'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">
                    {cleanerData.businessType === 'individual' ? 'Fødselsnummer:' : 'Organisasjonsnummer:'}
                  </dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.taxId}</dd>
                </div>
                {cleanerData.businessType === 'business' && cleanerData.businessName && (
                  <div className="flex justify-between">
                    <dt className="text-slate-600">Firmanavn:</dt>
                    <dd className="text-slate-900 font-medium">{cleanerData.businessName}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-slate-600">Kontonummer:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.bankAccount}</dd>
                </div>
              </dl>
            </div>

            {/* Service Area */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-medium text-slate-900 mb-4">Serviceområde</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Adresse:</dt>
                  <dd className="text-slate-900 font-medium text-right">
                    {cleanerData.baseStreet}<br />
                    {cleanerData.basePostalCode} {cleanerData.baseCity}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Equipment */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-medium text-slate-900 mb-4">Utstyr</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Maskin:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.machineBrand}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Kapasitet:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.machineCapacityKg} kg</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Årsmodell:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.machineYear}</dd>
                </div>
              </dl>
            </div>

            {/* Profile */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-medium text-slate-900 mb-4">Profil</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Visningsnavn:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.displayName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Erfaring:</dt>
                  <dd className="text-slate-900 font-medium">
                    {cleanerData.experienceLevel === 'beginner' && 'Nybegynner'}
                    {cleanerData.experienceLevel === 'some' && 'Noe erfaring'}
                    {cleanerData.experienceLevel === 'experienced' && 'Erfaren'}
                    {cleanerData.experienceLevel === 'expert' && 'Ekspert'}
                    {cleanerData.experienceLevel === 'professional' && 'Profesjonell'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Språk:</dt>
                  <dd className="text-slate-900 font-medium">{cleanerData.languages?.length || 0} valgt</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Form with Checkboxes */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Confirmation Checkboxes */}
            <div className="bg-teal-50 rounded-lg p-6 space-y-4">
              <h3 className="font-medium text-slate-900 mb-4">Bekreftelse</h3>

              <FormCheckbox
                checked={informationAccuracyConfirmed}
                onChange={setInformationAccuracyConfirmed}
                label="Jeg bekrefter at all informasjon jeg har gitt er korrekt og fullstendig"
                required
              />

              <FormCheckbox
                checked={termsAccepted}
                onChange={setTermsAccepted}
                label={
                  <>
                    Jeg godtar{' '}
                    <Link href="/salgsvilkar" className="text-teal-600 hover:underline">
                      vilkårene
                    </Link>{' '}
                    for å være renser hos NooraCare
                  </>
                }
                required
              />

              <FormCheckbox
                checked={privacyAccepted}
                onChange={setPrivacyAccepted}
                label={
                  <>
                    Jeg samtykker til behandling av personopplysninger i henhold til{' '}
                    <Link href="/personvern-renser" className="text-teal-600 hover:underline">
                      personvernpolitikken
                    </Link>
                  </>
                }
                required
              />
            </div>

            {/* What Happens Next */}
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-medium text-slate-900 mb-3">Hva skjer videre?</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  Vi gjennomgår søknaden din innen 1-2 virkedager
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  Du får beskjed på e-post når profilen din er godkjent
                </li>
                <li className="flex items-start">
                  <span className="text-teal-600 mr-2">•</span>
                  Du kan da begynne å motta oppdrag gjennom NooraCare-appen
                </li>
              </ul>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/bli-renser/profile"
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50"
              >
                Tilbake
              </Link>
              <button
                type="submit"
                disabled={!allCheckboxesAccepted || loading}
                className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {loading ? 'Sender inn...' : 'Send inn søknad'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
