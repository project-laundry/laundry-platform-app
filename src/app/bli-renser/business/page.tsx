'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import { FormRadioGroup } from '@/components/forms/FormRadioGroup';
import { validateTaxId, validateBankAccount } from '@/lib/validation/cleaner';
import type { CleanerBusinessType } from '@/types/database';

export default function BusinessInfoPage() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [businessType, setBusinessType] = useState<CleanerBusinessType>('individual');
  const [taxId, setTaxId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [bankAccount, setBankAccount] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data from store on mount
  useEffect(() => {
    if (cleanerData) {
      setBusinessType(cleanerData.businessType || 'individual');
      setTaxId(cleanerData.taxId || '');
      setBusinessName(cleanerData.businessName || '');
      setBusinessAddress(cleanerData.businessAddress || '');
      setBankAccount(cleanerData.bankAccount || '');
    }
  }, [cleanerData]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-slate-600">
              Steg 1 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <CleanerFlowProgress currentStep={1} />

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-900 mb-4">
              Virksomhet og juridisk informasjon
            </h1>
            <p className="text-slate-600">
              Vi trenger noen juridiske opplysninger for å kunne behandle betalinger og overholde norsk lovgivning.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business Type */}
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

            {/* Tax ID */}
            <FormInput
              label={businessType === 'individual' ? 'Fødselsnummer' : 'Organisasjonsnummer'}
              value={taxId}
              onChange={setTaxId}
              placeholder={businessType === 'individual' ? '11 siffer (DDMMÅÅXXXXX)' : '9 siffer (XXXXXXXXX)'}
              required
              error={errors.taxId}
            />
            <p className="text-sm text-slate-600 -mt-4">
              {businessType === 'individual'
                ? 'Ditt personnummer brukes for skatteformål og betalingsbehandling'
                : 'Virksomhetens organisasjonsnummer fra Brønnøysundregistrene'
              }
            </p>

            {/* Business Information (conditional) */}
            {businessType === 'business' && (
              <div className="bg-slate-50 rounded-lg p-6 space-y-4">
                <h3 className="font-medium text-slate-900 mb-3">Virksomhetsinformasjon</h3>

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

            {/* Bank Account Information */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Bankkontoinformasjon</h3>
              <p className="text-sm text-slate-600 mb-4">
                Dette er hvor vi sender utbetalingene dine hver uke.
              </p>

              <FormInput
                label="Kontonummer"
                value={bankAccount}
                onChange={setBankAccount}
                placeholder="XXXX.XX.XXXXX (11 siffer)"
                required
                error={errors.bankAccount}
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/bli-renser"
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50"
              >
                Tilbake
              </Link>
              <button
                type="submit"
                disabled={!isFormValid}
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
