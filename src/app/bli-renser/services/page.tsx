'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { validatePostalCode } from '@/lib/validation/cleaner';

export default function ServicesPage() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [baseStreet, setBaseStreet] = useState('');
  const [basePostalCode, setBasePostalCode] = useState('');
  const [baseCity, setBaseCity] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data from store on mount
  useEffect(() => {
    if (cleanerData) {
      setBaseStreet(cleanerData.baseStreet || '');
      setBasePostalCode(cleanerData.basePostalCode || '');
      setBaseCity(cleanerData.baseCity || '');
    }
  }, [cleanerData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!baseStreet) {
      newErrors.baseStreet = 'Gateadresse er påkrevd';
    }

    if (!basePostalCode) {
      newErrors.basePostalCode = 'Postnummer er påkrevd';
    } else if (!validatePostalCode(basePostalCode)) {
      newErrors.basePostalCode = 'Postnummer må være 4 siffer';
    }

    if (!baseCity) {
      newErrors.baseCity = 'By er påkrevd';
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
      baseStreet,
      basePostalCode,
      baseCity,
      baseCountry: 'Norway'
    });

    // Navigate to next step
    router.push('/bli-renser/equipment');
  };

  const isFormValid = baseStreet && basePostalCode && baseCity;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-slate-600">
              Steg 2 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <CleanerFlowProgress currentStep={2} />

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-900 mb-4">
              Serviceområde
            </h1>
            <p className="text-slate-600">
              Hvor er vaskemaskinen din plassert? Dette blir utgangspunktet for ditt serviceområde.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Base Address */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Basisadresse</h3>

              <div className="space-y-4">
                <FormInput
                  label="Gateadresse"
                  value={baseStreet}
                  onChange={setBaseStreet}
                  placeholder="Gatenavn og nummer"
                  required
                  error={errors.baseStreet}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="Postnummer"
                    value={basePostalCode}
                    onChange={setBasePostalCode}
                    placeholder="4 siffer"
                    required
                    error={errors.basePostalCode}
                  />

                  <FormInput
                    label="By"
                    value={baseCity}
                    onChange={setBaseCity}
                    placeholder="Bergen, Oslo, etc."
                    required
                    error={errors.baseCity}
                  />
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/bli-renser/business"
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50"
              >
                Tilbake
              </Link>
              <button
                type="submit"
                disabled={!isFormValid}
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
