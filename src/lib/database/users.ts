// Customer database operations

import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types/database';

/**
 * Get a user by user ID
 */
export async function getUsersById(userId: string): Promise<User | null> {
  const supabase = await createClient();

  // Get customer
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return null;
  }

  return user;
}