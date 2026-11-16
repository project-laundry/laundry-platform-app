import { describe, it, expect } from 'vitest';
import {
  monthKeyInOslo,
  monthLabel,
  nextMonthKey,
  previousMonthKey,
  sumCleanerPayoutOre,
  sumCleanerPayoutOreForMonth,
} from './payout';

describe('monthKeyInOslo', () => {
  it('uses Norwegian time, not UTC, at the month boundary', () => {
    // 23:30 UTC on 31 Oct is 00:30 on 1 Nov in Oslo (CET, UTC+1)
    expect(monthKeyInOslo(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11');
    expect(monthKeyInOslo(new Date('2026-10-31T22:30:00Z'))).toBe('2026-10');
  });
});

describe('previousMonthKey / nextMonthKey', () => {
  it('steps within a year', () => {
    expect(previousMonthKey('2026-10')).toBe('2026-09');
    expect(nextMonthKey('2026-10')).toBe('2026-11');
  });

  it('rolls over the year boundary', () => {
    expect(previousMonthKey('2026-01')).toBe('2025-12');
    expect(nextMonthKey('2026-12')).toBe('2027-01');
  });
});

describe('monthLabel', () => {
  it('formats the Norwegian month name', () => {
    expect(monthLabel('2026-10')).toBe('oktober');
    expect(monthLabel('2026-01')).toBe('januar');
  });
});

describe('sumCleanerPayoutOreForMonth', () => {
  const orders = [
    { status: 'completed', completed_at: '2026-10-03T10:00:00Z', cleaner_payout_ore: 35000 },
    { status: 'completed', completed_at: '2026-10-20T15:00:00Z', cleaner_payout_ore: 56651 },
    // Completed in November (Oslo time) — not October
    { status: 'completed', completed_at: '2026-10-31T23:30:00Z', cleaner_payout_ore: 35000 },
    // Cancelled orders are never owed
    { status: 'cancelled', completed_at: null, cleaner_payout_ore: null },
    // In-flight order: priced but not completed yet
    { status: 'ready_for_delivery', completed_at: null, cleaner_payout_ore: 35000 },
    // Completed before the column existed
    { status: 'completed', completed_at: '2026-10-10T10:00:00Z', cleaner_payout_ore: null },
  ] as const;

  it('sums only completed orders in the given Oslo month', () => {
    expect(sumCleanerPayoutOreForMonth([...orders], '2026-10')).toBe(91651);
    expect(sumCleanerPayoutOreForMonth([...orders], '2026-11')).toBe(35000);
  });

  it('returns 0 when nothing was completed that month', () => {
    expect(sumCleanerPayoutOreForMonth([...orders], '2026-09')).toBe(0);
    expect(sumCleanerPayoutOreForMonth([], '2026-10')).toBe(0);
  });
});

describe('sumCleanerPayoutOre', () => {
  it('sums completed orders across months and skips cancelled or unpriced ones', () => {
    expect(
      sumCleanerPayoutOre([
        { status: 'completed', cleaner_payout_ore: 35000 },
        { status: 'completed', cleaner_payout_ore: 42000 },
        { status: 'cancelled', cleaner_payout_ore: 10000 },
        { status: 'completed', cleaner_payout_ore: null },
        { status: 'in_cleaning', cleaner_payout_ore: 50000 },
      ])
    ).toBe(77000);
  });

  it('is 0 for no orders', () => {
    expect(sumCleanerPayoutOre([])).toBe(0);
  });
});
