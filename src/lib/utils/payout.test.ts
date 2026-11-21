import { describe, it, expect } from 'vitest';
import {
  historyMonthKey,
  payoutDueDate,
  payoutPhase,
  summarizeCleanerMonth,
  sumCleanerPayoutOreLast12Months,
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

describe('summarizeCleanerMonth', () => {
  const orders = [
    { status: 'completed', completed_at: '2026-10-03T10:00:00Z', cleaner_payout_ore: 35000, wash_loads: 1 },
    { status: 'completed', completed_at: '2026-10-20T15:00:00Z', cleaner_payout_ore: 56651, wash_loads: 3 },
    // November in Oslo time
    { status: 'completed', completed_at: '2026-10-31T23:30:00Z', cleaner_payout_ore: 35000, wash_loads: 2 },
    { status: 'cancelled', completed_at: null, cleaner_payout_ore: null, wash_loads: 0 },
    { status: 'ready_for_delivery', completed_at: null, cleaner_payout_ore: 35000, wash_loads: 1 },
  ] as const;

  it('counts orders, washes and payout for completed orders in the month', () => {
    expect(summarizeCleanerMonth([...orders], '2026-10')).toEqual({
      orderCount: 2,
      washLoads: 4,
      payoutOre: 91651,
    });
  });

  it('is all zeroes for a month without completed orders', () => {
    expect(summarizeCleanerMonth([...orders], '2026-09')).toEqual({
      orderCount: 0,
      washLoads: 0,
      payoutOre: 0,
    });
  });
});

describe('historyMonthKey', () => {
  it('uses the completion month, else the cancellation month, in Oslo time', () => {
    expect(historyMonthKey({ completed_at: '2026-10-31T23:30:00Z', cancelled_at: null })).toBe('2026-11');
    expect(historyMonthKey({ completed_at: null, cancelled_at: '2026-09-12T08:00:00Z' })).toBe('2026-09');
    expect(historyMonthKey({ completed_at: null, cancelled_at: null })).toBeNull();
  });
});

describe('payoutDueDate / payoutPhase', () => {
  it('is due on the 15th of the following month', () => {
    expect(payoutDueDate('2026-10')).toBe('2026-11-15');
    expect(payoutDueDate('2026-12')).toBe('2027-01-15');
  });

  it('moves from open to closed to due by date', () => {
    expect(payoutPhase('2026-11', '2026-11-21')).toBe('open');
    expect(payoutPhase('2026-10', '2026-11-14')).toBe('closed');
    expect(payoutPhase('2026-10', '2026-11-15')).toBe('due');
    expect(payoutPhase('2026-08', '2026-11-21')).toBe('due');
  });
});

describe('sumCleanerPayoutOreLast12Months', () => {
  const now = new Date('2026-11-21T12:00:00Z');

  it('sums completed orders from the last 12 months only', () => {
    expect(
      sumCleanerPayoutOreLast12Months(
        [
          { status: 'completed', completed_at: '2026-11-20T10:00:00Z', cleaner_payout_ore: 35000 },
          { status: 'completed', completed_at: '2025-11-22T10:00:00Z', cleaner_payout_ore: 40000 },
          // Just over a year old
          { status: 'completed', completed_at: '2025-11-20T10:00:00Z', cleaner_payout_ore: 99000 },
          { status: 'cancelled', completed_at: null, cleaner_payout_ore: null },
          { status: 'completed', completed_at: '2026-06-01T10:00:00Z', cleaner_payout_ore: null },
        ],
        now
      )
    ).toBe(75000);
  });
});
