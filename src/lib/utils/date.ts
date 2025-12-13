// Date utilities for order scheduling

import type { Weekday } from '@/types/database';

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

/**
 * Get the next occurrence of a specific weekday after (or on) a start date
 * @param startDate - The starting date
 * @param targetWeekday - The target weekday to find
 * @returns The next occurrence of the target weekday
 */
export function getNextOccurrenceOfWeekday(
  startDate: Date,
  targetWeekday: Weekday
): Date {
  const weekdayMap: Record<Weekday, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDay = weekdayMap[targetWeekday];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0); // Normalize to midnight

  // Calculate days to add to reach target weekday
  let daysToAdd = (targetDay - current.getDay() + 7) % 7;

  // If we're already on the target day, start from next week
  if (daysToAdd === 0) {
    daysToAdd = 7;
  }

  current.setDate(current.getDate() + daysToAdd);
  return current;
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
 * Calculate next billing date based on billing period
 * @param currentDate - The current/reference date
 * @param billingPeriod - The billing period type
 * @returns ISO date string for next billing date, or null for one-time billing
 */
export function calculateNextBillingDate(
  currentDate: Date,
  billingPeriod: 'monthly' | 'one_time'
): string | null {
  if (billingPeriod === 'one_time') {
    return null;
  }

  // Monthly: Add 1 month
  const nextDate = addMonths(currentDate, 1);
  return nextDate.toISOString();
}
