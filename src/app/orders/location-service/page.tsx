'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Sparkles, Check, Clock, ChevronLeft } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';

type Location = 'Bergen' | 'Oslo';
type Service = 'wash_and_iron' | 'wash_only';

export default function LocationServicePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [location, setLocation] = useState<Location>('Bergen');
  const [service, setService] = useState<Service>('wash_and_iron');

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setLocation(orderData.location || 'Bergen');
      setService(orderData.needsIroning ? 'wash_and_iron' : 'wash_only');
    }
  }, [orderData]);

  const handleContinue = () => {
    // Validate selection
    if (!location || !service) {
      alert('Vennligst velg lokasjon og tjeneste');
      return;
    }

    // Update store
    updateOrderData({
      location,
      needsIroning: service === 'wash_and_iron',
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
        <OrderFlowProgress currentStep={1} />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Sted & Tjeneste</h2>
          <p className="text-slate-500">Velg lokasjon og tjeneste</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
          {/* Location Selection */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <MapPin className="w-5 h-5 text-teal-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Velg lokasjon</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Bergen - Available */}
              <button
                onClick={() => setLocation('Bergen')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  location === 'Bergen'
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">Bergen</span>
                  {location === 'Bergen' && (
                    <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-500">Tilgjengelig nå</p>
              </button>

              {/* Oslo - Coming Soon */}
              <button
                disabled
                className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed relative"
              >
                <Clock className="w-4 h-4 text-slate-400 absolute top-3 right-3" />
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-500">Oslo</span>
                </div>
                <p className="text-sm text-slate-400">Kommer snart</p>
              </button>
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <div className="flex items-center mb-4">
              <Sparkles className="w-5 h-5 text-teal-600 mr-2" />
              <h3 className="text-lg font-medium text-slate-900">Velg tjeneste</h3>
            </div>
            <div className="space-y-4">
              {/* Wash & Ironing - Popular */}
              <button
                onClick={() => setService('wash_and_iron')}
                className={`w-full p-5 rounded-xl border-2 transition-all duration-200 ${
                  service === 'wash_and_iron'
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      service === 'wash_and_iron' ? 'bg-teal-100' : 'bg-slate-100'
                    }`}
                  >
                    <Sparkles
                      className={`w-6 h-6 ${
                        service === 'wash_and_iron' ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">Vask & Stryking</h4>
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                        Populær
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      Komplett behandling med profesjonell stryking
                    </p>
                    <p className="text-sm font-medium text-teal-600">Fra 299 kr</p>
                  </div>

                  {/* Checkmark */}
                  {service === 'wash_and_iron' && (
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 ml-4">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>

              {/* Wash Only */}
              <button
                onClick={() => setService('wash_only')}
                className={`w-full p-5 rounded-xl border-2 transition-all duration-200 ${
                  service === 'wash_only'
                    ? 'border-teal-600 bg-teal-50/50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start">
                  {/* Icon */}
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                      service === 'wash_only' ? 'bg-teal-100' : 'bg-slate-100'
                    }`}
                  >
                    <Sparkles
                      className={`w-6 h-6 ${
                        service === 'wash_only' ? 'text-teal-600' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-slate-900 mb-1">Kun Vask</h4>
                    <p className="text-sm text-slate-500 mb-2">
                      Skånsom vask med premium produkter
                    </p>
                    <p className="text-sm font-medium text-teal-600">Fra 199 kr</p>
                  </div>

                  {/* Checkmark */}
                  {service === 'wash_only' && (
                    <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 ml-4">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Link
            href="/dashboard"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={!location || !service}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
              location && service
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
