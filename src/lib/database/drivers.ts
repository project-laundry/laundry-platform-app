// Driver database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Driver, User } from '@/types/database';

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

/**
 * Driver with the linked user record, for the admin driver list.
 */
export interface DriverWithUser extends Driver {
  user: User;
}

/**
 * All drivers with user info, newest first. Admin dashboard only.
 */
export async function getAllDriversWithUser(): Promise<DriverWithUser[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching all drivers:', error);
    return [];
  }

  return data as DriverWithUser[];
}

/**
 * A single driver with user info by driver id. Admin dashboard only.
 */
export async function getDriverWithUserById(driverId: string): Promise<DriverWithUser | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .eq('id', driverId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as DriverWithUser;
}

export interface DriverProfileData {
  city: string;
  start_latitude: number | null;
  start_longitude: number | null;
  start_label: string | null;
}

/**
 * Create the driver profile row for an existing driver user.
 */
export async function createDriverProfile(
  userId: string,
  data: DriverProfileData
): Promise<Driver | null> {
  const supabase = createAdminClient();

  const { data: driver, error } = await supabase
    .from('drivers')
    .insert({ user_id: userId, ...data })
    .select()
    .single();

  if (error) {
    console.error('Error creating driver profile:', error);
    return null;
  }

  return driver;
}

/**
 * Update a driver profile row (city and/or start point).
 */
export async function updateDriverProfile(
  driverId: string,
  data: Partial<DriverProfileData>
): Promise<Driver | null> {
  const supabase = createAdminClient();

  const { data: driver, error } = await supabase
    .from('drivers')
    .update(data)
    .eq('id', driverId)
    .select()
    .single();

  if (error) {
    console.error('Error updating driver profile:', error);
    return null;
  }

  return driver;
}
