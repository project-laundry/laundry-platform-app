import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildDateChips, toLocalISODate } from './date-chips';
import { getWeekdayFromDate } from '@/lib/utils/date';
import { MIN_DAYS_NOTICE } from '@/lib/config/order-timing';
import type { Weekday } from '@/types/database';

const ALL_WEEKDAYS: Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

describe('toLocalISODate', () => {
  it('formats a local midnight as its own calendar day', () => {
    // The regression this guards: toISOString() renders local midnight in UTC,
    // which in UTC+ timezones (like Norway) lands on the PREVIOUS day — a chip
    // labeled "Tir. 1. Sep" then stored 2026-08-31.
    expect(toLocalISODate(new Date(2026, 8, 1))).toBe('2026-09-01');
    expect(toLocalISODate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('buildDateChips', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Thursday 2026-08-27, mid-morning local time
    vi.setSystemTime(new Date(2026, 7, 27, 9, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts at today + MIN_DAYS_NOTICE and returns 10 chips when every weekday is available', () => {
    const chips = buildDateChips(ALL_WEEKDAYS);

    expect(chips).toHaveLength(10);
    expect(chips[0].iso).toBe('2026-08-29'); // Aug 27 + 2 days notice
    expect(chips[9].iso).toBe('2026-09-07'); // 10 consecutive days
  });

  it('stores an iso date matching the day the chip displays', () => {
    const chips = buildDateChips(ALL_WEEKDAYS);

    for (const chip of chips) {
      const [, , day] = chip.iso.split('-').map(Number);
      expect(chip.day).toContain(String(day));
    }
  });

  it('only offers dates on available weekdays', () => {
    const chips = buildDateChips(['monday', 'thursday']);

    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(['monday', 'thursday']).toContain(getWeekdayFromDate(chip.iso));
    }
    expect(chips[0].iso).toBe('2026-08-31'); // first Monday ≥ 2 days out
  });

  it('returns no chips when no weekdays are available', () => {
    expect(buildDateChips([])).toHaveLength(0);
  });

  it('never offers a date closer than the minimum notice', () => {
    const chips = buildDateChips(ALL_WEEKDAYS);
    const earliest = new Date(2026, 7, 27 + MIN_DAYS_NOTICE);

    expect(new Date(chips[0].iso).getTime()).toBeGreaterThanOrEqual(earliest.getTime());
  });
});
