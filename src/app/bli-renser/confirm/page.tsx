'use client';

import { useState, useEffect } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ListChecks } from 'lucide-react';
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
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader />

      <main className="mx-auto max-w-2xl px-5 pb-40 pt-6">
        <div className="mb-4">
          <BackLink href="/bli-renser/profile" />
        </div>

        <CleanerFlowProgress currentStep={5} />

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg 5 av 5
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Bekreft og send inn
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Vennligst gjennomgå informasjonen din og bekreft at alt er korrekt før du sender inn søknaden.
          </p>
        </div>

        {/* Summary */}
        <section
          className="mt-6 space-y-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '60ms' }}
        >
          <div className="rounded-2xl bg-cream/70 p-4">
            <h3 className="font-medium text-dark-gray">Virksomhetsinformasjon</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <SummaryRow
                label="Type:"
                value={cleanerData.businessType === 'individual' ? 'Privatperson' : 'Registrert virksomhet'}
              />
              <SummaryRow
                label={cleanerData.businessType === 'individual' ? 'Fødselsnummer:' : 'Organisasjonsnummer:'}
                value={cleanerData.taxId}
              />
              {cleanerData.businessType === 'business' && cleanerData.businessName && (
                <SummaryRow label="Firmanavn:" value={cleanerData.businessName} />
              )}
              <SummaryRow label="Kontonummer:" value={cleanerData.bankAccount} />
            </dl>
          </div>

          <div className="rounded-2xl bg-cream/70 p-4">
            <h3 className="font-medium text-dark-gray">Serviceområde</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-medium-gray">Adresse:</dt>
                <dd className="text-right font-medium text-dark-gray">
                  {cleanerData.baseStreet}<br />
                  {cleanerData.basePostalCode} {cleanerData.baseCity}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl bg-cream/70 p-4">
            <h3 className="font-medium text-dark-gray">Utstyr</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <SummaryRow label="Maskin:" value={cleanerData.machineBrand} />
              <SummaryRow label="Kapasitet:" value={`${cleanerData.machineCapacityKg} kg`} />
              <SummaryRow label="Årsmodell:" value={cleanerData.machineYear} />
            </dl>
          </div>

          <div className="rounded-2xl bg-cream/70 p-4">
            <h3 className="font-medium text-dark-gray">Profil</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <SummaryRow label="Visningsnavn:" value={cleanerData.displayName} />
              <SummaryRow
                label="Erfaring:"
                value={
                  <>
                    {cleanerData.experienceLevel === 'beginner' && 'Nybegynner'}
                    {cleanerData.experienceLevel === 'some' && 'Noe erfaring'}
                    {cleanerData.experienceLevel === 'experienced' && 'Erfaren'}
                    {cleanerData.experienceLevel === 'expert' && 'Ekspert'}
                    {cleanerData.experienceLevel === 'professional' && 'Profesjonell'}
                  </>
                }
              />
              <SummaryRow label="Språk:" value={`${cleanerData.languages?.length || 0} valgt`} />
            </dl>
          </div>
        </section>

        <form id="confirm-form" onSubmit={handleSubmit}>
          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirmation Checkboxes */}
          <section
            className="mt-6 rounded-3xl border border-dashed border-sea-green/40 bg-sea-green/5 p-5 animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '120ms' }}
          >
            <h2 className="font-serif text-lg font-semibold text-dark-gray">
              Bekreftelse
            </h2>

            <div className="mt-4 space-y-3">
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
                    <Link href="/salgsvilkar" className="font-medium text-sea-green underline-offset-2 hover:underline">
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
                    <Link href="/personvern-renser" className="font-medium text-sea-green underline-offset-2 hover:underline">
                      personvernpolitikken
                    </Link>
                  </>
                }
                required
              />
            </div>
          </section>

          {/* What Happens Next */}
          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <ListChecks className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Hva skjer videre?
              </h2>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-medium-gray">
              <li className="flex items-start">
                <span className="mr-2 text-sea-green">•</span>
                Vi gjennomgår søknaden din innen 1-2 virkedager
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-sea-green">•</span>
                Du får beskjed på e-post når profilen din er godkjent
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-sea-green">•</span>
                Du kan da begynne å motta oppdrag gjennom NooraCare-appen
              </li>
            </ul>
          </section>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form="confirm-form"
            disabled={!allCheckboxesAccepted || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            {loading ? 'Sender inn...' : 'Send inn søknad'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-medium-gray">{label}</dt>
      <dd className="text-right font-medium text-dark-gray">{value}</dd>
    </div>
  );
}
