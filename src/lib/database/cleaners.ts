// Cleaner database operations and matching logic

import { createAdminClient } from '@/lib/supabase/admin';
import type { Cleaner, Weekday, Subscription } from '@/types/database';
import { isWeekdayInSchedule } from '@/lib/utils/date';

/**
 * Find an available cleaner for a customer based on matching criteria
 * @param customerCity - The city from customer's address
 * @param pickupWeekday - The recurring weekday for pickups
 * @param excludeCleanerIds - Cleaners to exclude (e.g., declined)
 * @returns Matching cleaner or null if none found
 */
export async function findAvailableCleaner(
  customerCity: string,
  pickupWeekday: Weekday,
  excludeCleanerIds: string[] = []
): Promise<Cleaner | null> {
  const supabase = createAdminClient();

  // Get all approved cleaners who are accepting orders in the customer's city
  const { data: cleaners, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('verification_status', 'approved')
    .eq('is_accepting_orders', true)
    .ilike('base_city', customerCity);

  if (error || !cleaners || cleaners.length === 0) {
    return null;
  }

  // Filter by criteria
  const matchingCleaners = cleaners.filter((cleaner) => {
    // Skip excluded cleaners
    if (excludeCleanerIds.includes(cleaner.id)) {
      return false;
    }

    // Check if cleaner works on the pickup weekday
    if (!isWeekdayInSchedule(cleaner.weekly_schedule, pickupWeekday)) {
      return false;
    }

    return true;
  });

  if (matchingCleaners.length === 0) {
    return null;
  }

  // Return first matching cleaner (could implement load balancing here)
  return matchingCleaners[0];
}

/**
 * Get a cleaner by ID
 */
export async function getCleanerById(cleanerId: string): Promise<Cleaner | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('id', cleanerId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get all available cleaners for a city
 */
export async function getAvailableCleanersForCity(city: string): Promise<Cleaner[]> {
  const supabase = createAdminClient();

  const { data: cleaners, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('verification_status', 'approved')
    .eq('is_accepting_orders', true)
    .ilike('base_city', city);

  if (error || !cleaners) {
    return [];
  }

  return cleaners;
}

/**
 * Get all weekdays that have at least one available cleaner in a city
 */
export async function getAvailableWeekdaysForCity(city: string): Promise<Weekday[]> {
  const cleaners = await getAvailableCleanersForCity(city);

  if (cleaners.length === 0) {
    return [];
  }

  const allWeekdays: Weekday[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Return weekdays where at least one cleaner is available
  return allWeekdays.filter(weekday =>
    cleaners.some(cleaner => isWeekdayInSchedule(cleaner.weekly_schedule, weekday))
  );
}

/**
 * Find available cleaners for a subscription based on delivery city and recurring weekday
 */
export async function findAvailableCleanerForSubscription(subscription: Subscription): Promise<Cleaner[]> {
  const supabase = createAdminClient();

  // Get all approved cleaners who are accepting orders in the subscription's city
  const { data: cleaners, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('verification_status', 'approved')
    .eq('is_accepting_orders', true)
    .ilike('base_city', subscription.delivery_city);

  if (error || !cleaners || cleaners.length === 0) {
    return [];
  }

  // If no recurring weekday is set, return all cleaners in the city
  const recurringWeekday = subscription.recurring_weekday;
  if (!recurringWeekday) {
    return cleaners;
  }

  // Filter cleaners who work on the subscription's recurring weekday
  return cleaners.filter(cleaner =>
    isWeekdayInSchedule(cleaner.weekly_schedule, recurringWeekday)
  );
}
