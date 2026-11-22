// Order timing for NooraCare — how late a pickup can be booked and how long
// the laundry is away. Change the numbers here; the order flow, the reschedule
// page, the server-side checks and the sales terms all read from this file.

import { PICKUP_TIME_RANGE } from '@/lib/config/pickup-times';
import { addDays, toISODateString, todayInOslo } from '@/lib/utils/date';

export const ORDER_TIMING = {
  days_between_pickup_and_delivery: 2,
  /**
   * How many days before the pickup day an order must be placed.
   * 0 = pickup the same day (until `same_day_cutoff`), 1 = the day before at
   * the latest, 2 = two days before, and so on.
   */
  minimum_days_notice: 0,
  /**
   * Only used with 0 days notice: the last time of day (Norwegian time,
   * 'HH:MM') a pickup for today can be booked. Default: when the pickup
   * window opens. After it, the earliest pickup is tomorrow.
   */
  same_day_cutoff: PICKUP_TIME_RANGE.start,
} as const;

export const DAYS_PICKUP_TO_DELIVERY = ORDER_TIMING.days_between_pickup_and_delivery;
export const MIN_DAYS_NOTICE: number = ORDER_TIMING.minimum_days_notice;
export const SAME_DAY_CUTOFF: string = ORDER_TIMING.same_day_cutoff;

/** The time of day in Norway as 'HH:MM' (the server runs in UTC). */
function osloTime(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Oslo',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
}

/**
 * The first pickup date (YYYY-MM-DD, Norwegian calendar) that can be booked
 * right now. The ONE rule for "how soon": the date chips in the order flow,
 * the reschedule calendar and both server-side checks use it. The last two
 * parameters exist for tests; callers use the configured values.
 */
export function earliestPickupDate(
  now: Date = new Date(),
  minDaysNotice: number = MIN_DAYS_NOTICE,
  sameDayCutoff: string = SAME_DAY_CUTOFF
): string {
  const pastCutoff = minDaysNotice === 0 && osloTime(now) >= sameDayCutoff;
  const days = minDaysNotice + (pastCutoff ? 1 : 0);
  // Noon UTC keeps the calendar day stable across time zones and DST.
  return toISODateString(addDays(new Date(`${todayInOslo(now)}T12:00:00Z`), days));
}

/** The booking rule as a Norwegian sentence, for the sales terms. */
export function pickupNoticeText(
  minDaysNotice: number = MIN_DAYS_NOTICE,
  sameDayCutoff: string = SAME_DAY_CUTOFF
): string {
  if (minDaysNotice === 0) return `Henting samme dag kan velges frem til kl. ${sameDayCutoff}.`;
  if (minDaysNotice === 1) return 'Hentedatoen må være minst én dag frem i tid.';
  return `Hentedatoen må være minst ${minDaysNotice} dager frem i tid.`;
}
