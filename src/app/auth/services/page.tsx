'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface AdditionalService {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'basic' | 'premium' | 'special';
  popular?: boolean;
  available?: boolean;
  unavailableReason?: string;
}

const additionalServices: AdditionalService[] = [
  {
    id: 'express-wash',
    name: 'Ekspressvask',
    description: 'Få klærne dine ferdig samme dag',
    price: 149,
    category: 'premium',
    popular: true,
    available: true
  },
  {
    id: 'eco-detergent',
    name: 'Miljøvennlig vaskemiddel',
    description: 'Bruker kun miljøvennlige og allergivennlige produkter',
    price: 89,
    category: 'basic',
    available: true
  },
  {
    id: 'fabric-protection',
    name: 'Tekstilbeskyttelse',
    description: 'Impregnering som beskytter mot flekker og vann',
    price: 199,
    category: 'premium',
    available: false,
    unavailableReason: 'Ikke tilgjengelig i ditt område'
  },
  {
    id: 'delicate-care',
    name: 'Spesial omsorg',
    description: 'Ekstra forsiktig behandling av fine og delikate plagg',
    price: 129,
    category: 'premium',
    available: true
  },
  {
    id: 'pickup-flexibility',
    name: 'Fleksibel henting',
    description: 'Kan hente når som helst på dagen uten timebestilling',
    price: 99,
    category: 'basic',
    available: true
  },
  {
    id: 'ironing-service',
    name: 'Strykservice',
    description: 'Alle plagg strykes og henges pent opp',
    price: 179,
    category: 'basic',
    available: true
  }
];

const plans = {
  starter: { name: 'Start', price: 500 },
  family: { name: 'Familie', price: 1000 },
  premium: { name: 'Premium', price: 2000 }
};

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'family';
  const addressParam = searchParams.get('address');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [customerAddress, setCustomerAddress] = useState(() => {
    if (addressParam) {
      try {
        return JSON.parse(decodeURIComponent(addressParam));
      } catch {
        return null;
      }
    }
    return null;
  });

  const basePlanPrice = plans[selectedPlan as keyof typeof plans]?.price || 1000;
  const basePlanName = plans[selectedPlan as keyof typeof plans]?.name || 'Familie';

  const toggleService = (serviceId: string) => {
    const service = additionalServices.find(s => s.id === serviceId);
    if (!service?.available) return; // Don't allow selecting unavailable services

    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const totalAddOnPrice = selectedServices.reduce((total, serviceId) => {
    const service = additionalServices.find(s => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0);

  const totalPrice = basePlanPrice + totalAddOnPrice;

  const handleContinue = () => {
    const params = new URLSearchParams();
    params.set('plan', selectedPlan);
    if (selectedServices.length > 0) {
      params.set('services', selectedServices.join(','));
    }
    if (customerAddress) {
      params.set('address', encodeURIComponent(JSON.stringify(customerAddress)));
    }
    window.location.href = `/auth/payment?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-nordic-blue">RenVask</h1>
          </Link>
        </div>
      </header>

      {/* Progress indicator */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-medium-gray">Steg 2 av 3</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div className="bg-nordic-blue h-2 rounded-full" style={{ width: '66.67%' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Tilpassa tjenester</h2>
          <p className="text-xl text-medium-gray mb-2">
            Ønsker du ekstra tjenester?
          </p>
          <p className="text-sm text-medium-gray">
            Du valgte <strong>{basePlanName}</strong> planen
          </p>
        </div>

        {/* Address Display */}
        {customerAddress && (
          <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-dark-gray mb-2">Leveringsadresse</h3>
                <div className="text-medium-gray">
                  <p>{customerAddress.street}</p>
                  <p>{customerAddress.postalCode} {customerAddress.city}</p>
                  <p>{customerAddress.country}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingAddress(true)}
                className="text-nordic-blue hover:text-blue-600 text-sm font-medium"
              >
                Rediger adresse
              </button>
            </div>
          </div>
        )}

        {/* Address Edit Modal */}
        {isEditingAddress && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-dark-gray mb-4">Rediger adresse</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={customerAddress?.street || ''}
                  onChange={(e) => setCustomerAddress(prev => ({ ...prev!, street: e.target.value }))}
                  placeholder="Gateadresse"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={customerAddress?.postalCode || ''}
                    onChange={(e) => setCustomerAddress(prev => ({ ...prev!, postalCode: e.target.value }))}
                    placeholder="Postnummer"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                  />
                  <input
                    type="text"
                    value={customerAddress?.city || ''}
                    onChange={(e) => setCustomerAddress(prev => ({ ...prev!, city: e.target.value }))}
                    placeholder="By"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                  />
                </div>
                <div className="flex space-x-4 pt-4">
                  <button
                    onClick={() => setIsEditingAddress(false)}
                    className="flex-1 bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Lagre
                  </button>
                  <button
                    onClick={() => setIsEditingAddress(false)}
                    className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Services Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {additionalServices.map((service) => {
            const isSelected = selectedServices.includes(service.id);
            const isAvailable = service.available !== false;
            return (
              <div
                key={service.id}
                className={`bg-white rounded-xl p-6 border-2 transition-all relative ${
                  !isAvailable
                    ? 'border-gray-200 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'border-nordic-blue shadow-lg cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                }`}
                onClick={() => toggleService(service.id)}
              >
                {/* Popular Badge */}
                {service.popular && isAvailable && (
                  <div className="absolute -top-3 right-4 bg-fresh-green text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Populært
                  </div>
                )}

                {/* Unavailable Badge */}
                {!isAvailable && (
                  <div className="absolute -top-3 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Utilgjengelig
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1 mr-4">
                    <h3 className={`text-lg font-semibold mb-2 ${
                      isAvailable ? 'text-dark-gray' : 'text-gray-400'
                    }`}>
                      {service.name}
                    </h3>
                    <p className={`text-sm mb-3 ${
                      isAvailable ? 'text-medium-gray' : 'text-gray-400'
                    }`}>
                      {service.description}
                    </p>

                    {/* Availability Status */}
                    {!isAvailable && service.unavailableReason && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-700 font-medium">
                          {service.unavailableReason}
                        </p>
                      </div>
                    )}

                    <div className={`text-lg font-bold ${
                      isAvailable ? 'text-dark-gray' : 'text-gray-400'
                    }`}>
                      +{service.price} kr/mnd
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    !isAvailable
                      ? 'border-gray-300 bg-gray-100'
                      : isSelected
                      ? 'border-nordic-blue bg-nordic-blue'
                      : 'border-gray-300'
                  }`}>
                    {isSelected && isAvailable && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {!isAvailable && (
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Summary - Fixed at bottom like SATS */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-medium-gray mb-1">
                  {basePlanName} plan
                </div>
                {selectedServices.length > 0 && (
                  <div className="text-xs text-medium-gray">
                    + {selectedServices.length} tilleggstjeneste{selectedServices.length !== 1 ? 'r' : ''}
                  </div>
                )}
                <div className="text-2xl font-bold text-dark-gray">                  
                  {totalPrice} kr/mnd
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="bg-nordic-blue text-white font-semibold px-8 py-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Fortsett
              </button>
            </div>
          </div>
        </div>

        {/* Spacer for fixed footer */}
        <div className="h-24"></div>

        {/* Back Link */}
        <div className="text-center mb-8">
          <Link
            href={`/auth/plans`}
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Tilbake til planer
          </Link>
        </div>
      </div>
    </div>
  );
}