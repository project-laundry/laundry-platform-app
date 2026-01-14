'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Check, ChevronLeft, MessageSquare } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';

type Service = 'wash_and_iron' | 'wash_only';

export default function ServicePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [service, setService] = useState<Service>('wash_and_iron');
  const [additionalInfo, setAdditionalInfo] = useState('');

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setService(orderData.needsIroning ? 'wash_and_iron' : 'wash_only');
      setAdditionalInfo(orderData.specialInstructions || '');
    }
  }, [orderData]);

  const handleContinue = () => {
    updateOrderData({
      needsIroning: service === 'wash_and_iron',
      specialInstructions: additionalInfo || undefined,
    });

    router.push('/orders/address');
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
          <h2 className="text-3xl font-light text-slate-900 mb-2">Velg tjeneste</h2>
          <p className="text-slate-500">Hva slags vask trenger du?</p>
        </div>

        {/* Service Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <div className="flex items-center mb-4">
            <Sparkles className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-medium text-slate-900">Velg tjeneste</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wash & Ironing - Popular */}
            <button
              type="button"
              onClick={() => setService('wash_and_iron')}
              className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                service === 'wash_and_iron'
                  ? 'border-teal-600 bg-teal-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900">Vask & Stryking</h4>
                  <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">
                    Populær
                  </span>
                </div>
                {service === 'wash_and_iron' && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>

            {/* Wash Only */}
            <button
              type="button"
              onClick={() => setService('wash_only')}
              className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                service === 'wash_only'
                  ? 'border-teal-600 bg-teal-50/50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900">Kun Vask</h4>
                </div>
                {service === 'wash_only' && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            </button>
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
          <p className="text-xs text-slate-500 mt-2">
            F.eks. behandling av spesielle materialer, fargepreferanser, allergier, etc.
          </p>
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
            className="px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm bg-teal-600 text-white hover:bg-teal-700"
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
