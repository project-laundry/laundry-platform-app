'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { useRouter } from 'next/navigation';
import { ArrowRight, WashingMachine } from 'lucide-react';
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
          <BackLink href="/bli-renser/services" />
        </div>

        <CleanerFlowProgress currentStep={3} />

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg 3 av 5
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Informasjon om vaskemaskinen
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Fortell oss om vaskeutstyret ditt så kunder vet hva de kan forvente.
          </p>
        </div>

        <form id="equipment-form" onSubmit={handleSubmit}>
          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <WashingMachine className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Detaljer om vaskemaskinen
              </h2>
            </div>

            <div className="mt-4 space-y-4">
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
          </section>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form="equipment-form"
            disabled={!isFormValid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            Fortsett til profil
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
