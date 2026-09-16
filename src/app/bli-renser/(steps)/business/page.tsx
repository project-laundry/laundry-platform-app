'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Landmark } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormRadioGroup } from '@/components/forms/FormRadioGroup';
import { validateTaxId, validateBankAccount } from '@/lib/validation/cleaner';
import type { CleanerBusinessType } from '@/types/database';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

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

  // Fødselsnummer is 11 digits, organisasjonsnummer is 9.
  const taxIdLength = businessType === 'individual' ? 11 : 9;

  const handleBusinessType = (value: string) => {
    setBusinessType(value as CleanerBusinessType);
    setTaxId(''); // the number type changes with the business type
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateTaxId(taxId, businessType)) {
      newErrors.taxId = businessType === 'individual'
        ? 'Fødselsnummer må være 11 siffer'
        : 'Organisasjonsnummer må være 9 siffer';
    }

    if (businessType === 'business') {
      if (!businessName.trim()) {
        newErrors.businessName = 'Firmanavn er påkrevd for virksomheter';
      }
      if (!businessAddress.trim()) {
        newErrors.businessAddress = 'Forretningsadresse er påkrevd for virksomheter';
      }
    }

    if (!validateBankAccount(bankAccount)) {
      newErrors.bankAccount = 'Kontonummer må være 11 siffer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    updateCleanerData({
      businessType,
      taxId,
      businessName: businessType === 'business' ? businessName.trim() : undefined,
      businessAddress: businessType === 'business' ? businessAddress.trim() : undefined,
      bankAccount,
    });

    router.push('/bli-renser/services');
  };

  const isFormValid =
    taxId.length === taxIdLength &&
    bankAccount.length === 11 &&
    (businessType === 'individual' || (businessName.trim() !== '' && businessAddress.trim() !== ''));

  return (
    <CleanerFlowShell
      step={1}
      formId="business-form"
      ctaLabel="Fortsett til adresse"
      canAdvance={isFormValid}
    >
      <form id="business-form" onSubmit={handleSubmit}>
        <CleanerFlowSection icon={<Building2 className="size-5" />} title="Virksomhet">
          <FormRadioGroup
            label="Hvordan driver du?"
            name="businessType"
            value={businessType}
            onChange={handleBusinessType}
            options={[
              { value: 'individual', label: 'Som privatperson' },
              { value: 'business', label: 'Som registrert virksomhet' },
            ]}
            required
          />

          <div>
            <FormInput
              label={businessType === 'individual' ? 'Fødselsnummer' : 'Organisasjonsnummer'}
              value={taxId}
              onChange={(value) => setTaxId(digitsOnly(value).slice(0, taxIdLength))}
              placeholder={businessType === 'individual' ? '11 siffer' : '9 siffer'}
              type="tel"
              required
              error={errors.taxId}
            />
            <p className="mt-1.5 text-sm text-medium-gray">
              {businessType === 'individual'
                ? 'Brukes til skatterapportering og utbetaling. Deles ikke med kunder.'
                : 'Organisasjonsnummeret fra Brønnøysundregistrene.'}
            </p>
          </div>

          {businessType === 'business' && (
            <div className="space-y-4 rounded-2xl bg-cream/70 p-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <FormInput
                label="Firmanavn"
                value={businessName}
                onChange={setBusinessName}
                placeholder="Navnet på virksomheten"
                required
                error={errors.businessName}
              />
              <FormTextarea
                label="Forretningsadresse"
                value={businessAddress}
                onChange={setBusinessAddress}
                placeholder="Gateadresse, postnummer og sted"
                rows={3}
                required
                error={errors.businessAddress}
              />
            </div>
          )}
        </CleanerFlowSection>

        <CleanerFlowSection
          icon={<Landmark className="size-5" />}
          title="Bankkonto"
          hint="Hit utbetaler vi din andel av hvert fullførte oppdrag."
          delay={120}
        >
          <FormInput
            label="Kontonummer"
            value={bankAccount}
            onChange={(value) => setBankAccount(digitsOnly(value).slice(0, 11))}
            placeholder="11 siffer"
            type="tel"
            required
            error={errors.bankAccount}
          />
        </CleanerFlowSection>
      </form>
    </CleanerFlowShell>
  );
}
