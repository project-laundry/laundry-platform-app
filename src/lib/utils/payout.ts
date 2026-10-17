// Monthly cleaner payout helpers (payout contract: all orders completed in a
// Norwegian calendar month are paid together by the 10th of the next month —
// see CLEANER_PAYOUT_TERMS in lib/config/pricing).

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
