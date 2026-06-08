'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronLeft, AlertCircle } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { validatePickupAddressAction } from '@/app/orders/actions';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
  type SupportedCity,
} from '@/lib/config/postal-codes';

export default function AddressPage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Address state
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');

  // Postal code validation state
  const [derivedCity, setDerivedCity] = useState<SupportedCity | null>(null);
  const [outOfAreaError, setOutOfAreaError] = useState(false);

  // Server-side address validation (geocoding) state
  const [validating, setValidating] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Redirect if service not selected (only after hydration)
  useEffect(() => {
    if (hasHydrated && orderData?.needsIroning === undefined) {
      router.push('/orders/service');
    }
  }, [hasHydrated, orderData?.needsIroning, router]);

  // Initialize form state from store
  useEffect(() => {
    if (orderData?.address) {
      setStreet(orderData.address.street || '');
      setPostalCode(orderData.address.postalCode || '');
      setPickupInstructions(orderData.address.specialInstructions || '');

      // Re-derive city from stored postal code
      if (orderData.address.postalCode && isValidPostalCodeFormat(orderData.address.postalCode)) {
        const city = getCityFromPostalCode(orderData.address.postalCode);
        setDerivedCity(city);
        setOutOfAreaError(city === null);
      }
    }
  }, [orderData]);

  // Handle postal code change with city derivation
  const handlePostalCodeChange = (value: string) => {
    setAddressError(null);
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setPostalCode(digitsOnly);

    // Validate and derive city when we have 4 digits
    if (digitsOnly.length === 4 && isValidPostalCodeFormat(digitsOnly)) {
      const city = getCityFromPostalCode(digitsOnly);
      setDerivedCity(city);
      setOutOfAreaError(city === null);
    } else {
      setDerivedCity(null);
      setOutOfAreaError(false);
    }
  };

  const canContinue = street.trim() && postalCode.length === 4 && derivedCity && !outOfAreaError;

  const handleContinue = async () => {
    if (!canContinue || !derivedCity || validating) return;

    setAddressError(null);
    setValidating(true);

    try {
      const result = await validatePickupAddressAction({
        street: street.trim(),
        postalCode,
        city: derivedCity,
      });

      if (!result.valid) {
        setAddressError(
          result.reason === 'not_found'
            ? 'Vi fant ikke denne adressen. Sjekk gateadresse og postnummer.'
            : 'Vi klarte ikke å finne nøyaktig denne adressen. Dobbeltsjekk gateadressen.'
        );
        return;
      }
    } catch {
      // Fail open: don't block the customer if validation itself errors.
    } finally {
      setValidating(false);
    }

    // Update store with address data
    updateOrderData({
      city: derivedCity,
      address: {
        street: street.trim(),
        postalCode,
        specialInstructions: pickupInstructions,
      },
    });

    router.push('/orders/schedule');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-light text-slate-900">NooraCare</h1>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <OrderFlowProgress currentStep={2} />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Adresse</h2>
          <p className="text-slate-500">Oppgi henteadresse</p>
        </div>

        {/* Address Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <div className="flex items-center mb-6">
            <MapPin className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-medium text-slate-900">Henteadresse</h3>
          </div>

          <div className="space-y-6">
            {/* Street Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Gateadresse <span className="text-teal-600">*</span>
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value);
                  setAddressError(null);
                }}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="F.eks. Strandgaten 15"
                required
              />
            </div>

            {/* Postal Code and Derived City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postnummer <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  className={`w-full px-4 py-3 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all ${
                    outOfAreaError ? 'border-amber-400' : 'border-slate-200'
                  }`}
                  placeholder="5001"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  By
                </label>
                <input
                  type="text"
                  value={derivedCity || ''}
                  readOnly
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600"
                />
              </div>
            </div>

            {/* Out of Area Warning */}
            {outOfAreaError && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-800">
                  Vi tilbyr dessverre ikke tjenester i dette området ennå, men forhåpentligvis snart.
                </p>
              </div>
            )}

            {/* Pickup Instructions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Henteinstruksjoner
              </label>
              <textarea
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                placeholder="F.eks. Ring på døren, posen står utenfor, kode til port: 1234..."
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-2">Hjelp oss å finne frem til deg</p>
            </div>
          </div>
        </div>

        {/* Address validation error */}
        {addressError && (
          <div className="flex items-start gap-3 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{addressError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Link
            href="/orders/service"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={!canContinue || validating}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
              canContinue && !validating
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            {validating ? 'Sjekker adresse…' : 'Neste'}
          </button>
        </div>

        {/* Footer Tagline */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-400">Renhet. Omtanke. NooraCare.</p>
        </div>
      </div>
    </div>
  );
}
