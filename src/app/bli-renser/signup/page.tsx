'use client';

import { useState } from 'react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

export default function CleanerSignupPage() {
  const router = useRouter();
  const updateCleanerData = useCleanerOnboardingStore((state) => state.updateCleanerData);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    city: 'Bergen' as 'Bergen' | 'Oslo',
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passordene stemmer ikke overens');
      return;
    }
    if (!formData.acceptTerms) {
      setError('Du må akseptere vilkårene for å fortsette');
      return;
    }
    if (formData.password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: formData.name,
          phone: `+47${formData.phone}`,
          role: 'cleaner',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Initialize store with basic data
    updateCleanerData({});

    // Redirect to business page (will be protected by layout)
    router.push('/bli-renser/signup/success');
  };

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

      <div className="mx-auto w-full max-w-md px-5 py-10">
        <div className="mb-4">
          <BackLink href="/bli-renser" />
        </div>

        {/* Header */}
        <div className="text-center animate-in fade-in slide-in-from-bottom-3 duration-500">
          <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Bli renser
          </h1>
          <p className="mt-3 text-medium-gray">Opprett konto og start onboarding</p>
        </div>

        {/* Signup Form */}
        <div
          className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-700 sm:p-8"
          style={{ animationDelay: '60ms' }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                Fullt navn
              </span>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="Ola Nordmann"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                E-post
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="ola@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                Telefonnummer
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="+47"
                  disabled
                  className="w-16 rounded-2xl border border-cream-dark bg-cream/50 px-3 py-3 text-center text-dark-gray"
                />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={`flex-1 ${inputClass}`}
                  placeholder="123 45 678"
                  required
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                By
              </span>
              <select
                id="city"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="Bergen">Bergen</option>
                <option value="Oslo">Oslo</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                Passord
              </span>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                Bekreft passord
              </span>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </label>

            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-all ${
                formData.acceptTerms
                  ? 'border-sea-green bg-sea-green/8'
                  : 'border-cream-dark bg-white hover:border-sea-green/50'
              }`}
            >
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="mt-0.5 size-4 shrink-0 accent-sea-green"
                required
              />
              <span className="text-sm text-medium-gray">
                Jeg aksepterer{' '}
                <a href="#" className="font-medium text-sea-green underline-offset-2 hover:underline">
                  vilkårene for bruk
                </a>{' '}
                og{' '}
                <a href="#" className="font-medium text-sea-green underline-offset-2 hover:underline">
                  personvernerklæringen
                </a>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              {loading ? 'Oppretter konto...' : 'Opprett konto og fortsett'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-medium-gray">
            Har du allerede konto?{' '}
            <Link href="/auth/login" className="font-medium text-nordic-blue underline-offset-2 hover:underline">
              Logg inn
            </Link>
          </p>
        </div>

        {/* Back to Landing */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/bli-renser"
            className="flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
          >
            <ChevronLeft className="size-4" />
            Tilbake til bli renser
          </Link>
        </div>
      </div>
    </div>
  );
}
