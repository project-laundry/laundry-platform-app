// Driver database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Driver } from '@/types/database';

/**
 * Get a driver profile by user ID
 * @param userId - The authenticated user's ID
 * @returns Driver record or null if not found
 */
export async function getDriverByUserId(userId: string): Promise<Driver | null> {
  const supabase = createAdminClient();

  const { data: driver, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !driver) {
    return null;
  }

  return driver;
}
