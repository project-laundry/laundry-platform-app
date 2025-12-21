'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import { CleanerFlowProgress } from '@/components/ui/CleanerFlowProgress';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import type { CleanerExperienceLevel, CleanerSpecialization } from '@/types/database';

export default function ProfilePage() {
  const router = useRouter();
  const { cleanerData, updateCleanerData } = useCleanerOnboardingStore();

  const [displayName, setDisplayName] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<CleanerExperienceLevel>('beginner');
  const [specializations, setSpecializations] = useState<CleanerSpecialization[]>([]);
  const [languages, setLanguages] = useState<string[]>(['no']); // Norwegian by default

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load data from store on mount
  useEffect(() => {
    if (cleanerData) {
      setDisplayName(cleanerData.displayName || '');
      setExperienceLevel(cleanerData.experienceLevel || 'beginner');
      setSpecializations(cleanerData.specializations || []);
      setLanguages(cleanerData.languages || ['no']);
    }
  }, [cleanerData]);

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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-nordic-blue">NooraCare</Link>
            <div className="text-sm text-slate-600">
              Steg 4 av 5
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <CleanerFlowProgress currentStep={4} />

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-slate-900 mb-4">
              Fullfør profilen din
            </h1>
            <p className="text-slate-600">
              Fortell litt om deg selv for å bygge tillit med kundene.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Om deg</h3>

              <FormInput
                label="Visningsnavn"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Hvordan vil du at kunder skal se deg? (f.eks. 'Anna' eller 'Bergen Rensetjeneste')"
                required
                error={errors.displayName}
              />
              <p className="text-sm text-slate-600 mt-1">
                Dette navnet vises til kunder når de ser profilen din
              </p>
            </div>

            {/* Experience */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Erfaring</h3>

              <div className="space-y-4">
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
                  <label className="block text-sm font-medium text-slate-900 mb-3">
                    Hvilke typer klær har du mest erfaring med? (valgfritt)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('delicate')}
                        onChange={() => toggleSpecialization('delicate')}
                      />
                      <span className="ml-3 text-slate-700">Delikate stoffer (silke, ull, etc.)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('formal')}
                        onChange={() => toggleSpecialization('formal')}
                      />
                      <span className="ml-3 text-slate-700">Forretningsklær (skjorter, dresser, etc.)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('sportswear')}
                        onChange={() => toggleSpecialization('sportswear')}
                      />
                      <span className="ml-3 text-slate-700">Sportsklær og aktivitetstøy</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('outerwear')}
                        onChange={() => toggleSpecialization('outerwear')}
                      />
                      <span className="ml-3 text-slate-700">Ytterklær (jakker, frakker, etc.)</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('down')}
                        onChange={() => toggleSpecialization('down')}
                      />
                      <span className="ml-3 text-slate-700">Dunjakker og duntøy</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                        checked={specializations.includes('leather')}
                        onChange={() => toggleSpecialization('leather')}
                      />
                      <span className="ml-3 text-slate-700">Lær og skinn</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-3">
                Hvilke språk snakker du?
                <span className="text-red-600 ml-1">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                    checked={languages.includes('no')}
                    onChange={() => toggleLanguage('no')}
                  />
                  <span className="ml-3 text-slate-700">Norsk</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                    checked={languages.includes('en')}
                    onChange={() => toggleLanguage('en')}
                  />
                  <span className="ml-3 text-slate-700">Engelsk</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-600"
                    checked={languages.includes('other')}
                    onChange={() => toggleLanguage('other')}
                  />
                  <span className="ml-3 text-slate-700">Annet språk</span>
                </label>
              </div>
              {errors.languages && (
                <p className="mt-1 text-sm text-red-600">{errors.languages}</p>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Link
                href="/bli-renser/equipment"
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50"
              >
                Tilbake
              </Link>
              <button
                type="submit"
                disabled={!isFormValid}
                className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fortsett til bekreftelse
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
