// Monthly cleaner payout helpers (payout contract: all orders completed in a
// Norwegian calendar month are paid together by the 15th of the next month —
// see CLEANER_PAYOUT_TERMS in lib/config/pricing).

import { CLEANER_PAYOUT_TERMS } from '@/lib/config/pricing';
import { todayInOslo } from '@/lib/utils/date';
import type { Order } from '@/types/database';

/** 'YYYY-MM' of a timestamp in Norwegian time — the payout month an order's
 *  completed_at falls in. UTC would put a 00:30 completion in the wrong month. */
export function monthKeyInOslo(date: Date = new Date()): string {
  return todayInOslo(date).slice(0, 7);
}

/** The 'YYYY-MM' before the given one ('2026-01' → '2025-12'). */
export function previousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

/** The 'YYYY-MM' after the given one ('2026-12' → '2027-01'). */
export function nextMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

/** Norwegian month name for a 'YYYY-MM' key ('2026-10' → 'oktober'). */
export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('no-NO', {
    month: 'long',
    timeZone: 'UTC',
  });
}

/** Sum of the stamped cleaner payout for the orders completed in a month.
 *  Only `completed` orders count — a payout is owed for delivered laundry only. */
export function sumCleanerPayoutOreForMonth(
  orders: Pick<Order, 'status' | 'completed_at' | 'cleaner_payout_ore'>[],
  monthKey: string
): number {
  return orders.reduce((sum, order) => {
    if (order.status !== 'completed' || !order.completed_at || order.cleaner_payout_ore === null) {
      return sum;
    }
    if (monthKeyInOslo(new Date(order.completed_at)) !== monthKey) return sum;
    return sum + order.cleaner_payout_ore;
  }, 0);
}

/** Sum of the stamped cleaner payout over every completed order, all months
 *  ("Totalt opptjent" on the admin cleaner page). Same rule as the monthly sum. */
export function sumCleanerPayoutOre(
  orders: Pick<Order, 'status' | 'cleaner_payout_ore'>[]
): number {
  return orders.reduce((sum, order) => {
    if (order.status !== 'completed' || order.cleaner_payout_ore === null) return sum;
    return sum + order.cleaner_payout_ore;
  }, 0);
}

/** The cleaner dashboard's month in numbers: completed orders, the washes
 *  registered on them and the stamped payout. Same rule as the monthly sum —
 *  only `completed` orders, by `completed_at` in Norwegian time. */
export interface CleanerMonthSummary {
  orderCount: number;
  washLoads: number;
  payoutOre: number;
}

export function summarizeCleanerMonth(
  orders: Pick<Order, 'status' | 'completed_at' | 'cleaner_payout_ore' | 'wash_loads'>[],
  monthKey: string
): CleanerMonthSummary {
  const summary: CleanerMonthSummary = { orderCount: 0, washLoads: 0, payoutOre: 0 };
  for (const order of orders) {
    if (order.status !== 'completed' || !order.completed_at) continue;
    if (monthKeyInOslo(new Date(order.completed_at)) !== monthKey) continue;
    summary.orderCount += 1;
    summary.washLoads += order.wash_loads;
    summary.payoutOre += order.cleaner_payout_ore ?? 0;
  }
  return summary;
}

/** The 'YYYY-MM' a finished order is listed under in the cleaner's history:
 *  the month it was completed, or cancelled. Null while the order is active. */
export function historyMonthKey(
  order: Pick<Order, 'completed_at' | 'cancelled_at'>
): string | null {
  const finishedAt = order.completed_at ?? order.cancelled_at;
  return finishedAt ? monthKeyInOslo(new Date(finishedAt)) : null;
}

/** ISO date ('YYYY-MM-DD') by which a month's payout is on the cleaner's
 *  account: CLEANER_PAYOUT_TERMS.paid_by_day_of_month in the month after. */
export function payoutDueDate(monthKey: string): string {
  const day = String(CLEANER_PAYOUT_TERMS.paid_by_day_of_month).padStart(2, '0');
  return `${nextMonthKey(monthKey)}-${day}`;
}

/** Where a payout month stands, from dates alone — payouts are manual bank
 *  transfers and nothing records that one was made, so there is no "paid" phase:
 *  `open` = the month is still running, `closed` = ended, payout deadline ahead,
 *  `due` = the deadline has been reached. `today` is an Oslo ISO date. */
export type PayoutPhase = 'open' | 'closed' | 'due';

export function payoutPhase(monthKey: string, today: string = todayInOslo()): PayoutPhase {
  if (monthKey >= today.slice(0, 7)) return 'open';
  return today < payoutDueDate(monthKey) ? 'closed' : 'due';
}

/** Stamped payout for the orders completed in the 12 months up to `now` —
 *  the figure the cleaner dashboard holds against the VAT registration limit. */
export function sumCleanerPayoutOreLast12Months(
  orders: Pick<Order, 'status' | 'completed_at' | 'cleaner_payout_ore'>[],
  now: Date = new Date()
): number {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  return orders.reduce((sum, order) => {
    if (order.status !== 'completed' || !order.completed_at || order.cleaner_payout_ore === null) {
      return sum;
    }
    const completedAt = new Date(order.completed_at);
    if (completedAt <= cutoff || completedAt > now) return sum;
    return sum + order.cleaner_payout_ore;
  }, 0);
}
