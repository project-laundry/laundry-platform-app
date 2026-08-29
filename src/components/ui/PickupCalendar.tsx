'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { Weekday } from '@/types/database';
import { getWeekdayFromDate } from '@/lib/utils/date';
import { MIN_DAYS_NOTICE } from '@/lib/config/order-timing';

interface PickupCalendarProps {
  availableWeekdays: Weekday[];
  selectedDate: string;
  onDateSelect: (date: string) => void;
  minimumDaysNotice?: number;
  isLoading?: boolean;
}

interface CalendarDay {
  day: number;
  date: string;
  isAvailable: boolean;
  isToday: boolean;
  isPast: boolean;
}

const monthNames = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

const weekdayLabels = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

export function PickupCalendar({
  availableWeekdays,
  selectedDate,
  onDateSelect,
  minimumDaysNotice = MIN_DAYS_NOTICE,
  isLoading = false,
}: PickupCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    // If a date is selected, start on that month
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  const getDaysInMonth = (date: Date): (CalendarDay | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert Sunday (0) to 6, and shift all days back by 1 to start week on Monday
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: (CalendarDay | null)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minimumDaysNotice);

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const weekday = getWeekdayFromDate(dateString);
      const isAvailable = availableWeekdays.includes(weekday) && dayDate >= minDate;

      days.push({
        day,
        date: dateString,
        isAvailable,
        isToday: dayDate.toDateString() === today.toDateString(),
        isPast: dayDate < minDate,
      });
    }

    return days;
  };

  const days = getDaysInMonth(currentMonth);

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-cream-dark bg-white p-3">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-sea-green" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cream-dark bg-white p-3">
      {/* Month Header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={previousMonth}
          className="flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-90"
          aria-label="Forrige måned"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h4 className="text-sm font-medium text-dark-gray">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h4>
        <button
          type="button"
          onClick={nextMonth}
          className="flex size-9 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-90"
          aria-label="Neste måned"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Weekday Labels */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1.5 text-center text-xs text-medium-gray">
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
              type="button"
              onClick={() => day.isAvailable && onDateSelect(day.date)}
              disabled={!day.isAvailable}
              className={`aspect-square rounded-full text-xs font-medium tabular-nums transition-all ${
                isSelected
                  ? 'bg-sea-green text-white'
                  : day.isAvailable
                  ? 'text-dark-gray hover:bg-sea-green/10 hover:text-sea-green'
                  : 'cursor-not-allowed text-cream-dark'
              }`}
            >
              {day.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
