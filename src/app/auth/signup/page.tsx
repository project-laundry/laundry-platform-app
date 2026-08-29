'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
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
          role: 'customer',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Redirect to success page
    router.push('/auth/success');
  };

  const inputClass =
    'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

  return (
    <div className="flex min-h-screen flex-col bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader />

      <main className="flex flex-1 items-center justify-center px-5 py-10">

      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Ny konto
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Opprett konto
          </h1>
          <p className="mt-3 text-medium-gray">
            Kom i gang med din NooraCare-opplevelse
          </p>
        </div>

        {/* Signup Form */}
        <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <label className="block" htmlFor="name">
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

            <label className="block" htmlFor="email">
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

            <label className="block" htmlFor="phone">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">
                Telefonnummer
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="+47"
                  disabled
                  className="w-16 rounded-2xl border border-cream-dark bg-cream/50 px-4 py-3 text-center text-dark-gray"
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

            <label className="block" htmlFor="password">
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

            <label className="block" htmlFor="confirmPassword">
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

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="mt-1 size-4 shrink-0 rounded border-cream-dark accent-sea-green focus:ring-sea-green/20"
                required
              />
              <label htmlFor="acceptTerms" className="text-sm text-medium-gray">
                Jeg aksepterer{' '}
                <Link
                  href="/salgsvilkar"
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  vilkårene for bruk
                </Link>{' '}
                og{' '}
                <Link
                  href="/personvern"
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  personvernerklæringen
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              {loading ? 'Oppretter konto...' : 'Opprett konto'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-medium-gray">
              Har du allerede konto?{' '}
              <Link
                href="/auth/login"
                className="font-medium text-nordic-blue underline-offset-2 hover:underline"
              >
                Logg inn
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-medium-gray transition-colors hover:text-nordic-blue"
          >
            <ChevronLeft className="size-4" />
            Tilbake til hjemmesiden
          </Link>
        </div>
      </div>
      </main>
    </div>
  );
}
