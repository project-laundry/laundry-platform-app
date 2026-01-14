'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, RefreshCw, ChevronLeft, Check } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';
import { Calendar } from '@/components/ui/Calendar';
import { getAvailableWeekdaysAction } from '../actions';
import type { Weekday } from '@/types/database';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

export default function SchedulePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Log every render
  console.log('[Schedule] RENDER:', { hasHydrated, location: orderData?.location });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  // Availability state
  const [availableWeekdays, setAvailableWeekdays] = useState<Weekday[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setSelectedDate(orderData.firstPickupDate || '');
      setIsRecurring(orderData.isRecurring || false);
      setFrequency((orderData.frequency as Frequency) || 'weekly');
    }
  }, [orderData]);

  // Redirect if location not selected (only after hydration)
  useEffect(() => {    
    if (hasHydrated && !orderData?.location) {      
      router.push('/orders/location-service');
    }
  }, [hasHydrated, orderData?.location, router]);

  // Fetch available weekdays when location is available
  useEffect(() => {
    const fetchAvailability = async () => {
      if (!orderData?.location) return;

      setIsLoadingAvailability(true);
      try {
        const weekdays = await getAvailableWeekdaysAction(orderData.location);
        setAvailableWeekdays(weekdays);
      } catch {
        setAvailableWeekdays([]);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [orderData?.location]);

  const handleContinue = () => {
    if (!selectedDate) {
      alert('Vennligst velg hentedato');
      return;
    }

    updateOrderData({
      firstPickupDate: selectedDate,
      isRecurring,
      frequency: isRecurring ? frequency : null,
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
        <OrderFlowProgress currentStep={2} />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Dato & Frekvens</h2>
          <p className="text-slate-500">Velg hentedato</p>
        </div>

        {/* Calendar Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className="flex items-center mb-4">
            <CalendarIcon className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-medium text-slate-900">Velg hentedato</h3>
          </div>

          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            availableWeekdays={availableWeekdays}
            minDaysNotice={2}
            disabled={isLoadingAvailability}
          />
        </div>

        {/* Recurring Toggle and Frequency */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
          <div className={`flex items-center justify-between ${isRecurring ? 'mb-6' : ''}`}>
            <div className="flex items-start">
              <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mr-4">
                <RefreshCw className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h4 className="font-medium text-slate-900">Fast avtale</h4>
                <p className="text-sm text-slate-500 mt-1">Gjentakende henting</p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRecurring ? 'bg-teal-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRecurring ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Frequency Options (shown when recurring is ON) */}
          {isRecurring && (
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Velg frekvens</h3>
              <div className="space-y-3">
                {/* Weekly */}
                <button
                  onClick={() => setFrequency('weekly')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    frequency === 'weekly'
                      ? 'border-teal-600 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h4 className="font-medium text-slate-900">Ukentlig</h4>
                      <p className="text-sm text-slate-500">Hver uke</p>
                    </div>
                    {frequency === 'weekly' && (
                      <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Biweekly */}
                <button
                  onClick={() => setFrequency('biweekly')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    frequency === 'biweekly'
                      ? 'border-teal-600 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h4 className="font-medium text-slate-900">Annenhver uke</h4>
                      <p className="text-sm text-slate-500">Hver 14. dag</p>
                    </div>
                    {frequency === 'biweekly' && (
                      <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Monthly */}
                <button
                  onClick={() => setFrequency('monthly')}
                  className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                    frequency === 'monthly'
                      ? 'border-teal-600 bg-teal-50/50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h4 className="font-medium text-slate-900">Månedlig</h4>
                      <p className="text-sm text-slate-500">En gang i måneden</p>
                    </div>
                    {frequency === 'monthly' && (
                      <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <Link
            href="/orders/location-service"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={!selectedDate}
            className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm ${
              selectedDate
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
