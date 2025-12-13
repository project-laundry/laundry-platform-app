// Order generation service for subscription-based orders

import type {
  SubscriptionBillingPeriod,
  SubscriptionFrequency,
  Weekday,
} from '@/types/database';
import { getNextOccurrenceOfWeekday, addMonths } from '@/lib/utils/date';

/**
 * Calculate the number of orders to generate based on billing period and frequency
 * @param billingPeriod - The subscription billing period
 * @param frequency - The subscription frequency
 * @returns Number of orders to generate
 */
export function calculateOrderCount(
  billingPeriod: SubscriptionBillingPeriod,
  frequency: SubscriptionFrequency
): number {
  if (billingPeriod === 'one_time') {
    return 1;
  }

  // Monthly billing
  switch (frequency) {
    case 'weekly':
      return 4; // Will generate 4-5 based on actual calendar
    case 'biweekly':
      return 2;
    case 'monthly':
      return 1;
    case 'on_demand':
      return 0; // Customer creates orders manually
    default:
      throw new Error(`Unknown frequency: ${frequency}`);
  }
}

/**
 * Generate pickup dates based on subscription frequency and billing period
 * @param billingPeriod - The subscription billing period
 * @param frequency - The subscription frequency
 * @param recurringWeekday - The weekday for pickups
 * @param referenceDate - The reference date (billing start date)
 * @returns Array of pickup dates
 */
export function generatePickupDates(
  billingPeriod: SubscriptionBillingPeriod,
  frequency: SubscriptionFrequency,
  recurringWeekday: Weekday,
  referenceDate: Date
): Date[] {
  const pickupDates: Date[] = [];

  if (billingPeriod === 'one_time') {
    // One order: next occurrence of recurring_weekday
    pickupDates.push(getNextOccurrenceOfWeekday(referenceDate, recurringWeekday));
    return pickupDates;
  }

  // Monthly billing
  if (frequency === 'on_demand') {
    return []; // No auto-generated orders
  }

  if (frequency === 'weekly') {
    // Generate all occurrences of recurring_weekday in next month
    let currentDate = getNextOccurrenceOfWeekday(referenceDate, recurringWeekday);
    const billingEndDate = addMonths(referenceDate, 1);

    while (currentDate < billingEndDate) {
      pickupDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
  } else if (frequency === 'biweekly') {
    // Two occurrences, 14 days apart
    let currentDate = getNextOccurrenceOfWeekday(referenceDate, recurringWeekday);
    pickupDates.push(new Date(currentDate));

    currentDate.setDate(currentDate.getDate() + 14);
    pickupDates.push(new Date(currentDate));
  } else if (frequency === 'monthly') {
    // One occurrence
    pickupDates.push(getNextOccurrenceOfWeekday(referenceDate, recurringWeekday));
  }

  return pickupDates;
}
