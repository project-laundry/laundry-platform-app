'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { getAvailableWeekdaysAction } from '../actions';
import type { Weekday } from '@/types/database';

const FIXED_PICKUP_TIME = '15:00-20:00';

const weekdays = [
  { value: 'monday' as const, label: 'Mandag', dayIndex: 1 },
  { value: 'tuesday' as const, label: 'Tirsdag', dayIndex: 2 },
  { value: 'wednesday' as const, label: 'Onsdag', dayIndex: 3 },
  { value: 'thursday' as const, label: 'Torsdag', dayIndex: 4 },
  { value: 'friday' as const, label: 'Fredag', dayIndex: 5 },
  { value: 'saturday' as const, label: 'Lørdag', dayIndex: 6 },
  { value: 'sunday' as const, label: 'Søndag', dayIndex: 0 }
];

const getNextDeliveryDays = (hasBag: boolean, count: number = 30) => {
  const days = [];
  const today = new Date();
  // If no bag, skip tomorrow (bag delivery day) and start from day after tomorrow
  const startOffset = hasBag ? 1 : 2;

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
      weekdayValue: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()] as Weekday,
      isFirstOption: i === 0
    });
  }

  return days;
};

export default function SchedulePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  // Get plan and services data from store
  const plan = orderData?.plan || 'single';
  const hasBag = orderData?.hasBag || false;

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [address, setAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    specialInstructions: ''
  });

  const [pickupMethod, setPickupMethod] = useState<'home' | 'entrance' | 'other'>('home');
  const [otherLocation, setOtherLocation] = useState('');

  // Helper function to get weekday from date string
  const getWeekdayFromDate = (dateString: string): Weekday => {
    const date = new Date(dateString);
    const dayIndex = date.getDay();
    const weekdayMap: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return weekdayMap[dayIndex];
  };

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setSelectedDate(orderData.pickupDate || '');
      if (orderData.address) {
        setAddress(orderData.address);
      }
      if (orderData.pickupMethod) {
        setPickupMethod(orderData.pickupMethod);
      }
      if (orderData.otherLocation) {
        setOtherLocation(orderData.otherLocation);
      }
    }
  }, [orderData]);

  // Availability state
  const [availableWeekdays, setAvailableWeekdays] = useState<Weekday[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  // Fetch available weekdays when city changes
  useEffect(() => {
    if (!address.city) {
      setAvailableWeekdays([]);
      return;
    }

    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      setAvailabilityError('');
      try {
        const weekdays = await getAvailableWeekdaysAction(address.city);
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
  }, [address.city]);

  // Helper function to get delivery date info (the selected date is the delivery date)
  const getDeliveryDateInfo = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

    // Calculate bag delivery (day before the selected delivery date)
    const bagDelivery = new Date(date);
    bagDelivery.setDate(date.getDate() - 1);

    return {
      deliveryDay: dayNames[date.getDay()],
      deliveryDate: `${date.getDate()}. ${monthNames[date.getMonth()]}`,
      bagDeliveryDay: dayNames[bagDelivery.getDay()],
      bagDeliveryDate: `${bagDelivery.getDate()}. ${monthNames[bagDelivery.getMonth()]}`
    };
  };

  // Helper function to get delivery info for recurring weekday
  const getWeekdayDeliveryInfo = (weekday: Weekday) => {
    const selectedDay = weekdays.find(d => d.value === weekday);
    if (!selectedDay) return { deliveryDay: '', deliveryDate: '', bagDeliveryDay: '', bagDeliveryDate: '' };

    const today = new Date();
    const currentDayIndex = today.getDay();

    // Calculate days until next occurrence
    let daysUntil = selectedDay.dayIndex - currentDayIndex;
    if (daysUntil <= 0) daysUntil += 7;

    const nextDelivery = new Date(today);
    nextDelivery.setDate(today.getDate() + daysUntil);

    const bagDelivery = new Date(nextDelivery);
    bagDelivery.setDate(nextDelivery.getDate() - 1);

    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    return {
      deliveryDay: selectedDay.label,
      deliveryDate: `${nextDelivery.getDate()}. ${['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'][nextDelivery.getMonth()]}`,
      bagDeliveryDay: dayNames[bagDelivery.getDay()],
      bagDeliveryDate: `${bagDelivery.getDate()}. ${['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'][bagDelivery.getMonth()]}`
    };
  };

  const deliveryDays = getNextDeliveryDays(hasBag);


  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    // Validate city selection
    if (!address.city) {
      alert('Vennligst velg by');
      return;
    }

    // Validate date selection (required for both single and recurring plans)
    if (!selectedDate) {
      alert('Vennligst velg dato');
      return;
    }

    if (!address.street || !address.postalCode) {
      alert('Vennligst fyll ut adresse');
      return;
    }
    if (pickupMethod === 'other' && !otherLocation.trim()) {
      alert('Vennligst beskriv hvor posen skal plasseres');
      return;
    }

    // Update store with schedule data
    updateOrderData({
      pickupDate: selectedDate, // Always store the selected date (first pickup date)
      pickupTime: FIXED_PICKUP_TIME,
      address,
      pickupMethod,
      otherLocation: pickupMethod === 'other' ? otherLocation : ''
    });

    router.push('/orders/instructions');
  };

  // No items to count since bag-based subscription

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Velg hentingstid</span>
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
              <span className="ml-2 text-nordic-blue font-medium">Velg tid</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="ml-2 text-gray-600">Instruksjoner</span>
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
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Når skal vi hente?</h2>
        </div>

        {/* City Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Velg by</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setAddress(prev => ({ ...prev, city: 'Bergen' }))}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                address.city === 'Bergen'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Bergen</div>
            </button>
            <button
              onClick={() => setAddress(prev => ({ ...prev, city: 'Oslo' }))}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                address.city === 'Oslo'
                  ? 'border-nordic-blue bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-dark-gray">Oslo</div>
            </button>
          </div>
        </div>

        {/* Date or Weekday Selection based on plan type */}
        {plan === 'single' ? (
          /* Date Selection for single plan */
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg første henting</h3>

            {/* Show message if no city selected */}
            {!address.city && (
              <p className="text-medium-gray text-center py-4">Velg by først for å se tilgjengelige datoer</p>
            )}

            {/* Show loading state */}
            {address.city && isLoadingAvailability && (
              <p className="text-medium-gray text-center py-4">Laster tilgjengelighet...</p>
            )}

            {/* Show error if no cleaners available */}
            {address.city && !isLoadingAvailability && availabilityError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800">{availabilityError}</p>
              </div>
            )}

            {/* Desktop: Horizontal scroll */}
            {address.city && !isLoadingAvailability && !availabilityError && (
              <div className="hidden sm:block relative">
                {/* Scroll indicator - left fade */}
                <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll indicator - right fade */}
                <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll hint arrow - right */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-nordic-blue text-2xl pointer-events-none z-10 animate-pulse">
                  →
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2" style={{scrollbarWidth: 'thin'}}>
                  {deliveryDays.map((day) => {
                    const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateString;
                    const isAvailable = availableWeekdays.includes(day.weekdayValue);

                    return (
                      <button
                        key={dateString}
                        onClick={() => isAvailable && setSelectedDate(dateString)}
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
            {address.city && !isLoadingAvailability && !availabilityError && (
              <div className="sm:hidden relative">
                {/* Scroll indicator - left fade */}
                <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll indicator - right fade */}
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll hint arrow - right */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-nordic-blue text-xl pointer-events-none z-10 animate-pulse">
                  →
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                  {deliveryDays.map((day) => {
                    const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateString;
                    const isAvailable = availableWeekdays.includes(day.weekdayValue);

                    return (
                      <button
                        key={dateString}
                        onClick={() => isAvailable && setSelectedDate(dateString)}
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
        ) : (
          /* Weekday Selection for recurring plans */
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg første henting</h3>
            <p className="text-medium-gray mb-6">
              Velg dag for din første henting. Dette blir din faste ukedag for alle fremtidige hentinger.
            </p>

            {/* Show message if no city selected */}
            {!address.city && (
              <p className="text-medium-gray text-center py-4">Velg by først for å se tilgjengelige datoer</p>
            )}

            {/* Show loading state */}
            {address.city && isLoadingAvailability && (
              <p className="text-medium-gray text-center py-4">Laster tilgjengelighet...</p>
            )}

            {/* Show error if no cleaners available */}
            {address.city && !isLoadingAvailability && availabilityError && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                <p className="text-yellow-800">{availabilityError}</p>
              </div>
            )}

            {/* Desktop: Horizontal scroll */}
            {address.city && !isLoadingAvailability && !availabilityError && (
              <div className="hidden sm:block relative">
                {/* Scroll indicator - left fade */}
                <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll indicator - right fade */}
                <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll hint arrow - right */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-nordic-blue text-2xl pointer-events-none z-10 animate-pulse">
                  →
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2" style={{scrollbarWidth: 'thin'}}>
                  {deliveryDays.map((day) => {
                    const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateString;
                    const isAvailable = availableWeekdays.includes(day.weekdayValue);

                    return (
                      <button
                        key={`${day.date.getTime()}`}
                        onClick={() => isAvailable && setSelectedDate(dateString)}
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
            {address.city && !isLoadingAvailability && !availabilityError && (
              <div className="sm:hidden relative">
                {/* Scroll indicator - left fade */}
                <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll indicator - right fade */}
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10"></div>
                {/* Scroll hint arrow - right */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 text-nordic-blue text-xl pointer-events-none z-10 animate-pulse">
                  →
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                  {deliveryDays.map((day) => {
                    const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                    const isSelected = selectedDate === dateString;
                    const isAvailable = availableWeekdays.includes(day.weekdayValue);

                    return (
                      <button
                        key={`${day.date.getTime()}`}
                        onClick={() => isAvailable && setSelectedDate(dateString)}
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
        )}

        {/* Bag Delivery Notice */}
        {!hasBag && selectedDate && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
            <div className="flex items-start">
              <div className="text-4xl mr-4">📦</div>
              <div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">NooraCare-pose leveres først</h3>
                <p className="text-medium-gray leading-relaxed">
                  Vi leverer en gratis NooraCare-pose <span className="font-semibold text-dark-gray">{getDeliveryDateInfo(selectedDate).bagDeliveryDay} {getDeliveryDateInfo(selectedDate).bagDeliveryDate}</span> (dagen før din første henting). Du får SMS når posen er levert, så du kan fylle den med tøy til neste dag.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Delivery Time Information */}
        {selectedDate ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
            <div className="flex items-start">
              <div className="text-2xl mr-3">📅</div>
              <div>
                <h4 className="text-base font-semibold text-dark-gray mb-1">Hentetidspunkt</h4>
                <p className="text-sm text-medium-gray">
                  Neste henting: <span className="font-semibold text-dark-gray">{getDeliveryDateInfo(selectedDate).deliveryDay} {getDeliveryDateInfo(selectedDate).deliveryDate}</span> mellom kl. <span className="font-semibold text-dark-gray">15:00-20:00</span>
                  {plan !== 'single' && (
                    <>
                      <br />
                      <span className="text-xs">Deretter hver {weekdays.find(d => d.value === getWeekdayFromDate(selectedDate))?.label.toLowerCase()} til samme tid.</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Pickup Method Selection */}
        <div className="bg-white rounded-2xl p-8 mb-8">
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

            {/* Additional text input for "other" location */}
            {pickupMethod === 'other' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-semibold text-dark-gray mb-2">
                  Beskriv nøyaktig hvor posen skal plasseres *
                </label>
                <textarea
                  value={otherLocation}
                  onChange={(e) => setOtherLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue resize-none"
                  placeholder="F.eks. 'Bak huset ved kjøkkenvinduet', 'I garasjen på høyre side', 'Ved søppelbøttene'"
                  rows={3}
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Address Form */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Hentingsadresse</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                Gateadresse *
              </label>
              <input
                type="text"
                name="street"
                value={address.street}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="Storgata 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                Postnummer *
              </label>
              <input
                type="text"
                name="postalCode"
                value={address.postalCode}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="5001"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                Tilleggsinformasjon (valgfritt)
              </label>
              <textarea
                name="specialInstructions"
                value={address.specialInstructions}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue resize-none"
                placeholder="F.eks. 'Ring på dørklokka', '2. etasje til høyre', etc."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-between items-center">
          <Link
            href="/orders/additional-services"
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={
              !address.city ||
              !selectedDate ||
              !address.street ||
              !address.postalCode ||
              (pickupMethod === 'other' && !otherLocation.trim())
            }
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
              address.city &&
              selectedDate &&
              address.street &&
              address.postalCode &&
              (pickupMethod !== 'other' || otherLocation.trim())
                ? 'bg-nordic-blue text-white hover:bg-blue-600'
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