'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, MessageSquare, ChevronLeft } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';

export default function AddressPage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Address state
  const [street, setStreet] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      // Pre-fill city from location selection
      
      if (orderData.address) {
        setStreet(orderData.address.street || '');
        setPostalCode(orderData.address.postalCode || '');
        setSpecialInstructions(orderData.address.specialInstructions || '');
        setCity(orderData.address.city || '');
      }

      if (orderData.specialInstructions) {
        setAdditionalInfo(orderData.specialInstructions);
      }
    }
  }, [orderData]);

  // Redirect if previous steps not completed
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

    // Update store with address data
    updateOrderData({
      address: {
        street,
        city,
        postalCode,
        specialInstructions,
      },
      specialInstructions: additionalInfo,
    });

    router.push('/orders/confirm');
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
        <OrderFlowProgress currentStep={3} />

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
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                placeholder="F.eks. Strandgaten 15"
                required
              />
            </div>

            {/* Postal Code and City */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Postnummer <span className="text-teal-600">*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="5001"
                  maxLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Poststed <span className="text-teal-600">*</span>
                </label>
                <input
                  onChange={(e) => setCity(e.target.value)}
                  type="text"
                  value={city}                  
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-600"
                />
              </div>
            </div>

            {/* Pickup Instructions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Henteinstruksjoner
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
                placeholder="F.eks. Ring på døren, posen står utenfor, kode til port: 1234..."
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-2">Hjelp oss å finne frem til deg</p>
            </div>
          </div>
        </div>

        {/* Additional Information (Optional) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <div className="flex items-center mb-4">
            <MessageSquare className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-medium text-slate-900">Ekstra informasjon (valgfritt)</h3>
          </div>

          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none"
            placeholder="Spesielle ønsker? Allergier? Ting vi bør vite om klærne dine?"
            rows={4}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Link
            href="/orders/schedule"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={!street.trim() || !postalCode.trim() || postalCode.length !== 4}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
              street.trim() && postalCode.trim() && postalCode.length === 4
                ? 'bg-teal-600 text-white hover:bg-teal-700'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Neste
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
