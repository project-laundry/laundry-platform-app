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
