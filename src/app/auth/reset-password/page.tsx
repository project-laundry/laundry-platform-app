import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/layout/AppHeader';
import { createClient } from '@/lib/supabase/server';
import { RESET_LINK_EXPIRED_PATH } from '@/lib/auth/password-reset';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Nytt passord – NooraCare',
};

/**
 * Second step of the password reset: /auth/callback has verified the e-mail
 * link and set a session; without one there is nothing to update, so send the
 * visitor back to request a new link.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(RESET_LINK_EXPIRED_PATH);
  }

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
              Nytt passord
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
              Velg et nytt passord
            </h1>
            <p className="mt-3 text-medium-gray">Minst 6 tegn. Du blir logget inn når det er lagret.</p>
          </div>

          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-6 shadow-[var(--shadow-card)] backdrop-blur sm:p-8">
            <ResetPasswordForm />
          </div>
        </div>
      </main>
    </div>
  );
}
