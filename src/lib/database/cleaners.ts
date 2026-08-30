// Cleaner database operations and matching logic

import { createAdminClient } from '@/lib/supabase/admin';
import type { Cleaner, CleanerVerificationStatus, User, Weekday } from '@/types/database';
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

/**
 * Get a cleaner profile by user ID
 * @param userId - The authenticated user's ID
 * @returns Cleaner record or null if not found
 */
export async function getCleanerByUserId(userId: string): Promise<Cleaner | null> {
  const supabase = createAdminClient();

  const { data: cleaner, error } = await supabase
    .from('cleaners')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !cleaner) {
    return null;
  }

  return cleaner;
}

/**
 * Create a new cleaner profile
 * @param userId - The authenticated user's ID
 * @param cleanerData - Partial cleaner data from onboarding
 * @returns Created cleaner record or null on error
 */
export async function createCleaner(
  userId: string,
  cleanerData: Partial<Cleaner>
): Promise<{ data: Cleaner | null; error: Error | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('cleaners')
    .insert({
      user_id: userId,
      ...cleanerData
    })
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Persist geocoded coordinates onto a cleaner's base location.
 * Used as a lazy fallback for cleaners created before they had coordinates.
 */
export async function saveCleanerCoords(
  cleanerId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('cleaners')
    .update({ latitude, longitude })
    .eq('id', cleanerId);

  if (error) {
    console.error('Error saving cleaner coordinates:', error);
  }
}

/**
 * Cleaner with the linked user record, for the admin cleaner list.
 */
export interface CleanerWithUser extends Cleaner {
  user: User;
}

/**
 * All cleaners (every verification status) with user info, newest first.
 * Admin dashboard only.
 */
export async function getAllCleanersWithUser(limit = 200): Promise<CleanerWithUser[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('cleaners')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching all cleaners:', error);
    return [];
  }

  return data as CleanerWithUser[];
}

/**
 * Activate (approve) or deactivate (suspend) a cleaner.
 * Approve doubles as the approval step for 'pending' applications and
 * clears any previous suspension. Suspend removes the cleaner from all
 * matching (findAvailableCleaner and getAvailableCleanersForCity require
 * verification_status = 'approved').
 */
export async function setCleanerVerificationStatus(
  cleanerId: string,
  status: Extract<CleanerVerificationStatus, 'approved' | 'suspended'>
): Promise<Cleaner | null> {
  const supabase = createAdminClient();

  const updates =
    status === 'approved'
      ? {
          verification_status: 'approved' as const,
          approved_at: new Date().toISOString(),
          suspended_at: null,
        }
      : {
          verification_status: 'suspended' as const,
          suspended_at: new Date().toISOString(),
        };

  const { data, error } = await supabase
    .from('cleaners')
    .update(updates)
    .eq('id', cleanerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating cleaner verification status:', error);
    return null;
  }

  return data;
}
