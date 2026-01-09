'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Step 1: Authenticate
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
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

  return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-nordic-blue mb-2">NooraCare</h1>
          </Link>
          <h2 className="text-2xl font-bold text-dark-gray mb-2">Logg inn</h2>
          <p className="text-medium-gray">Velkommen tilbake!</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-dark-gray mb-2">
                E-post
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="din.epost@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-dark-gray mb-2">
                Passord
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-nordic-blue hover:underline">
                Glemt passord?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-medium-gray">
              Har du ikke konto?{' '}
              <Link href="/auth/signup" className="text-nordic-blue font-semibold hover:underline">
                Registrer deg
              </Link>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link href="/" className="text-medium-gray hover:text-dark-gray">
            ← Tilbake til hjemmesiden
          </Link>
        </div>
      </div>
    </div>
  );
}
