'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, MapPin, Truck } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
  type SupportedCity,
} from '@/lib/config/postal-codes';

const INSTRUCTIONS_MAX = 500; // cleaners.base_special_instructions max length (ENTITIES.md)

export default function ServicesPage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <ServicesForm />;
}

function ServicesForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [baseStreet, setBaseStreet] = useState(cleanerData?.baseStreet || '');
  const [basePostalCode, setBasePostalCode] = useState(cleanerData?.basePostalCode || '');
  const [baseSpecialInstructions, setBaseSpecialInstructions] = useState(
    cleanerData?.baseSpecialInstructions || ''
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const derivedCity: SupportedCity | null = isValidPostalCodeFormat(basePostalCode)
    ? getCityFromPostalCode(basePostalCode)
    : null;
  const outOfArea = isValidPostalCodeFormat(basePostalCode) && derivedCity === null;

  const handlePostalCode = (raw: string) => {
    setBasePostalCode(raw.replace(/\D/g, '').slice(0, 4));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (baseStreet.trim().length < 3) {
      newErrors.baseStreet = 'Gateadresse er påkrevd';
    }

    if (!basePostalCode) {
      newErrors.basePostalCode = 'Postnummer er påkrevd';
    } else if (!isValidPostalCodeFormat(basePostalCode)) {
      newErrors.basePostalCode = 'Postnummer må være 4 siffer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !derivedCity) return;

    updateCleanerData({
      baseStreet: baseStreet.trim(),
      basePostalCode,
      baseCity: derivedCity,
      baseCountry: 'Norway',
      baseSpecialInstructions: baseSpecialInstructions.trim() || undefined,
    });

    router.push('/bli-renser/equipment');
  };

  const isFormValid = baseStreet.trim().length >= 3 && derivedCity !== null;

  return (
    <CleanerFlowShell
      step={2}
      formId="services-form"
      ctaLabel="Fortsett til vaskemaskin"
      canAdvance={isFormValid}
    >
      <form id="services-form" onSubmit={handleSubmit}>
        <CleanerFlowSection icon={<MapPin className="size-5" />} title="Adressen der du vasker">
          <FormInput
            label="Gateadresse"
            value={baseStreet}
            onChange={setBaseStreet}
            placeholder="Gatenavn og nummer"
            required
            error={errors.baseStreet}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Postnummer"
              value={basePostalCode}
              onChange={handlePostalCode}
              placeholder="4 siffer"
              type="tel"
              required
              error={errors.basePostalCode}
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">By</span>
              <div className="flex h-[3.25rem] items-center rounded-2xl border border-cream-dark bg-cream/50 px-4 text-dark-gray">
                {derivedCity ? (
                  <span className="font-medium">{derivedCity}</span>
                ) : (
                  <span className="text-medium-gray/60">Fra postnr.</span>
                )}
              </div>
            </label>
          </div>

          {outOfArea && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Vi er foreløpig bare i Bergen og Oslo. Dette postnummeret er utenfor området vårt.
              </span>
            </div>
          )}
        </CleanerFlowSection>

        <CleanerFlowSection
          icon={<Truck className="size-5" />}
          title="Beskjed til sjåføren"
          hint="Valgfritt. Vises til sjåføren som leverer og henter tøy hos deg."
          delay={120}
        >
          <FormTextarea
            label="Adkomst"
            value={baseSpecialInstructions}
            onChange={(value) => setBaseSpecialInstructions(value.slice(0, INSTRUCTIONS_MAX))}
            placeholder="F.eks. etasje, ringeklokke eller hvor tøyet kan settes"
            rows={3}
          />
        </CleanerFlowSection>
      </form>
    </CleanerFlowShell>
  );
}
