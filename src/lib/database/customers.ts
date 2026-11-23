// Customer database operations

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Customer, User } from '@/types/database';

/**
 * Get a customer by user ID with their default address
 */
export async function getCustomerByUserId(userId: string): Promise<Customer | null> {
  const supabase = await createClient();

  // Get customer
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (customerError || !customer) {
    return null;
  }

  return customer;
}

/**
 * Same lookup as getCustomerByUserId, but via the admin client: the session
 * client can only read the caller's own customer row. Only for the admin
 * «Se som» view (lib/auth/view-as.ts).
 */
export async function getCustomerByUserIdAsAdmin(userId: string): Promise<Customer | null> {
  const { data, error } = await createAdminClient()
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Get a customer by ID (using admin client for webhook access)
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Customer with the linked user record, for the admin dashboard.
 */
export interface CustomerWithUser extends Customer {
  user: User;
}

/**
 * All customers with user info, newest first. Admin dashboard only.
 */
export async function getAllCustomersWithUser(limit = 200): Promise<CustomerWithUser[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    console.error('Error fetching all customers:', error);
    return [];
  }

  return data as CustomerWithUser[];
}

/**
 * A single customer with user info by customer id. Admin dashboard only.
 */
export async function getCustomerWithUserById(
  customerId: string
): Promise<CustomerWithUser | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('customers')
    .select(`
      *,
      user:users!user_id(*)
    `)
    .eq('id', customerId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as CustomerWithUser;
}

/** Store the customer's e-mail choices (admin client; the caller is a role-guarded action). */
export async function updateCustomerEmailPreferences(
  customerId: string,
  preferences: Customer['email_preferences']
): Promise<{ error: string | null }> {
  const { error } = await createAdminClient()
    .from('customers')
    .update({ email_preferences: preferences })
    .eq('id', customerId);

  if (error) {
    console.error('[updateCustomerEmailPreferences] Error updating customer:', error);
    return { error: 'Kunne ikke lagre valgene. Prøv igjen.' };
  }
  return { error: null };
}
