'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AddressPage() {
  const searchParams = useSearchParams();
  const userInfo = searchParams.get('user');

  const [formData, setFormData] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Norge',
  });

  const [isValidArea, setIsValidArea] = useState<boolean | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check if it's a valid service area when postal code changes
    if (name === 'postalCode' && value.length >= 4) {
      checkServiceArea(value);
    }
  };

  const checkServiceArea = (postalCode: string) => {
    // Bergen postal codes: 5000-5099, 5100-5299, 5300-5399
    // Oslo postal codes: 0001-1299
    const code = parseInt(postalCode);
    const isBergen = (code >= 5000 && code <= 5099) || (code >= 5100 && code <= 5299) || (code >= 5300 && code <= 5399);
    const isOslo = code >= 1 && code <= 1299;

    setIsValidArea(isBergen || isOslo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidArea) {
      alert('Vi leverer foreløpig bare til Bergen og Oslo. Vi jobber med å utvide til flere områder!');
      return;
    }

    console.log('Address info:', formData);

    // Store address info and redirect to plans
    const addressData = encodeURIComponent(JSON.stringify(formData));
    window.location.href = `/auth/plans?address=${addressData}`;
  };

  return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-nordic-blue mb-2">RenVask</h1>
          </Link>
          <h2 className="text-2xl font-bold text-dark-gray mb-2">Din adresse</h2>
          <p className="text-medium-gray">Vi trenger adressen din for å levere tjenesten</p>
        </div>

        {/* Address Form */}
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="street" className="block text-sm font-semibold text-dark-gray mb-2">
                Gateadresse *
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="Storgata 1"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-semibold text-dark-gray mb-2">
                  Postnummer *
                </label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                  placeholder="0150"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  required
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-dark-gray mb-2">
                  By *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                  placeholder="Oslo"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-semibold text-dark-gray mb-2">
                Land *
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                required
              >
                <option value="Norge">Norge</option>
              </select>
            </div>

            {/* Service Area Status */}
            {formData.postalCode.length >= 4 && (
              <div className={`p-4 rounded-lg ${
                isValidArea
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}>
                {isValidArea ? (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-green-700 font-medium">
                      Flott! Vi leverer til ditt område 🎉
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-700 font-medium">
                      Vi leverer ikke til dette området ennå
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Service Area Info */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 mb-2">Våre serviceområder:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Oslo:</strong> Postnummer 0001-1299</li>
                <li>• <strong>Bergen:</strong> Postnummer 5000-5399</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                Vi jobber med å utvide til flere områder i Norge!
              </p>
            </div>

            <button
              type="submit"
              disabled={!isValidArea}
              className={`w-full font-semibold py-3 rounded-lg transition-colors ${
                isValidArea
                  ? 'bg-nordic-blue text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Fortsett til planer
            </button>
          </form>

          {/* Back Link */}
          <div className="mt-6 text-center">
            <Link href="/auth/signup" className="text-medium-gray hover:text-dark-gray">
              ← Tilbake til registrering
            </Link>
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