'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { validateYear } from '@/lib/validation/cleaner';

export default function EquipmentPage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <EquipmentForm />;
}

function EquipmentForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [machineBrand, setMachineBrand] = useState(cleanerData?.machineBrand || '');
  const [machineCapacityKg, setMachineCapacityKg] = useState(cleanerData?.machineCapacityKg || '');
  const [machineYear, setMachineYear] = useState(cleanerData?.machineYear || '');
  const [machineCondition, setMachineCondition] = useState(cleanerData?.machineCondition || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!machineBrand) {
      newErrors.machineBrand = 'Merke og modell er påkrevd';
    }

    if (!machineCapacityKg) {
      newErrors.machineCapacityKg = 'Kapasitet er påkrevd';
    } else if (isNaN(Number(machineCapacityKg)) || Number(machineCapacityKg) <= 0) {
      newErrors.machineCapacityKg = 'Vennligst oppgi et gyldig tall';
    }

    if (!machineYear) {
      newErrors.machineYear = 'Årsmodell er påkrevd';
    } else if (!validateYear(machineYear)) {
      newErrors.machineYear = 'Vennligst oppgi et gyldig år (4 siffer, 2015 eller nyere)';
    }

    if (!machineCondition) {
      newErrors.machineCondition = 'Tilstand er påkrevd';
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
      machineBrand,
      machineCapacityKg,
      machineYear,
      machineCondition
    });

    // Navigate to next step
    router.push('/bli-renser/profile');
  };

  const isFormValid = machineBrand && machineCapacityKg && machineYear && machineCondition;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-slate-600">
              Steg 3 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <CleanerFlowProgress currentStep={3} />

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-900 mb-4">
              Informasjon om vaskemaskinen
            </h1>
            <p className="text-slate-600">
              Fortell oss om vaskeutstyret ditt så kunder vet hva de kan forvente.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Machine Details */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Detaljer om vaskemaskinen</h3>

              <div className="space-y-4">
                <FormInput
                  label="Merke og modell"
                  value={machineBrand}
                  onChange={setMachineBrand}
                  placeholder="f.eks. Miele W1, Bosch WAU28T64SN, etc."
                  required
                  error={errors.machineBrand}
                />

                <FormInput
                  label="Maksimal vekt per vask (kg)"
                  value={machineCapacityKg}
                  onChange={setMachineCapacityKg}
                  placeholder="f.eks. 8"
                  type="number"
                  required
                  error={errors.machineCapacityKg}
                />

                <FormInput
                  label="Årsmodell"
                  value={machineYear}
                  onChange={setMachineYear}
                  placeholder="f.eks. 2022"
                  required
                  error={errors.machineYear}
                />

                <FormSelect
                  label="Tilstand på vaskemaskinen"
                  value={machineCondition}
                  onChange={setMachineCondition}
                  placeholder="Beskriv tilstanden"
                  options={[
                    { value: 'excellent', label: 'Utmerket - Som ny' },
                    { value: 'very-good', label: 'Meget bra - Minimal slitasje' },
                    { value: 'good', label: 'Bra - Normal slitasje for alderen' },
                    { value: 'fair', label: 'Tilfredsstillende - Noe synlig slitasje' }
                  ]}
                  required
                  error={errors.machineCondition}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/bli-renser/services"
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50"
              >
                Tilbake
              </Link>
              <button
                type="submit"
                disabled={!isFormValid}
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
