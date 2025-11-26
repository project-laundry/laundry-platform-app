// Cleaner database operations and matching logic

import { createAdminClient } from '@/lib/supabase/admin';
import type { Cleaner, Address, Weekday } from '@/types/database';
import { isWeekdayInSchedule } from '@/lib/utils/date';

export interface CleanerWithAddress extends Cleaner {
  base_address: Address;
}

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
): Promise<CleanerWithAddress | null> {
  const supabase = createAdminClient();

  // Get all approved cleaners who are accepting orders
  const { data: cleaners, error } = await supabase
    .from('cleaners')
    .select(`
      *,
      base_address:addresses!base_address_id(*)
    `)
    .eq('verification_status', 'approved')
    .eq('is_accepting_orders', true);

  if (error || !cleaners || cleaners.length === 0) {
    return null;
  }

  // Filter by criteria
  const matchingCleaners = cleaners.filter((cleaner) => {
    // Skip excluded cleaners
    if (excludeCleanerIds.includes(cleaner.id)) {
      return false;
    }

    // Check city match
    const cleanerAddress = cleaner.base_address as Address;
    if (!cleanerAddress || cleanerAddress.city.toLowerCase() !== customerCity.toLowerCase()) {
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
  const selected = matchingCleaners[0];
  return {
    ...selected,
    base_address: selected.base_address as Address,
  };
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
export async function getAvailableCleanersForCity(city: string): Promise<CleanerWithAddress[]> {
  const supabase = createAdminClient();

  const { data: cleaners, error } = await supabase
    .from('cleaners')
    .select(`
      *,
      base_address:addresses!base_address_id(*)
    `)
    .eq('verification_status', 'approved')
    .eq('is_accepting_orders', true);

  if (error || !cleaners) {
    return [];
  }

  // Filter by city
  return cleaners
    .filter((cleaner) => {
      const cleanerAddress = cleaner.base_address as Address;
      return cleanerAddress && cleanerAddress.city.toLowerCase() === city.toLowerCase();
    })
    .map((cleaner) => ({
      ...cleaner,
      base_address: cleaner.base_address as Address,
    }));
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
