// Date utilities for order scheduling

import type { Weekday } from '@/types/database';

// Map Weekday type to JavaScript day number (0 = Sunday, 1 = Monday, etc.)
const WEEKDAY_TO_DAY_NUMBER: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

// Map JavaScript day number to Weekday type
const DAY_NUMBER_TO_WEEKDAY: Weekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

/**
 * Get the weekday from a Date object
 * @param date - The date to get the weekday from
 * @returns The weekday as a Weekday type
 */
export function getWeekdayFromDate(date: Date | string): Weekday {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return DAY_NUMBER_TO_WEEKDAY[dateObj.getDay()];
}

/**
 * Get the next N occurrences of a specific weekday after a given date
 * @param startDate - The date to start from (exclusive)
 * @param weekday - The target weekday
 * @param count - Number of occurrences to find
 * @returns Array of dates
 */
export function getNextWeekdayOccurrences(
  startDate: Date,
  weekday: Weekday,
  count: number
): Date[] {
  const targetDay = WEEKDAY_TO_DAY_NUMBER[weekday];
  const dates: Date[] = [];

  // Start from the day after startDate
  const current = new Date(startDate);
  current.setDate(current.getDate() + 1);

  while (dates.length < count) {
    if (current.getDay() === targetDay) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Add days to a date
 * @param date - The starting date
 * @param days - Number of days to add
 * @returns New date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 * @param date - The starting date
 * @param months - Number of months to add
 * @returns New date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Format date as ISO string (YYYY-MM-DD)
 * @param date - The date to format
 * @returns ISO date string
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a weekday is available in a weekly schedule
 * @param schedule - The weekly schedule object
 * @param weekday - The weekday to check
 * @returns true if the weekday is available
 */
export function isWeekdayInSchedule(
  schedule: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean },
  weekday: Weekday
): boolean {
  const scheduleMap: Record<Weekday, boolean> = {
    monday: schedule.mon,
    tuesday: schedule.tue,
    wednesday: schedule.wed,
    thursday: schedule.thu,
    friday: schedule.fri,
    saturday: schedule.sat,
    sunday: schedule.sun,
  };

  return scheduleMap[weekday];
}
