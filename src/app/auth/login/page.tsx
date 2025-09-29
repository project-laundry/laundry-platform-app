'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', formData);
    // Mock redirect to dashboard
    window.location.href = '/dashboard';
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

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-nordic-blue border-gray-300 rounded focus:ring-nordic-blue"
                />
                <span className="ml-2 text-sm text-medium-gray">Husk meg</span>
              </label>
              <a href="#" className="text-sm text-nordic-blue hover:underline">
                Glemt passord?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Logg inn
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