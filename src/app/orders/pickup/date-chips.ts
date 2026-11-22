// Pickup-date chip building for the order flow's "Hvor og når?" step.
// Pure so it can be unit tested (the off-by-one it guards against is subtle).

import { getWeekdayFromDate, addDays } from '@/lib/utils/date';
import { earliestPickupDate } from '@/lib/config/order-timing';
import type { Weekday } from '@/types/database';

export interface DateChip {
  iso: string;
  weekday: string;
  day: string;
}

/** Format a local Date as YYYY-MM-DD. NOT toISODateString: that goes via UTC,
 *  which shifts a local midnight back one calendar day in UTC+ timezones. */
export function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Selectable pickup dates: the next 10 days (within a 30-day horizon, from
 *  earliestPickupDate() on — today until the same-day cutoff with 0 days
 *  notice) that fall on a weekday some cleaner in the city actually works. */
export function buildDateChips(availableWeekdays: Weekday[]): DateChip[] {
  const out: DateChip[] = [];
  const available = new Set(availableWeekdays);
  // Local midnight of the earliest bookable (Norwegian) calendar day.
  const [year, month, day] = earliestPickupDate().split('-').map(Number);
  let d = new Date(year, month - 1, day);

  for (let i = 0; i < 30 && out.length < 10; i++, d = addDays(d, 1)) {
    if (!available.has(getWeekdayFromDate(d))) continue;
    out.push({
      iso: toLocalISODate(d),
      weekday: d.toLocaleDateString('nb-NO', { weekday: 'short' }),
      day: d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }),
    });
  }
  return out;
}
