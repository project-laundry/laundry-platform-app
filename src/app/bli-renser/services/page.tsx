'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin } from 'lucide-react';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { validatePostalCode } from '@/lib/validation/cleaner';

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
  const [baseCity, setBaseCity] = useState(cleanerData?.baseCity || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

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
          <BackLink href="/bli-renser/business" />
        </div>

        <CleanerFlowProgress currentStep={2} />

        <div className="mt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Steg 2 av 5
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
            Serviceområde
          </h1>
          <p className="mt-3 max-w-md text-medium-gray">
            Hvor er vaskemaskinen din plassert? Dette blir utgangspunktet for ditt serviceområde.
          </p>
        </div>

        <form id="services-form" onSubmit={handleSubmit}>
          <section
            className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: '60ms' }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <MapPin className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold text-dark-gray">
                Basisadresse
              </h2>
            </div>

            <div className="mt-4 space-y-4">
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
          </section>
        </form>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-dark/70 bg-warm-white/90 backdrop-blur supports-[backdrop-filter]:bg-warm-white/75">
        <div className="mx-auto max-w-2xl px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            form="services-form"
            disabled={!isFormValid}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            Fortsett til utstyr
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
