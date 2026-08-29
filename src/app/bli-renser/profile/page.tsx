'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { useRouter } from 'next/navigation';
import { ArrowRight, Languages, Sparkles, UserRound } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import type { CleanerExperienceLevel, CleanerSpecialization } from '@/types/database';

export default function ProfilePage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <ProfileForm />;
}

const SPECIALIZATION_OPTIONS: { value: CleanerSpecialization; label: string }[] = [
  { value: 'delicate', label: 'Delikate stoffer (silke, ull, etc.)' },
  { value: 'formal', label: 'Forretningsklær (skjorter, dresser, etc.)' },
  { value: 'sportswear', label: 'Sportsklær og aktivitetstøy' },
  { value: 'outerwear', label: 'Ytterklær (jakker, frakker, etc.)' },
  { value: 'down', label: 'Dunjakker og duntøy' },
  { value: 'leather', label: 'Lær og skinn' },
];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'no', label: 'Norsk' },
  { value: 'en', label: 'Engelsk' },
  { value: 'other', label: 'Annet språk' },
];

function ProfileForm() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [displayName, setDisplayName] = useState(cleanerData?.displayName || '');
  const [experienceLevel, setExperienceLevel] = useState<CleanerExperienceLevel>(
    cleanerData?.experienceLevel || 'beginner'
  );
  const [specializations, setSpecializations] = useState<CleanerSpecialization[]>(
    cleanerData?.specializations || []
  );
  const [languages, setLanguages] = useState<string[]>(
    cleanerData?.languages || ['no'] // Norwegian by default
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleSpecialization = (spec: CleanerSpecialization) => {
    setSpecializations(prev =>
      prev.includes(spec)
        ? prev.filter(s => s !== spec)
        : [...prev, spec]
    );
  };

  const toggleLanguage = (lang: string) => {
    setLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!displayName) {
      newErrors.displayName = 'Visningsnavn er påkrevd';
    } else if (displayName.length < 2) {
      newErrors.displayName = 'Visningsnavn må være minst 2 tegn';
    }

    if (!experienceLevel) {
      newErrors.experienceLevel = 'Vennligst velg erfaringsnivå';
    }

    if (languages.length === 0) {
      newErrors.languages = 'Vennligst velg minst ett språk';
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
      displayName,
      experienceLevel,
      specializations,
      languages
    });

    // Navigate to confirmation page
    router.push('/bli-renser/confirm');
  };

  const isFormValid = displayName && experienceLevel && languages.length > 0;

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
          <BackLink href="/bli-renser/equipment" />
        </div>

        <CleanerFlowProgress currentStep={4} />

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg 4 av 5
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Fullfør profilen din
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Fortell litt om deg selv for å bygge tillit med kundene.
          </p>
        </div>

        <form id="profile-form" onSubmit={handleSubmit}>
          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <UserRound className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Om deg
              </h2>
            </div>

            <div className="mt-4">
              <FormInput
                label="Visningsnavn"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Hvordan vil du at kunder skal se deg? (f.eks. 'Anna' eller 'Bergen Rensetjeneste')"
                required
                error={errors.displayName}
              />
              <p className="mt-1.5 text-sm text-medium-gray">
                Dette navnet vises til kunder når de ser profilen din
              </p>
            </div>
          </section>

          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Sparkles className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Erfaring
              </h2>
            </div>

            <div className="mt-4 space-y-5">
              <FormSelect
                label="Hvor lang erfaring har du med rengjøring?"
                value={experienceLevel}
                onChange={(value) => setExperienceLevel(value as CleanerExperienceLevel)}
                placeholder="Velg erfaringsnivå"
                options={[
                  { value: 'beginner', label: 'Nybegynner - Jeg lærer fortsatt' },
                  { value: 'some', label: 'Noe erfaring - 1-2 år' },
                  { value: 'experienced', label: 'Erfaren - 3-5 år' },
                  { value: 'expert', label: 'Ekspert - 5+ år' },
                  { value: 'professional', label: 'Profesjonell - Jeg driver eget rengjøringsfirma' }
                ]}
                required
                error={errors.experienceLevel}
              />

              <div>
                <span className="mb-2 block text-sm font-medium text-dark-gray">
                  Hvilke typer klær har du mest erfaring med? (valgfritt)
                </span>
                <div className="space-y-2">
                  {SPECIALIZATION_OPTIONS.map((option) => (
                    <CheckRow
                      key={option.value}
                      label={option.label}
                      checked={specializations.includes(option.value)}
                      onToggle={() => toggleSpecialization(option.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '180ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Languages className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Hvilke språk snakker du?
                <span className="ml-1 text-red-600">*</span>
              </h2>
            </div>

            <div className="mt-4 space-y-2">
              {LANGUAGE_OPTIONS.map((option) => (
                <CheckRow
                  key={option.value}
                  label={option.label}
                  checked={languages.includes(option.value)}
                  onToggle={() => toggleLanguage(option.value)}
                />
              ))}
            </div>
            {errors.languages && (
              <p className="mt-1.5 text-sm text-red-600">{errors.languages}</p>
            )}
          </section>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form="profile-form"
            disabled={!isFormValid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            Fortsett til bekreftelse
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
        checked
          ? 'border-sea-green bg-sea-green/8'
          : 'border-cream-dark bg-white hover:border-sea-green/50'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-4 shrink-0 accent-sea-green"
      />
      <span className="text-sm text-dark-gray">{label}</span>
    </label>
  );
}
