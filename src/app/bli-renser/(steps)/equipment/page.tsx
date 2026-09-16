'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WashingMachine } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { MACHINE_CONDITION_OPTIONS } from '@/lib/config/cleaner-options';
import { validateYear } from '@/lib/validation/cleaner';
import type { CleanerMachineCondition } from '@/types/database';

const isWholePositive = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

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
  const [machineCondition, setMachineCondition] = useState<CleanerMachineCondition | ''>(
    cleanerData?.machineCondition || ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!machineBrand.trim()) {
      newErrors.machineBrand = 'Merke og modell er påkrevd';
    }

    if (!isWholePositive(machineCapacityKg)) {
      newErrors.machineCapacityKg = 'Oppgi kapasiteten i hele kilo';
    }

    if (!validateYear(machineYear)) {
      newErrors.machineYear = 'Oppgi et gyldig årstall (4 siffer)';
    }

    if (!machineCondition) {
      newErrors.machineCondition = 'Velg tilstand';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !machineCondition) return;

    updateCleanerData({
      machineBrand: machineBrand.trim(),
      machineCapacityKg,
      machineYear,
      machineCondition,
    });

    router.push('/bli-renser/profile');
  };

  const isFormValid =
    machineBrand.trim() !== '' &&
    isWholePositive(machineCapacityKg) &&
    validateYear(machineYear) &&
    machineCondition !== '';

  return (
    <CleanerFlowShell
      step={3}
      formId="equipment-form"
      ctaLabel="Fortsett til profil"
      canAdvance={isFormValid}
    >
      <form id="equipment-form" onSubmit={handleSubmit}>
        <CleanerFlowSection icon={<WashingMachine className="size-5" />} title="Vaskemaskinen">
          <FormInput
            label="Merke og modell"
            value={machineBrand}
            onChange={setMachineBrand}
            placeholder="f.eks. Miele W1 eller Bosch Serie 6"
            required
            error={errors.machineBrand}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Kapasitet (kg)"
              value={machineCapacityKg}
              onChange={(value) => setMachineCapacityKg(value.replace(/\D/g, '').slice(0, 2))}
              placeholder="f.eks. 8"
              type="tel"
              required
              error={errors.machineCapacityKg}
            />

            <FormInput
              label="Årsmodell"
              value={machineYear}
              onChange={(value) => setMachineYear(value.replace(/\D/g, '').slice(0, 4))}
              placeholder="f.eks. 2022"
              type="tel"
              required
              error={errors.machineYear}
            />
          </div>

          <FormSelect
            label="Tilstand"
            value={machineCondition}
            onChange={(value) => setMachineCondition(value as CleanerMachineCondition | '')}
            placeholder="Velg tilstand"
            options={MACHINE_CONDITION_OPTIONS}
            required
            error={errors.machineCondition}
          />
        </CleanerFlowSection>
      </form>
    </CleanerFlowShell>
  );
}
