'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { createAdminAction, updateAdminAction, type AdminUserFormInput } from './actions';

const inputClass =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20';

export function AdminUserForm({
  mode,
  userId,
  initial,
}: {
  mode: 'create' | 'edit';
  userId?: string;
  initial?: { full_name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [form, setForm] = useState<AdminUserFormInput>({
    full_name: initial?.full_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    password: '',
  });

  function set<K extends keyof AdminUserFormInput>(key: K, value: AdminUserFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createAdminAction(form)
          : await updateAdminAction(userId!, form);
      if (!result.success) {
        setError(result.error || 'Noe gikk galt');
        return;
      }
      router.push('/admin/admins');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Fullt navn</span>
        <input
          required
          value={form.full_name}
          onChange={(e) => set('full_name', e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">E-post</span>
        <input
          type="email"
          required
          disabled={mode === 'edit'}
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          className={mode === 'edit' ? `${inputClass} bg-cream/50` : inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-dark-gray">Telefon</span>
        <input
          required
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="99887766"
          className={inputClass}
        />
      </label>

      {mode === 'create' && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">
            Midlertidig passord
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            className={inputClass}
          />
          <span className="mt-1.5 block text-xs text-medium-gray">
            Minst 8 tegn. Del passordet med administratoren — det sendes ingen e-post.
          </span>
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {isPending ? 'Lagrer...' : mode === 'create' ? 'Opprett administrator' : 'Lagre endringer'}
      </button>
    </form>
  );
}
