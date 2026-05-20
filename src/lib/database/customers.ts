// Customer database operations

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Customer } from '@/types/database';

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
