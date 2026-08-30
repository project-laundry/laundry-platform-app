// User database operations

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { User, UserRole } from '@/types/database';

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

/**
 * All users with a given role, newest first. Admin dashboard only.
 * Uses the admin client — the session client's RLS policy only allows
 * reading your own users row.
 */
export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return data;
}

/**
 * A single user by id via the admin client (the session client can only
 * read the caller's own row). Admin dashboard only.
 */
export async function getUserByIdAsAdmin(userId: string): Promise<User | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Update a user's contact fields (full name, phone).
 * Returns a Norwegian error message on failure — 23505 is the unique
 * violation on users.phone.
 */
export async function updateUserContact(
  userId: string,
  updates: { full_name: string; phone: string }
): Promise<{ data: User | null; error: string | null }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user contact:', error);
    if (error.code === '23505') {
      return { data: null, error: 'Telefonnummeret er allerede i bruk' };
    }
    return { data: null, error: 'Kunne ikke oppdatere brukeren' };
  }

  return { data, error: null };
}