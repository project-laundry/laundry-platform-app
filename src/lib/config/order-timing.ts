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

// ─── Customer self-service deadlines ────────────────────────────────────────
// How long the customer can cancel an order or move its pickup date without
// contacting us. Both rules are whole days in the Norwegian calendar, so the
// time of day never matters. The server actions and the order page use the
// same functions; admins are not bound by them.

/** YYYY-MM-DD shifted by whole days. Noon UTC keeps the calendar day stable. */
function shiftISODate(isoDate: string, days: number): string {
  return toISODateString(addDays(new Date(`${isoDate}T12:00:00Z`), days));
}

/** 'tirsdag 24. november' from YYYY-MM-DD. */
function formatDayAndMonth(isoDate: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Oslo',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

/**
 * The last day (YYYY-MM-DD, Norwegian calendar) the customer can cancel the
 * order without contacting us: two days before the pickup day. Cancellation
 * closes at midnight at the start of the day before the pickup day — the
 * «inntil 24 timer før hentedagen» of the sales terms. Pickup on a Wednesday
 * → the customer can cancel through Monday.
 */
export function lastSelfCancelDate(scheduledDate: string): string {
  return shiftISODate(scheduledDate, -2);
}

/** The ONE rule for "can the customer still cancel this order themselves". */
export function canCancelOrderSelf(scheduledDate: string, now: Date = new Date()): boolean {
  // ISO dates compare correctly as strings.
  return todayInOslo(now) <= lastSelfCancelDate(scheduledDate);
}

/**
 * The ONE rule for "can the customer still move the pickup date themselves":
 * until midnight (Norwegian time) at the start of the pickup day.
 */
export function canReschedulePickupSelf(scheduledDate: string, now: Date = new Date()): boolean {
  return todayInOslo(now) < scheduledDate;
}

/** Shown under the cancel link while cancellation is open. */
export function selfCancelOpenText(scheduledDate: string): string {
  return `Du kan avbestille selv til og med ${formatDayAndMonth(lastSelfCancelDate(scheduledDate))}.`;
}

/** Shown (followed by how to contact us) once cancellation has closed. */
export function selfCancelClosedText(scheduledDate: string): string {
  const dayBeforePickup = formatDayAndMonth(shiftISODate(scheduledDate, -1));
  return `Du kan ikke lenger avbestille selv. Fristen var midnatt natt til ${dayBeforePickup}, dagen før hentedagen.`;
}

/** Shown (followed by how to contact us) from the pickup day on. */
export const RESCHEDULE_CLOSED_TEXT =
  'Du kan ikke lenger endre hentedatoen selv. Det er mulig til og med dagen før hentedagen.';
