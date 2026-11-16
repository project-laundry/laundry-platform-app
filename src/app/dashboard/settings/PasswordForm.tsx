'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { INPUT_CLASS, SAVE_BUTTON_CLASS, SaveMessage, type SaveMessageState } from './SettingsSection';

// Matches /auth/signup and supabase/config.toml minimum_password_length.
const MIN_PASSWORD_LENGTH = 6;

/** Norwegian message for a failed supabase.auth.updateUser({ password }). */
function getUpdatePasswordErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === 'same_password') {
    return 'Det nye passordet må være forskjellig fra det gamle.';
  }
  if (error.code === 'weak_password') {
    return 'Passordet er for svakt. Velg et lengre eller mer variert passord.';
  }
  if (error.code === 'reauthentication_needed') {
    return 'Av sikkerhetsgrunner må du logge inn på nytt før du kan bytte passord. Logg ut og inn igjen, eller bruk «Glemt passord».';
  }
  return 'Kunne ikke oppdatere passordet. Prøv igjen om litt.';
}

export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessageState>(null);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = 'Passordet må være minst 6 tegn';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passordene stemmer ikke overens';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    if (!validate()) return;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      console.error('Password update failed:', error);
      setSaveMessage({ kind: 'error', text: getUpdatePasswordErrorMessage(error) });
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setSaveMessage({ kind: 'success', text: 'Passordet er oppdatert' });
  };

  const inputClass = (field: string) =>
    `${INPUT_CLASS} ${errors[field] ? 'border-red-300' : 'border-cream-dark'}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Nytt passord<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minst 6 tegn"
          className={inputClass('password')}
        />
        {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password}</p>}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">
          Bekreft nytt passord<span className="ml-1 text-red-600">*</span>
        </span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClass('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </label>

      <SaveMessage message={saveMessage} />

      <button type="submit" disabled={isSaving} className={SAVE_BUTTON_CLASS}>
        {isSaving ? 'Lagrer…' : 'Bytt passord'}
      </button>

      <p className="text-sm text-medium-gray">
        Glemt passordet ditt?{' '}
        <Link
          href="/auth/forgot-password"
          className="font-medium text-nordic-blue underline-offset-2 hover:underline"
        >
          Tilbakestill det her
        </Link>
      </p>
    </form>
  );
}
