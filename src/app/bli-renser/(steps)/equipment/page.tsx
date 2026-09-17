'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera, Loader2, Sparkles, WashingMachine } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { MACHINE_CONDITION_OPTIONS } from '@/lib/config/cleaner-options';
import { validateYear } from '@/lib/validation/cleaner';
import { recognizeMachineAction } from '../../actions';
import { fileToJpegBase64, ImageResizeError } from './resize-image';
import type { CleanerMachineCondition } from '@/types/database';

const isWholePositive = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

type PhotoStatus =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'applied' }
  | { kind: 'error'; message: string };

const PHOTO_MESSAGES = {
  no_machine: 'Vi fant ingen vaskemaskin i bildet. Prøv et bilde der hele maskinen og etiketten synes.',
  unavailable: 'Bildegjenkjenning er ikke tilgjengelig akkurat nå. Fyll ut feltene manuelt.',
  unreadable: 'Kunne ikke lese bildet. Prøv et annet bilde (JPEG eller PNG).',
} as const;

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

  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again re-triggers onChange.
    e.target.value = '';
    if (!file) return;

    setPhotoStatus({ kind: 'working' });

    let imageBase64: string;
    try {
      imageBase64 = await fileToJpegBase64(file);
    } catch (error) {
      setPhotoStatus({
        kind: 'error',
        message: error instanceof ImageResizeError ? PHOTO_MESSAGES.unreadable : PHOTO_MESSAGES.unavailable,
      });
      return;
    }

    const result = await recognizeMachineAction({ imageBase64, mediaType: 'image/jpeg' });

    if (result.status !== 'ok') {
      setPhotoStatus({ kind: 'error', message: PHOTO_MESSAGES[result.status] });
      return;
    }

    // Overwrite each field the model could read; leave the rest as typed.
    const { brandModel, capacityKg, year, condition } = result.suggestion;
    if (brandModel !== null) setMachineBrand(brandModel);
    if (capacityKg !== null) setMachineCapacityKg(String(capacityKg));
    if (year !== null) setMachineYear(String(year));
    if (condition !== null) setMachineCondition(condition);
    setErrors({});
    setPhotoStatus({ kind: 'applied' });
  };

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
      isSubmitting={photoStatus.kind === 'working'}
      submittingLabel="Analyserer bildet …"
    >
      <form id="equipment-form" onSubmit={handleSubmit}>
        <CleanerFlowSection
          icon={<Camera className="size-5" />}
          title="Ta bilde av maskinen"
          hint="Valgfritt. Vi leser av merke, modell og kapasitet fra bildet og fyller ut feltene for deg."
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={photoStatus.kind === 'working'}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={photoStatus.kind === 'working'}
            className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:text-medium-gray"
          >
            {photoStatus.kind === 'working' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
            {photoStatus.kind === 'working' ? 'Analyserer bildet …' : 'Velg bilde'}
          </button>

          {photoStatus.kind === 'applied' && (
            <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-sea-green" />
              <span>Forslag fylt inn fra bildet. Sjekk at det stemmer, og rett det som er feil.</span>
            </div>
          )}

          {photoStatus.kind === 'error' && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{photoStatus.message}</span>
            </div>
          )}
        </CleanerFlowSection>

        <CleanerFlowSection icon={<WashingMachine className="size-5" />} title="Vaskemaskinen" delay={120}>
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
