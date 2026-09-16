'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, UserRound } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import { EXPERIENCE_LEVEL_OPTIONS } from '@/lib/config/cleaner-options';
import type { CleanerExperienceLevel } from '@/types/database';

export default function ProfilePage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <ProfileForm />;
}

function ProfileForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [displayName, setDisplayName] = useState(cleanerData?.displayName || '');
  const [experienceLevel, setExperienceLevel] = useState<CleanerExperienceLevel | ''>(
    cleanerData?.experienceLevel || ''
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (displayName.trim().length < 2) {
      newErrors.displayName = 'Visningsnavn må være minst 2 tegn';
    }

    if (!experienceLevel) {
      newErrors.experienceLevel = 'Velg erfaringsnivå';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !experienceLevel) return;

    updateCleanerData({
      displayName: displayName.trim(),
      experienceLevel,
    });

    router.push('/bli-renser/confirm');
  };

  const isFormValid = displayName.trim().length >= 2 && experienceLevel !== '';

  return (
    <CleanerFlowShell
      step={4}
      formId="profile-form"
      ctaLabel="Fortsett til bekreftelse"
      canAdvance={isFormValid}
    >
      <form id="profile-form" onSubmit={handleSubmit}>
        <CleanerFlowSection icon={<UserRound className="size-5" />} title="Om deg">
          <div>
            <FormInput
              label="Visningsnavn"
              value={displayName}
              onChange={(value) => setDisplayName(value.slice(0, 100))}
              placeholder="f.eks. Anna eller Bergen Vask"
              required
              error={errors.displayName}
            />
            <p className="mt-1.5 text-sm text-medium-gray">
              Dette navnet ser kundene på bestillingen sin.
            </p>
          </div>
        </CleanerFlowSection>

        <CleanerFlowSection icon={<Sparkles className="size-5" />} title="Erfaring" delay={120}>
          <FormSelect
            label="Hvor mye erfaring har du med klesvask?"
            value={experienceLevel}
            onChange={(value) => setExperienceLevel(value as CleanerExperienceLevel | '')}
            placeholder="Velg erfaringsnivå"
            options={EXPERIENCE_LEVEL_OPTIONS}
            required
            error={errors.experienceLevel}
          />
        </CleanerFlowSection>
      </form>
    </CleanerFlowShell>
  );
}
