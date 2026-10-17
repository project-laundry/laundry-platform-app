'use client';

import { Suspense, useState } from 'react';
import { AppHeader } from '@/components/layout/AppHeader';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ChevronLeft, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { withNext } from '@/lib/auth/next-path';
import { isValidEmail } from '@/lib/utils/email';
import {
  INVALID_EMAIL_MESSAGE,
  RESET_LINK_EXPIRED_MESSAGE,
  RESET_PASSWORD_PATH,
  getResetRequestErrorMessage,
} from '@/lib/auth/password-reset';

// useSearchParams needs a Suspense boundary above it.
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  // /auth/callback sends people here with ?expired=1 when a reset link could
  // not be verified (used, expired, or opened in another browser).
  const expired = useSearchParams().get('expired') === '1';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // The address we told Supabase to mail; non-null switches to the sent state.
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normalised = email.trim().toLowerCase();
    if (!isValidEmail(normalised)) {
      setError(INVALID_EMAIL_MESSAGE);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // The link lands on /auth/callback, which verifies it and continues to
    // the reset page. Supabase returns no error for unknown addresses.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalised, {
      redirectTo: `${window.location.origin}${withNext('/auth/callback', RESET_PASSWORD_PATH)}`,
    });

    if (resetError) {
      setError(getResetRequestErrorMessage(resetError));
      setLoading(false);
      return;
    }

    setSentTo(normalised);
    setLoading(false);
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
          {sentTo ? (
            <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 text-center shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-sea-green/10 text-sea-green">
                <MailCheck className="size-8" />
              </div>

              <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
                Sjekk innboksen
              </p>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-dark-gray">
                E-posten er på vei
              </h1>
              <p className="mt-3 leading-relaxed text-medium-gray">
                Hvis det finnes en konto for {sentTo}, har vi sendt en lenke for å lage nytt passord.
                Sjekk også spam-mappen.
              </p>

              <Link
                href="/auth/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Tilbake til innlogging
              </Link>

              <p className="mt-4 text-sm text-medium-gray">
                Ikke mottatt e-post?{' '}
                <button
                  type="button"
                  onClick={() => setSentTo(null)}
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  Prøv igjen
                </button>
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
                  Glemt passord?
                </p>
                <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
                  Lag nytt passord
                </h1>
                <p className="mt-3 text-medium-gray">
                  Skriv inn e-postadressen din, så sender vi deg en lenke for å lage et nytt passord.
                </p>
              </div>

              <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {expired && !error && (
                    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{RESET_LINK_EXPIRED_MESSAGE}</span>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
                      placeholder="din.epost@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
                  >
                    {loading ? 'Sender...' : 'Send lenke'}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-sm text-medium-gray">
                    Husket du det likevel?{' '}
                    <Link
                      href="/auth/login"
                      className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                    >
                      Logg inn
                    </Link>
                  </p>
                </div>
              </div>
            </>
          )}

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
