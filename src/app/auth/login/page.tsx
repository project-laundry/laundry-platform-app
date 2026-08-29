'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);
    setResendStatus('idle');
    setResendError(null);
    setLoading(true);

    const supabase = createClient();

    // Step 1: Authenticate
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      const isUnconfirmed =
        (signInError as { code?: string }).code === 'email_not_confirmed' ||
        /email not confirmed/i.test(signInError.message);
      if (isUnconfirmed) {
        setNeedsConfirmation(true);
        setError('E-postadressen din er ikke bekreftet ennå. Sjekk innboksen din eller send bekreftelsen på nytt.');
      } else {
        setError(signInError.message);
      }
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('Kunne ikke logge inn. Vennligst prøv igjen.');
      setLoading(false);
      return;
    }

    // Step 2: Fetch user role from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      setError('Kunne ikke hente brukerdata. Vennligst prøv igjen.');
      setLoading(false);
      return;
    }

    const role = userData.role;

    if (role === 'admin') {
      router.push('/admin/orders');
      router.refresh();
      return;
    }

    if (role === 'cleaner') {
      // Check if cleaner has a profile (completed onboarding)
      const { data: cleanerProfile } = await supabase
        .from('cleaners')
        .select('id')
        .eq('user_id', authData.user.id)
        .single();

      if (!cleanerProfile) {
        // No profile - continue onboarding
        router.push('/bli-renser/business');
      } else {
        // Has profile - go to cleaner dashboard
        router.push('/dashboard/cleaner');
      }
      router.refresh();
      return;
    }

    // Default: customer dashboard
    router.push('/dashboard');
    router.refresh();
  };

  const handleResend = async () => {
    setResendStatus('sending');
    setResendError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setResendStatus('error');
      setResendError(error.message);
      return;
    }
    setResendStatus('sent');
  };

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
            Velkommen tilbake!
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Logg inn
          </h1>
        </div>

        {/* Login Form */}
        <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {needsConfirmation && (
              <div className="space-y-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                <p>Vi sendte en bekreftelseslenke til {formData.email}.</p>
                {resendStatus === 'sent' ? (
                  <p className="font-medium text-sea-green">
                    Bekreftelses-e-post sendt på nytt. Sjekk innboksen din.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendStatus === 'sending' || !formData.email}
                    className="font-medium text-nordic-blue underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {resendStatus === 'sending' ? 'Sender...' : 'Send bekreftelses-e-post på nytt'}
                  </button>
                )}
                {resendStatus === 'error' && resendError && (
                  <p className="text-red-700">Kunne ikke sende: {resendError}</p>
                )}
              </div>
            )}

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
                className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
                placeholder="din.epost@example.com"
                required
              />
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
                className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
                placeholder="••••••••"
                required
              />
            </label>

            <div className="flex justify-end">
              <a
                href="#"
                className="text-sm font-medium text-sea-green underline-offset-2 hover:underline"
              >
                Glemt passord?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-medium-gray">
              Har du ikke konto?{' '}
              <Link
                href="/auth/signup"
                className="font-medium text-nordic-blue underline-offset-2 hover:underline"
              >
                Registrer deg
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
