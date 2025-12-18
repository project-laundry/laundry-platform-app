'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { getAvailableWeekdaysAction } from '../actions';
import type { Weekday } from '@/types/database';
import { getWeekdayFromDate } from '@/lib/utils/date';

const getNextDeliveryDays = (count: number = 30) => {
  const days = [];
  const today = new Date();
  const startOffset = 1; // Start from tomorrow

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + startOffset + i);

    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

    days.push({
      date: date,
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()],
      weekdayValue: getWeekdayFromDate(date.toISOString().split('T')[0]),
    });
  }

  return days;
};

export default function LocationServicePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Location and service state
  const [location, setLocation] = useState<'Bergen' | 'Oslo'>('Bergen');
  const [firstPickupDate, setFirstPickupDate] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [needsIroning, setNeedsIroning] = useState(false);

  // Availability state
  const [availableWeekdays, setAvailableWeekdays] = useState<Weekday[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setLocation(orderData.location || 'Bergen');
      setFirstPickupDate(orderData.firstPickupDate || '');
      setIsRecurring(orderData.isRecurring || false);
      setFrequency((orderData.frequency as 'weekly' | 'biweekly' | 'monthly') || 'weekly');
      setNeedsIroning(orderData.needsIroning || false);
    }
  }, [orderData]);

  // Fetch available weekdays when location changes
  useEffect(() => {
    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      setAvailabilityError('');
      try {
        const weekdays = await getAvailableWeekdaysAction(location);
        setAvailableWeekdays(weekdays);
        if (weekdays.length === 0) {
          setAvailabilityError('Ingen rensere tilgjengelige i dette området ennå.');
        }
      } catch {
        setAvailabilityError('Kunne ikke hente tilgjengelighet. Prøv igjen.');
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [location]);

  const deliveryDays = getNextDeliveryDays();

  const handleContinue = () => {
    // Validate
    if (!location) {
      alert('Vennligst velg lokasjon');
      return;
    }
    if (!firstPickupDate) {
      alert('Vennligst velg første hentedato');
      return;
    }

    // Update store with data
    updateOrderData({
      location,
      firstPickupDate,
      isRecurring,
      frequency: isRecurring ? frequency : null,
      needsIroning,
    });

    router.push('/orders/address');
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
            <span className="text-medium-gray">Bestill vask</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-nordic-blue text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <span className="ml-2 text-nordic-blue font-medium">Tjeneste</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="ml-2 text-gray-600">Adresse</span>
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
          <h2 className="text-3xl font-bold text-dark-gray mb-4">La oss starte din vask</h2>
          <p className="text-medium-gray">Vask er alltid inkludert. Velg om du vil ha stryking også.</p>
        </div>

        {/* Location Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Velg by</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setLocation('Bergen')}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                location === 'Bergen'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Bergen</div>
            </button>
            <button
              onClick={() => setLocation('Oslo')}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                location === 'Oslo'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Oslo</div>
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg første henting</h3>

          {/* Show loading state */}
          {isLoadingAvailability && (
            <p className="text-medium-gray text-center py-4">Laster tilgjengelighet...</p>
          )}

          {/* Show error if no cleaners available */}
          {!isLoadingAvailability && availabilityError && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800">{availabilityError}</p>
            </div>
          )}

          {/* Desktop: Horizontal scroll */}
          {!isLoadingAvailability && !availabilityError && (
            <div className="hidden sm:block relative">
              <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
              <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-nordic-blue text-2xl pointer-events-none z-10 animate-pulse">
                →
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2" style={{scrollbarWidth: 'thin'}}>
                {deliveryDays.map((day) => {
                  const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                  const isSelected = firstPickupDate === dateString;
                  const isAvailable = availableWeekdays.includes(day.weekdayValue);

                  return (
                    <button
                      key={dateString}
                      onClick={() => isAvailable && setFirstPickupDate(dateString)}
                      disabled={!isAvailable}
                      className={`flex-shrink-0 p-4 rounded-lg border-2 text-center transition-colors min-w-[120px] ${
                        !isAvailable
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'border-nordic-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={!isAvailable ? 'Ingen rensere tilgjengelige denne dagen' : ''}
                    >
                      <div className="text-sm text-medium-gray mb-1">
                        {day.dayName}
                      </div>
                      <div className={`font-bold ${isAvailable ? 'text-dark-gray' : 'text-gray-400'}`}>{day.dayNum}</div>
                      <div className="text-xs text-medium-gray">{day.monthName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile: Horizontal scroll */}
          {!isLoadingAvailability && !availabilityError && (
            <div className="sm:hidden relative">
              <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
              <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-nordic-blue text-xl pointer-events-none z-10 animate-pulse">
                →
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                {deliveryDays.map((day) => {
                  const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                  const isSelected = firstPickupDate === dateString;
                  const isAvailable = availableWeekdays.includes(day.weekdayValue);

                  return (
                    <button
                      key={dateString}
                      onClick={() => isAvailable && setFirstPickupDate(dateString)}
                      disabled={!isAvailable}
                      className={`flex-shrink-0 p-3 rounded-lg border-2 text-center transition-colors min-w-[80px] ${
                        !isAvailable
                          ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                          : isSelected
                          ? 'border-nordic-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs text-medium-gray mb-1">
                        {day.dayName.substring(0, 3)}
                      </div>
                      <div className={`font-bold text-lg ${isAvailable ? 'text-dark-gray' : 'text-gray-400'}`}>{day.dayNum}</div>
                      <div className="text-xs text-medium-gray">{day.monthName}</div>
                    </button>
                  );
                })}
              </div>
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
            </div>
          )}
        </div>

        {/* Recurring Toggle */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Er dette et abonnement?</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setIsRecurring(true)}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                isRecurring
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Ja, gjentakende</div>
            </button>
            <button
              onClick={() => setIsRecurring(false)}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                !isRecurring
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Nei, engangs</div>
            </button>
          </div>

          {/* Frequency Selection (only if recurring) */}
          {isRecurring && (
            <div>
              <h4 className="text-base font-semibold text-dark-gray mb-4">Hvor ofte?</h4>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => setFrequency('weekly')}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    frequency === 'weekly'
                      ? 'border-nordic-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-dark-gray">Ukentlig</div>
                </button>
                <button
                  onClick={() => setFrequency('biweekly')}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    frequency === 'biweekly'
                      ? 'border-nordic-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-dark-gray">Annenhver uke</div>
                </button>
                <button
                  onClick={() => setFrequency('monthly')}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    frequency === 'monthly'
                      ? 'border-nordic-blue bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-dark-gray">Månedlig</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ironing Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-2">Ønsker du stryking?</h3>
          <p className="text-sm text-medium-gray mb-4">Vask er alltid inkludert. Velg om du også vil ha stryking.</p>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setNeedsIroning(true)}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                needsIroning
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Ja, med stryking</div>
            </button>
            <button
              onClick={() => setNeedsIroning(false)}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                !needsIroning
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Nei, bare vask</div>
            </button>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-between items-center">
          <Link
            href="/dashboard"
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Avbryt
          </Link>

          <button
            onClick={handleContinue}
            disabled={!location || !firstPickupDate}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
              location && firstPickupDate
                ? 'bg-nordic-blue text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Fortsett til adresse
          </button>
        </div>
      </div>
    </div>
  );
}
