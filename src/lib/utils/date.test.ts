import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  addDays,
  addMonths,
  toISODateString,
  getWeekdayFromDate,
  getNextOccurrenceOfWeekday,
  isWeekdayInSchedule,
  calculateNextBillingDate,
  isToday,
} from './date';

describe('addDays', () => {
  it('adds days within a month', () => {
    const result = addDays(new Date(2026, 5, 10), 7); // local June 10 2026
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5);
    expect(result.getDate()).toBe(17);
  });

  it('rolls over into the next month', () => {
    const result = addDays(new Date(2026, 5, 28), 7); // June 28 + 7 = July 5
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(5);
  });

  it('does not mutate the input date', () => {
    const input = new Date(2026, 5, 10);
    addDays(input, 5);
    expect(input.getDate()).toBe(10);
  });
});

describe('addMonths', () => {
  it('advances the month', () => {
    const result = addMonths(new Date(2026, 0, 15), 1);
    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('rolls over the year', () => {
    const result = addMonths(new Date(2026, 11, 15), 1);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0);
  });
});

describe('toISODateString', () => {
  it('formats as YYYY-MM-DD (UTC)', () => {
    expect(toISODateString(new Date(Date.UTC(2026, 5, 10, 12, 0, 0)))).toBe('2026-06-10');
  });
});

describe('getWeekdayFromDate', () => {
  it('returns a valid weekday', () => {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    expect(weekdays).toContain(getWeekdayFromDate(new Date(2026, 5, 10)));
  });

  it('is stable across whole weeks', () => {
    const d = new Date(2026, 5, 10);
    expect(getWeekdayFromDate(addDays(d, 7))).toBe(getWeekdayFromDate(d));
    expect(getWeekdayFromDate(addDays(d, 14))).toBe(getWeekdayFromDate(d));
  });
});

describe('getNextOccurrenceOfWeekday', () => {
  it('returns a date that falls on the requested weekday', () => {
    const start = new Date(2026, 5, 10);
    const next = getNextOccurrenceOfWeekday(start, 'friday');
    expect(getWeekdayFromDate(next)).toBe('friday');
    expect(next.getTime()).toBeGreaterThan(start.getTime());
  });

  it('skips to next week when already on the target weekday', () => {
    const start = new Date(2026, 5, 10);
    const startWeekday = getWeekdayFromDate(start);
    const next = getNextOccurrenceOfWeekday(start, startWeekday);
    expect(getWeekdayFromDate(next)).toBe(startWeekday);
    // exactly 7 days later
    expect(Math.round((next.getTime() - new Date(2026, 5, 10).setHours(0, 0, 0, 0)) / 86_400_000)).toBe(7);
  });
});

describe('isWeekdayInSchedule', () => {
  const schedule = { mon: true, tue: false, wed: true, thu: false, fri: true, sat: false, sun: false };

  it('maps weekday names to schedule flags', () => {
    expect(isWeekdayInSchedule(schedule, 'monday')).toBe(true);
    expect(isWeekdayInSchedule(schedule, 'tuesday')).toBe(false);
    expect(isWeekdayInSchedule(schedule, 'sunday')).toBe(false);
  });
});

describe('calculateNextBillingDate', () => {
  it('returns null for one-time billing', () => {
    expect(calculateNextBillingDate(new Date(2026, 5, 10), 'one_time')).toBeNull();
  });

  it('returns an ISO timestamp ~1 month out for monthly billing', () => {
    const result = calculateNextBillingDate(new Date(2026, 0, 15), 'monthly');
    expect(result).not.toBeNull();
    expect(new Date(result as string).getMonth()).toBe(1);
  });
});

describe('isToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 7, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is true for the current day regardless of time', () => {
    expect(isToday(new Date(2026, 5, 7, 23, 0, 0))).toBe(true);
  });

  it('is false for other days', () => {
    expect(isToday(new Date(2026, 5, 8))).toBe(false);
    expect(isToday(new Date(2026, 5, 6))).toBe(false);
  });
});
