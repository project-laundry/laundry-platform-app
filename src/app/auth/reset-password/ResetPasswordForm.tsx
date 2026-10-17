'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  RESET_LINK_EXPIRED_MESSAGE,
  RESET_LINK_EXPIRED_PATH,
  getUpdatePasswordErrorMessage,
} from '@/lib/auth/password-reset';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

/**
 * New-password form. The page around it has already checked that a session
 * exists (the recovery link created one in /auth/callback), so updateUser
 * applies to the right user. On success the user is signed in; /dashboard
 * dispatches by role.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      const message = getUpdatePasswordErrorMessage(updateError);
      if (message === RESET_LINK_EXPIRED_MESSAGE) {
        // The recovery session is gone (cookie expired/cleared between page
        // load and submit); the forgot page explains and offers a new link.
        router.push(RESET_LINK_EXPIRED_PATH);
        return;
      }
      setError(message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <label className="block" htmlFor="password">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Nytt passord
        </span>
        <input
          type="password"
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </label>

      <label className="block" htmlFor="confirmPassword">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Bekreft nytt passord
        </span>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {loading ? 'Lagrer...' : 'Lagre passord'}
      </button>
    </form>
  );
}
