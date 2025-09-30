'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface LaundryItem {
  type: string;
  quantity: number;
}

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

const getNextDeliveryDays = (hasBag: boolean, count: number = 7) => {
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

type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'single';
  const hasBag = searchParams.get('hasBag') === 'true';
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday | ''>('');
  const [address, setAddress] = useState({
    street: '',
    city: 'Bergen',
    postalCode: '',
    specialInstructions: ''
  });

  const [pickupMethod, setPickupMethod] = useState<'home' | 'entrance' | 'other'>('home');
  const [otherLocation, setOtherLocation] = useState('');

  // Helper function to get delivery date info (the selected date is the delivery date)
  const getDeliveryDateInfo = (dateString: string) => {
    const date = new Date(dateString);
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    return {
      deliveryDay: dayNames[date.getDay()],
      deliveryDate: `${date.getDate()}. ${['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'][date.getMonth()]}`
    };
  };

  // Helper function to get bag delivery date (one day before delivery)
  const getBagDeliveryInfo = (dateString: string) => {
    const deliveryDate = new Date(dateString);
    const bagDate = new Date(deliveryDate);
    bagDate.setDate(deliveryDate.getDate() - 1);

    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    return {
      bagDeliveryDay: dayNames[bagDate.getDay()],
      bagDeliveryDate: `${bagDate.getDate()}. ${['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'][bagDate.getMonth()]}`
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
    // Validate date or weekday selection based on plan type
    if (plan === 'single') {
      if (!selectedDate) {
        alert('Vennligst velg dato');
        return;
      }
    } else {
      if (!selectedWeekday) {
        alert('Vennligst velg ukedag');
        return;
      }
    }

    if (!address.street || !address.postalCode) {
      alert('Vennligst fyll ut adresse');
      return;
    }
    if (pickupMethod === 'other' && !otherLocation.trim()) {
      alert('Vennligst beskriv hvor posen skal plasseres');
      return;
    }

    const fullOrderData = {
      plan,
      hasBag,
      pickupDate: plan === 'single' ? selectedDate : undefined,
      pickupWeekday: plan !== 'single' ? selectedWeekday : undefined,
      pickupTime: FIXED_PICKUP_TIME,
      address,
      pickupMethod,
      otherLocation: pickupMethod === 'other' ? otherLocation : ''
    };

    console.log('Complete order data:', fullOrderData);
    const encodedData = encodeURIComponent(JSON.stringify(fullOrderData));
    window.location.href = `/orders/instructions?data=${encodedData}`;
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

        {/* Date or Weekday Selection based on plan type */}
        {plan === 'single' ? (
          /* Date Selection for single plan */
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg første henting</h3>

            {/* Desktop: 7 column grid */}
            <div className="hidden sm:grid grid-cols-7 gap-4">
              {deliveryDays.map((day) => {
                const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                const isSelected = selectedDate === dateString;

                return (
                  <button
                    key={dateString}
                    onClick={() => setSelectedDate(dateString)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      isSelected
                        ? 'border-nordic-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm text-medium-gray mb-1">
                      {day.dayName}
                    </div>
                    <div className="font-bold text-dark-gray">{day.dayNum}</div>
                    <div className="text-xs text-medium-gray">{day.monthName}</div>
                  </button>
                );
              })}
            </div>

            {/* Mobile: Horizontal scroll */}
            <div className="sm:hidden">
              <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                {deliveryDays.map((day) => {
                  const dateString = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateString;

                  return (
                    <button
                      key={dateString}
                      onClick={() => setSelectedDate(dateString)}
                      className={`flex-shrink-0 p-3 rounded-lg border-2 text-center transition-colors min-w-[80px] ${
                        isSelected
                          ? 'border-nordic-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs text-medium-gray mb-1">
                        {day.dayName.substring(0, 3)}
                      </div>
                      <div className="font-bold text-dark-gray text-lg">{day.dayNum}</div>
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
          </div>
        ) : (
          /* Weekday Selection for recurring plans */
          <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
            <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg første henting</h3>
            <p className="text-medium-gray mb-6">
              Velg dag for din første henting. Dette blir din faste ukedag for alle fremtidige hentinger.
            </p>

            {/* Desktop: 7 column grid */}
            <div className="hidden sm:grid grid-cols-7 gap-4">
              {deliveryDays.map((day) => {
                const isSelected = selectedWeekday === day.weekdayValue;

                return (
                  <button
                    key={`${day.date.getTime()}`}
                    onClick={() => setSelectedWeekday(day.weekdayValue)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      isSelected
                        ? 'border-nordic-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm text-medium-gray mb-1">
                      {day.dayName}
                    </div>
                    <div className="font-bold text-dark-gray">{day.dayNum}</div>
                    <div className="text-xs text-medium-gray">{day.monthName}</div>
                  </button>
                );
              })}
            </div>

            {/* Mobile: Horizontal scroll */}
            <div className="sm:hidden">
              <div className="flex gap-3 overflow-x-auto pb-2" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                {deliveryDays.map((day) => {
                  const isSelected = selectedWeekday === day.weekdayValue;

                  return (
                    <button
                      key={`${day.date.getTime()}`}
                      onClick={() => setSelectedWeekday(day.weekdayValue)}
                      className={`flex-shrink-0 p-3 rounded-lg border-2 text-center transition-colors min-w-[80px] ${
                        isSelected
                          ? 'border-nordic-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs text-medium-gray mb-1">
                        {day.dayName.substring(0, 3)}
                      </div>
                      <div className="font-bold text-dark-gray text-lg">{day.dayNum}</div>
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
          </div>
        )}

        {/* Bag Delivery Notice */}
        {!hasBag && (plan === 'single' && selectedDate || plan !== 'single' && selectedWeekday) && (
          <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6 mb-8">
            <div className="flex items-start">
              <div className="text-4xl mr-4">📦</div>
              <div>
                <h3 className="text-xl font-bold text-dark-gray mb-3">NooraCare-pose leveres først</h3>
                {plan === 'single' && selectedDate ? (
                  <p className="text-medium-gray leading-relaxed">
                    Vi leverer en gratis NooraCare-pose <span className="font-semibold text-dark-gray">Onsdag 1. oktober</span> (dagen før din første levering). Du får SMS når posen er levert, så du kan fylle den med tøy til neste dag.
                  </p>
                ) : selectedWeekday ? (
                  <p className="text-medium-gray leading-relaxed">
                    Vi leverer en gratis NooraCare-pose <span className="font-semibold text-dark-gray">{getWeekdayDeliveryInfo(selectedWeekday).bagDeliveryDay} {getWeekdayDeliveryInfo(selectedWeekday).bagDeliveryDate}</span> (dagen før din første levering).
                    Du får SMS når posen er levert, så du kan fylle den med tøy til neste dag.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Time Information */}
        {(plan === 'single' && selectedDate) || (plan !== 'single' && selectedWeekday) ? (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
            <div className="flex items-start">
              <div className="text-2xl mr-3">📅</div>
              <div>
                <h4 className="text-base font-semibold text-dark-gray mb-1">Hentetidspunkt</h4>
                {plan === 'single' && selectedDate ? (
                  <p className="text-sm text-medium-gray">
                    Neste henting: <span className="font-semibold text-dark-gray">{getDeliveryDateInfo(selectedDate).deliveryDay} {getDeliveryDateInfo(selectedDate).deliveryDate}</span> mellom kl. <span className="font-semibold text-dark-gray">15:00-20:00</span>
                  </p>
                ) : selectedWeekday ? (
                  <p className="text-sm text-medium-gray">
                    Neste henting: <span className="font-semibold text-dark-gray">{getWeekdayDeliveryInfo(selectedWeekday).deliveryDay} {getWeekdayDeliveryInfo(selectedWeekday).deliveryDate}</span> mellom kl. <span className="font-semibold text-dark-gray">15:00-20:00</span>
                    <br />
                    <span className="text-xs">Deretter hver {weekdays.find(d => d.value === selectedWeekday)?.label.toLowerCase()} til samme tid.</span>
                  </p>
                ) : null}
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
            <div>
              <label className="block text-sm font-semibold text-dark-gray mb-2">
                By
              </label>
              <input
                type="text"
                name="city"
                value={address.city}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                placeholder="Bergen"
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
            href="/orders/new"
            className="text-medium-gray hover:text-dark-gray"
          >
            ← Tilbake
          </Link>

          <button
            onClick={handleContinue}
            disabled={
              (plan === 'single' ? !selectedDate : !selectedWeekday) ||
              !address.street ||
              !address.postalCode ||
              (pickupMethod === 'other' && !otherLocation.trim())
            }
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
              (plan === 'single' ? selectedDate : selectedWeekday) &&
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