// Cleaner database operations and matching logic

import { createAdminClient } from '@/lib/supabase/admin';
import type { Cleaner, Weekday, Subscription } from '@/types/database';
import { getWeekdayFromDate, isWeekdayInSchedule } from '@/lib/utils/date';

/**
 * Select cleaner with least workload from a list of candidates
 * @param cleaners - Candidate cleaners to choose from
 * @returns Cleaner with fewest active orders, or random if query fails
 */
export async function selectCleanerWithLeastWorkload(cleaners: Cleaner[]): Promise<Cleaner> {
  if (cleaners.length === 1) {
    return cleaners[0];
  }

  const supabase = createAdminClient();
  const cleanerIds = cleaners.map(c => c.id);

  // Get active order counts for each cleaner
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('assigned_cleaner_id')
    .in('assigned_cleaner_id', cleanerIds)
    .in('status', ['pending', 'assigned', 'picked_up', 'in_progress', 'ready_for_delivery', 'out_for_delivery']);

  if (ordersError) {
    // If we can't get order counts, fall back to random selection
    const randomIndex = Math.floor(Math.random() * cleaners.length);
    return cleaners[randomIndex];
  }

  // Count orders per cleaner
  const orderCounts = new Map<string, number>();
  cleanerIds.forEach(id => orderCounts.set(id, 0));

  orders?.forEach(order => {
    if (order.assigned_cleaner_id) {
      const current = orderCounts.get(order.assigned_cleaner_id) || 0;
      orderCounts.set(order.assigned_cleaner_id, current + 1);
    }
  });

  // Find cleaner(s) with minimum workload
  const minWorkload = Math.min(...Array.from(orderCounts.values()));
  const cleanersWithMinWorkload = cleaners.filter(
    cleaner => orderCounts.get(cleaner.id) === minWorkload
  );

  // If multiple cleaners have same workload, pick randomly
  const randomIndex = Math.floor(Math.random() * cleanersWithMinWorkload.length);
  return cleanersWithMinWorkload[randomIndex];
}

/**
 * Find an available cleaner for a customer based on matching criteria
 * @param customerCity - The city from customer's address
 * @param pickupWeekday - The date of the scheduled pickup
 * @param excludeCleanerIds - Cleaners to exclude (e.g., declined)
 * @returns Matching cleaner or null if none found
 */
export async function findAvailableCleaner(
  customerCity: string,
  scheduledDate: Date,
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

    const pickupWeekday = getWeekdayFromDate(scheduledDate);

    // Check if cleaner works on the pickup weekday
    if (!isWeekdayInSchedule(cleaner.weekly_schedule, pickupWeekday)) {
      return false;
    }

    return true;
  });

  if (matchingCleaners.length === 0) {
    return null;
  }

  // Load balance: select cleaner with fewest active orders
  return await selectCleanerWithLeastWorkload(matchingCleaners);
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
