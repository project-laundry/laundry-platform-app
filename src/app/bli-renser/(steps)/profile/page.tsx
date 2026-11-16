'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Sparkles, UserRound } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowSection, CleanerFlowShell } from '@/components/cleaner-flow/CleanerFlowShell';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import {
  DEFAULT_WEEKLY_SCHEDULE,
  EXPERIENCE_LEVEL_OPTIONS,
  WEEKDAY_OPTIONS,
} from '@/lib/config/cleaner-options';
import { hasAnyWeekday } from '@/lib/validation/cleaner';
import type { CleanerExperienceLevel, WeeklySchedule } from '@/types/database';

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
  // Mon–Fri until the cleaner changes it — same default as the DB column.
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    cleanerData?.weeklySchedule ?? DEFAULT_WEEKLY_SCHEDULE
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleWeekday = (key: keyof WeeklySchedule) => {
    setWeeklySchedule((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (displayName.trim().length < 2) {
      newErrors.displayName = 'Visningsnavn må være minst 2 tegn';
    }

    if (!experienceLevel) {
      newErrors.experienceLevel = 'Velg erfaringsnivå';
    }

    if (!hasAnyWeekday(weeklySchedule)) {
      newErrors.weeklySchedule = 'Velg minst én dag du tar imot henting';
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
      weeklySchedule,
    });

    router.push('/bli-renser/confirm');
  };

  const isFormValid =
    displayName.trim().length >= 2 && experienceLevel !== '' && hasAnyWeekday(weeklySchedule);

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

        <CleanerFlowSection
          icon={<CalendarDays className="size-5" />}
          title="Dager du tar imot henting"
          hint="Du får bare oppdrag med henting på disse dagene. Kan endres når som helst i innstillingene."
          delay={180}
        >
          <div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKDAY_OPTIONS.map(({ key, label }) => {
                const checked = weeklySchedule[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all ${
                      checked
                        ? 'border-sea-green bg-sea-green/8'
                        : 'border-cream-dark bg-white hover:border-sea-green/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWeekday(key)}
                      className="size-4 shrink-0 accent-sea-green"
                    />
                    <span className="text-sm text-dark-gray">{label}</span>
                  </label>
                );
              })}
            </div>
            {errors.weeklySchedule && (
              <p className="mt-1.5 text-sm text-red-600">{errors.weeklySchedule}</p>
            )}
          </div>
        </CleanerFlowSection>
      </form>
    </CleanerFlowShell>
  );
}
