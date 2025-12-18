'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import type { PickupMethod } from '@/types/database';

export default function AddressPage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Address state
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Pickup state
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>('home');
  const [pickupLocationDescription, setPickupLocationDescription] = useState('');

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      // Pre-fill city from location selection
      setCity(orderData.location || '');

      if (orderData.address) {
        setStreet(orderData.address.street || '');
        setPostalCode(orderData.address.postalCode || '');
        setSpecialInstructions(orderData.address.specialInstructions || '');
      }

      if (orderData.pickupMethod) {
        setPickupMethod(orderData.pickupMethod);
      }

      if (orderData.pickupLocationDescription) {
        setPickupLocationDescription(orderData.pickupLocationDescription);
      }
    }
  }, [orderData]);

  // Redirect if location not selected
  useEffect(() => {
    if (!orderData?.location || !orderData?.firstPickupDate) {
      router.push('/orders/location-service');
    }
  }, [orderData, router]);

  const handleContinue = () => {
    // Validate
    if (!street.trim()) {
      alert('Vennligst fyll ut gateadresse');
      return;
    }
    if (!postalCode.trim()) {
      alert('Vennligst fyll ut postnummer');
      return;
    }
    if (postalCode.length !== 4) {
      alert('Postnummer må være 4 siffer');
      return;
    }
    if (pickupMethod === 'other' && !pickupLocationDescription.trim()) {
      alert('Vennligst beskriv hvor posen skal plasseres');
      return;
    }

    // Update store with address data
    updateOrderData({
      address: {
        street,
        city,
        postalCode,
        specialInstructions,
      },
      pickupMethod,
      pickupLocationDescription: pickupMethod === 'other' ? pickupLocationDescription : '',
    });

    router.push('/orders/instructions');
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Adresse</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-green-500 font-medium">Tjeneste</span>
            </div>
            <div className="w-8 h-0.5 bg-nordic-blue"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-nordic-blue text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="ml-2 text-nordic-blue font-medium">Adresse</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="ml-2 text-gray-600">Bekreft</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Hvor skal vi hente?</h2>
          <p className="text-medium-gray">Oppgi adressen der vi skal hente og levere tøyet ditt.</p>
        </div>

        {/* Address Form */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Hentingsadresse</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                Gateadresse *
              </label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="Storgata 1"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-dark-gray mb-2">
                  Postnummer *
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                  placeholder="5001"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-dark-gray mb-2">
                  By
                </label>
                <input
                  type="text"
                  value={city}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                Tilleggsinformasjon til adressen (valgfritt)
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue resize-none"
                placeholder="F.eks. 'Ring på dørklokka', '2. etasje til høyre', etc."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Pickup Method Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Hvordan skal henting skje?</h3>
          <div className="space-y-4">
            {/* Option 1: I'm home */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                pickupMethod === 'home'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setPickupMethod('home')}
            >
              <div className="flex items-start">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 ${
                  pickupMethod === 'home' ? 'border-nordic-blue bg-nordic-blue' : 'border-gray-300'
                }`}>
                  {pickupMethod === 'home' && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-dark-gray">🏠 Jeg er hjemme - du kan banke på</h4>
                  <p className="text-sm text-medium-gray mt-1">
                    Renseren banker på døren og du leverer posen direkte
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Place outside entrance */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                pickupMethod === 'entrance'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setPickupMethod('entrance')}
            >
              <div className="flex items-start">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 ${
                  pickupMethod === 'entrance' ? 'border-nordic-blue bg-nordic-blue' : 'border-gray-300'
                }`}>
                  {pickupMethod === 'entrance' && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-dark-gray">🚪 Plasser utenfor inngangen</h4>
                  <p className="text-sm text-medium-gray mt-1">
                    Du setter posen utenfor døren din
                  </p>
                </div>
              </div>
            </div>

            {/* Option 3: Place somewhere else */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                pickupMethod === 'other'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setPickupMethod('other')}
            >
              <div className="flex items-start">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 mt-0.5 ${
                  pickupMethod === 'other' ? 'border-nordic-blue bg-nordic-blue' : 'border-gray-300'
                }`}>
                  {pickupMethod === 'other' && (
                    <div className="w-full h-full rounded-full bg-white scale-50"></div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-dark-gray">📍 Plasser et annet sted</h4>
                  <p className="text-sm text-medium-gray mt-1">
                    Du velger en annen plassering (f.eks. bak huset, ved garasjen)
                  </p>
                </div>
              </div>
            </div>

            {/* Additional text input for "other" location */}
            {pickupMethod === 'other' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-dark-gray mb-2">
                  Beskriv nøyaktig hvor posen skal plasseres *
                </label>
                <textarea
                  value={pickupLocationDescription}
                  onChange={(e) => setPickupLocationDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue resize-none"
                  placeholder="F.eks. 'Bak huset ved kjøkkenvinduet', 'I garasjen på høyre side', 'Ved søppelbøttene'"
                  rows={3}
                  required
                />
              </div>
            )}

            {/* Photo requirement warning for non-home options */}
            {pickupMethod !== 'home' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-yellow-600 mr-3 mt-0.5">📸</div>
                  <div>
                    <h4 className="font-semibold text-yellow-800 mb-1">Viktig: Foto kreves</h4>
                    <p className="text-sm text-yellow-700">
                      Du må ta bilde av posen når du plasserer den. Uten foto kan vi ikke hente posen din av sikkerhetshensyn.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-between items-center">
          <Link
            href="/orders/location-service"
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={
              !street.trim() ||
              !postalCode.trim() ||
              postalCode.length !== 4 ||
              (pickupMethod === 'other' && !pickupLocationDescription.trim())
            }
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
              street.trim() &&
              postalCode.trim() &&
              postalCode.length === 4 &&
              (pickupMethod !== 'other' || pickupLocationDescription.trim())
                ? 'bg-nordic-blue text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Fortsett til instruksjoner
          </button>
        </div>
      </div>
    </div>
  );
}
