'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    acceptTerms: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert('Passordene stemmer ikke overens');
      return;
    }
    if (!formData.acceptTerms) {
      alert('Du må akseptere vilkårene for å fortsette');
      return;
    }
    console.log('Signup attempt:', formData);
    // Store user info and redirect to address page
    const userInfo = encodeURIComponent(JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    }));
    window.location.href = `/auth/address?user=${userInfo}`;
  };

  return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-nordic-blue mb-2">NooraCare</h1>
          </Link>
          <h2 className="text-2xl font-bold text-dark-gray mb-2">Opprett konto</h2>
          <p className="text-medium-gray">Kom i gang med din NooraCare-opplevelse</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-dark-gray mb-2">
                Fullt navn
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="Ola Nordmann"
                required
              />
            </div>

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
                placeholder="ola@example.com"
                required
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-dark-gray mb-2">
                Telefonnummer
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="+47 123 45 678"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-dark-gray mb-2">
                Bekreft passord
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                className="w-4 h-4 text-nordic-blue border-gray-300 rounded focus:ring-nordic-blue mt-1"
                required
              />
              <label htmlFor="acceptTerms" className="ml-2 text-sm text-medium-gray">
                Jeg aksepterer{' '}
                <a href="#" className="text-nordic-blue hover:underline">
                  vilkårene for bruk
                </a>{' '}
                og{' '}
                <a href="#" className="text-nordic-blue hover:underline">
                  personvernerklæringen
                </a>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Opprett konto
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-medium-gray">
              Har du allerede konto?{' '}
              <Link href="/auth/login" className="text-nordic-blue font-semibold hover:underline">
                Logg inn
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