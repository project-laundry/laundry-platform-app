'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface TimeSlot {
  time: string;
  available: boolean;
}

interface LaundryItem {
  type: string;
  quantity: number;
}

const timeSlots: TimeSlot[] = [
  { time: '08:00-10:00', available: true },
  { time: '10:00-12:00', available: true },
  { time: '12:00-14:00', available: false },
  { time: '14:00-16:00', available: true },
  { time: '16:00-18:00', available: true },
  { time: '18:00-20:00', available: false }
];

const getNext7Days = () => {
  const days = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

    days.push({
      date: date,
      dayName: dayNames[date.getDay()],
      dayNum: date.getDate(),
      monthName: monthNames[date.getMonth()],
      isToday: i === 0,
      isTomorrow: i === 1
    });
  }

  return days;
};

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [address, setAddress] = useState({
    street: '',
    city: 'Bergen',
    postalCode: '',
    specialInstructions: ''
  });

  const [pickupMethod, setPickupMethod] = useState<'home' | 'entrance' | 'other'>('home');
  const [otherLocation, setOtherLocation] = useState('');

  useEffect(() => {
    // Set default to tomorrow if no date is selected
    if (!selectedDate) {
      const days = getNext7Days();
      if (days.length > 1) {
        const tomorrow = days[1];
        setSelectedDate(`${tomorrow.date.getFullYear()}-${String(tomorrow.date.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.date.getDate()).padStart(2, '0')}`);
      }
    }
  }, [selectedDate]);

  const days = getNext7Days();

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      alert('Vennligst velg dato og tidspunkt');
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

    const fullOrderData = {
      pickupDate: selectedDate,
      pickupTime: selectedTime,
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
          <p className="text-xl text-medium-gray">
            Velg dag og 2-timers vindu som passer deg best.
          </p>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg dag</h3>

          {/* Desktop: 7 column grid */}
          <div className="hidden sm:grid grid-cols-7 gap-4">
            {days.map((day) => {
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
                    {day.isToday ? 'I dag' : day.isTomorrow ? 'I morgen' : day.dayName}
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
              {days.map((day) => {
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
                      {day.isToday ? 'I dag' : day.isTomorrow ? 'I morgen' : day.dayName.substring(0, 3)}
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

        {/* Time Selection */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-6">Velg tidspunkt</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => slot.available && setSelectedTime(slot.time)}
                disabled={!slot.available}
                className={`p-4 rounded-lg border-2 text-center font-semibold transition-colors ${
                  selectedTime === slot.time
                    ? 'border-nordic-blue bg-blue-50 text-nordic-blue'
                    : slot.available
                    ? 'border-gray-200 hover:border-gray-300 text-dark-gray'
                    : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {slot.time}
                {!slot.available && (
                  <div className="text-xs mt-1">Opptatt</div>
                )}
              </button>
            ))}
          </div>
        </div>

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

        {/* Summary and Continue */}
        <div className="bg-white rounded-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-gray">Sammendrag</h3>
              <p className="text-medium-gray">
                NooraCare-pose • {selectedDate && selectedTime ?
                  `${days.find(d => `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, '0')}-${String(d.date.getDate()).padStart(2, '0')}` === selectedDate)?.dayName || ''} ${selectedTime}`
                  : 'Ingen tid valgt'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-medium-gray">Inkludert i ditt abonnement</p>
              <p className="text-2xl font-bold text-success-green">✓ Gratis</p>
            </div>
          </div>

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
                !selectedDate ||
                !selectedTime ||
                !address.street ||
                !address.postalCode ||
                (pickupMethod === 'other' && !otherLocation.trim())
              }
              className={`px-8 py-3 rounded-lg font-semibold text-lg transition-colors ${
                selectedDate && selectedTime && address.street && address.postalCode &&
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
    </div>
  );
}