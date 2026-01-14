'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getWeekdayFromDate } from '@/lib/utils/date';
import type { Weekday } from '@/types/database';

interface DayInfo {
  day: number;
  date: string;
  isAvailable: boolean;
  isToday: boolean;
  isPast: boolean;
}

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  availableWeekdays: Weekday[];
  minDaysNotice?: number;
  disabled?: boolean;
}

const monthNames = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];
const weekdayLabels = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];

export function Calendar({
  selectedDate,
  onDateSelect,
  availableWeekdays,
  minDaysNotice = 2,
  disabled = false,
}: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      return new Date(selectedDate);
    }
    return new Date();
  });

  const getDaysInMonth = (date: Date): (DayInfo | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Convert Sunday (0) to 6, and shift all days back by 1 to start week on Monday
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: (DayInfo | null)[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minDaysNotice);

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

  return (
    <div className={`border border-slate-200 rounded-lg p-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Month Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={previousMonth}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Forrige måned"
          type="button"
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
          type="button"
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
              onClick={() => day.isAvailable && onDateSelect(day.date)}
              disabled={!day.isAvailable}
              type="button"
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
  );
}
