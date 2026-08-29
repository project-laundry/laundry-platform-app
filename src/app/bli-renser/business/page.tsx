'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Landmark } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormRadioGroup } from '@/components/forms/FormRadioGroup';
import { validateTaxId, validateBankAccount } from '@/lib/validation/cleaner';
import type { CleanerBusinessType } from '@/types/database';

export default function BusinessInfoPage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <BusinessInfoForm />;
}

function BusinessInfoForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [businessType, setBusinessType] = useState<CleanerBusinessType>(
    cleanerData?.businessType || 'individual'
  );
  const [taxId, setTaxId] = useState(cleanerData?.taxId || '');
  const [businessName, setBusinessName] = useState(cleanerData?.businessName || '');
  const [businessAddress, setBusinessAddress] = useState(cleanerData?.businessAddress || '');
  const [bankAccount, setBankAccount] = useState(cleanerData?.bankAccount || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!businessType) {
      newErrors.businessType = 'Vennligst velg virksomhetstype';
    }

    if (!taxId) {
      newErrors.taxId = 'Dette feltet er påkrevd';
    } else if (!validateTaxId(taxId, businessType)) {
      newErrors.taxId = businessType === 'individual'
        ? 'Fødselsnummer må være 11 siffer'
        : 'Organisasjonsnummer må være 9 siffer';
    }

    if (businessType === 'business') {
      if (!businessName) {
        newErrors.businessName = 'Firmanavn er påkrevd for virksomheter';
      }
      if (!businessAddress) {
        newErrors.businessAddress = 'Forretningsadresse er påkrevd for virksomheter';
      }
    }

    if (!bankAccount) {
      newErrors.bankAccount = 'Kontonummer er påkrevd';
    } else if (!validateBankAccount(bankAccount)) {
      newErrors.bankAccount = 'Kontonummer må være 11 siffer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Update store
    updateCleanerData({
      businessType,
      taxId,
      businessName: businessType === 'business' ? businessName : undefined,
      businessAddress: businessType === 'business' ? businessAddress : undefined,
      bankAccount
    });

    // Navigate to next step
    router.push('/bli-renser/services');
  };

  const isFormValid = businessType && taxId && bankAccount &&
    (businessType === 'individual' || (businessName && businessAddress));

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
          <BackLink href="/bli-renser" />
        </div>

        <CleanerFlowProgress currentStep={1} />

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg 1 av 5
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Virksomhet og juridisk informasjon
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Vi trenger noen juridiske opplysninger for å kunne behandle betalinger og overholde norsk lovgivning.
          </p>
        </div>

        <form id="business-form" onSubmit={handleSubmit}>
          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Building2 className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Virksomhet
              </h2>
            </div>

            <div className="mt-4 space-y-5">
              <FormRadioGroup
                label="Hvordan driver du virksomheten din?"
                name="businessType"
                value={businessType}
                onChange={(value) => setBusinessType(value as CleanerBusinessType)}
                options={[
                  { value: 'individual', label: 'Som privatperson' },
                  { value: 'business', label: 'Som registrert virksomhet' }
                ]}
                required
                error={errors.businessType}
              />

              <div>
                <FormInput
                  label={businessType === 'individual' ? 'Fødselsnummer' : 'Organisasjonsnummer'}
                  value={taxId}
                  onChange={setTaxId}
                  placeholder={businessType === 'individual' ? '11 siffer (DDMMÅÅXXXXX)' : '9 siffer (XXXXXXXXX)'}
                  required
                  error={errors.taxId}
                />
                <p className="mt-1.5 text-sm text-medium-gray">
                  {businessType === 'individual'
                    ? 'Ditt personnummer brukes for skatteformål og betalingsbehandling'
                    : 'Virksomhetens organisasjonsnummer fra Brønnøysundregistrene'
                  }
                </p>
              </div>

              {businessType === 'business' && (
                <div className="space-y-4 rounded-2xl bg-cream/70 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
                  <h3 className="font-medium text-dark-gray">Virksomhetsinformasjon</h3>

                  <FormInput
                    label="Firmanavn"
                    value={businessName}
                    onChange={setBusinessName}
                    placeholder="Navn på din registrerte virksomhet"
                    required
                    error={errors.businessName}
                  />

                  <FormTextarea
                    label="Forretningsadresse"
                    value={businessAddress}
                    onChange={setBusinessAddress}
                    placeholder="Gateadresse, postnummer og by"
                    rows={3}
                    required
                    error={errors.businessAddress}
                  />
                </div>
              )}
            </div>
          </section>

          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Landmark className="size-5" />
              </span>
              <div>
                <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
                  Bankkontoinformasjon
                </h2>
                <p className="mt-1 text-sm text-medium-gray">
                  Dette er hvor vi sender utbetalingene dine hver uke.
                </p>
              </div>
            </div>

            <div className="mt-4">
              <FormInput
                label="Kontonummer"
                value={bankAccount}
                onChange={setBankAccount}
                placeholder="XXXX.XX.XXXXX (11 siffer)"
                required
                error={errors.bankAccount}
              />
            </div>
          </section>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form="business-form"
            disabled={!isFormValid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            Fortsett til tjenesteinformasjon
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
