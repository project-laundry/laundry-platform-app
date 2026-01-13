'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar as CalendarIcon, RefreshCw, Info, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';
import { getAvailableWeekdaysAction } from '../actions';
import type { Weekday } from '@/types/database';
import { getWeekdayFromDate } from '@/lib/utils/date';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

export default function SchedulePage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

  // Redirect if location not selected
  useEffect(() => {
    if (!orderData?.location) {
      console.log('No location selected, redirecting to location-service page');
      router.push('/orders/location-service');
    }
  }, [orderData, router]);

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

  // Calendar logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert Sunday (0) to 6, and shift all days back by 1 to start week on Monday
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 2); // Minimum 2 days notice

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = getWeekdayFromDate(dateString);
      const isAvailable = availableWeekdays.includes(weekday) && date >= minDate;

      days.push({
        day,
        date: dateString,
        isAvailable,
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < minDate,
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  const weekdayLabels = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
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

          {/* Calendar */}
          <div className="border border-slate-200 rounded-lg p-3">
            {/* Month Header */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={previousMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Forrige måned"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h4 className="text-sm font-medium text-slate-900">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </h4>
              <button
                onClick={nextMonth}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Neste måned"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {weekdayLabels.map((label) => (
                <div key={label} className="text-center text-xs text-slate-500 py-1.5">
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const isSelected = selectedDate === day.date;

                return (
                  <button
                    key={day.date}
                    onClick={() => day.isAvailable && setSelectedDate(day.date)}
                    disabled={!day.isAvailable}
                    className={`aspect-square rounded-md text-xs font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-teal-600 text-white'
                        : day.isAvailable
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {day.day}
                  </button>
                );
              })}
            </div>
          </div>          
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
