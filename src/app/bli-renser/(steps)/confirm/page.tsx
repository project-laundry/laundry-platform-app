'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ListChecks } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormCheckbox } from '@/components/forms/FormCheckbox';
import { experienceLevelLabel, machineConditionLabel } from '@/lib/config/cleaner-options';
import { createCleanerProfileAction } from '../../actions';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

export default function ConfirmPage() {
  // Mount only after the store has rehydrated — StepGuard redirects if the
  // earlier steps are missing, so by the time this renders the data is there.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <ConfirmForm />;
}

function ConfirmForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [informationAccuracyConfirmed, setInformationAccuracyConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cleanerData) {
    return null;
  }

  const allCheckboxesAccepted = termsAccepted && privacyAccepted && informationAccuracyConfirmed;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allCheckboxesAccepted) {
      setError('Du må bekrefte alle punktene for å sende inn søknaden');
      return;
    }

    setLoading(true);
    setError(null);

    const completeData = {
      ...cleanerData,
      termsAccepted,
      privacyAccepted,
      informationAccuracyConfirmed,
    };
    updateCleanerData(completeData);

    const result = await createCleanerProfileAction(completeData as CleanerOnboardingData);

    if (!result.success) {
      setError(result.error || 'Kunne ikke opprette profil. Prøv igjen.');
      setLoading(false);
      return;
    }

    router.push('/bli-renser/success');
  };

  return (
    <CleanerFlowShell
      step={5}
      formId="confirm-form"
      ctaLabel="Send inn søknad"
      canAdvance={allCheckboxesAccepted}
      isSubmitting={loading}
      submittingLabel="Sender inn …"
    >
      {/* Summary */}
      <section
        className="mt-6 space-y-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
        style={{ animationDelay: '60ms' }}
      >
        <SummaryGroup title="Virksomhet og utbetaling">
          <SummaryRow
            label="Driver som"
            value={cleanerData.businessType === 'individual' ? 'Privatperson' : 'Registrert virksomhet'}
          />
          <SummaryRow
            label={cleanerData.businessType === 'individual' ? 'Fødselsnummer' : 'Organisasjonsnummer'}
            value={cleanerData.taxId}
          />
          {cleanerData.businessType === 'business' && (
            <>
              <SummaryRow label="Firmanavn" value={cleanerData.businessName} />
              <SummaryRow label="Forretningsadresse" value={cleanerData.businessAddress} />
            </>
          )}
          <SummaryRow label="Kontonummer" value={cleanerData.bankAccount} />
        </SummaryGroup>

        <SummaryGroup title="Adresse">
          <SummaryRow
            label="Vasker på"
            value={
              <>
                {cleanerData.baseStreet}
                <br />
                {cleanerData.basePostalCode} {cleanerData.baseCity}
              </>
            }
          />
          {cleanerData.baseSpecialInstructions && (
            <SummaryRow label="Beskjed til sjåføren" value={cleanerData.baseSpecialInstructions} />
          )}
        </SummaryGroup>

        <SummaryGroup title="Vaskemaskin">
          <SummaryRow label="Maskin" value={cleanerData.machineBrand} />
          <SummaryRow label="Kapasitet" value={`${cleanerData.machineCapacityKg} kg`} />
          <SummaryRow label="Årsmodell" value={cleanerData.machineYear} />
          <SummaryRow
            label="Tilstand"
            value={cleanerData.machineCondition ? machineConditionLabel(cleanerData.machineCondition) : ''}
          />
        </SummaryGroup>

        <SummaryGroup title="Profil">
          <SummaryRow label="Visningsnavn" value={cleanerData.displayName} />
          <SummaryRow
            label="Erfaring"
            value={cleanerData.experienceLevel ? experienceLevelLabel(cleanerData.experienceLevel) : ''}
          />
        </SummaryGroup>
      </section>

      <form id="confirm-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-300">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirmation checkboxes — emphasized dashed callout (BRANDBOOK §4 "Notes & alerts") */}
        <section
          className="mt-6 rounded-3xl border border-dashed border-sea-green/40 bg-sea-green/5 p-5 animate-in fade-in slide-in-from-bottom-3 duration-700"
          style={{ animationDelay: '120ms' }}
        >
          <h2 className="font-serif text-lg font-semibold text-dark-gray">Bekreftelse</h2>

          <div className="mt-4 space-y-3">
            <FormCheckbox
              checked={informationAccuracyConfirmed}
              onChange={setInformationAccuracyConfirmed}
              label="Opplysningene jeg har gitt er riktige og fullstendige"
              required
            />

            <FormCheckbox
              checked={termsAccepted}
              onChange={setTermsAccepted}
              label={
                <>
                  Jeg godtar{' '}
                  <Link href="/salgsvilkar" className="font-medium text-sea-green underline-offset-2 hover:underline">
                    salgsvilkårene
                  </Link>{' '}
                  til NooraCare
                </>
              }
              required
            />

            <FormCheckbox
              checked={privacyAccepted}
              onChange={setPrivacyAccepted}
              label={
                <>
                  Jeg samtykker til behandling av personopplysninger som beskrevet i{' '}
                  <Link href="/personvern-renser" className="font-medium text-sea-green underline-offset-2 hover:underline">
                    personvernerklæringen for rensere
                  </Link>
                </>
              }
              required
            />
          </div>
        </section>
      </form>

      <CleanerFlowSection icon={<ListChecks className="size-5" />} title="Hva skjer videre?" delay={180}>
        <ul className="space-y-2 text-sm text-medium-gray">
          <li className="flex items-start">
            <span className="mr-2 text-sea-green">•</span>
            Vi går gjennom søknaden din innen 1–2 virkedager.
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-sea-green">•</span>
            Du ser statusen i dashbordet ditt.
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-sea-green">•</span>
            Når du er godkjent, får du oppdrag i dashbordet.
          </li>
        </ul>
      </CleanerFlowSection>
    </CleanerFlowShell>
  );
}

function SummaryGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-cream/70 p-4">
      <h3 className="font-medium text-dark-gray">{title}</h3>
      <dl className="mt-2 space-y-2 text-sm">{children}</dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-medium-gray">{label}</dt>
      <dd className="text-right font-medium text-dark-gray">{value}</dd>
    </div>
  );
}
