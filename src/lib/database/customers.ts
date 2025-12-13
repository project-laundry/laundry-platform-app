// Customer database operations

import { createClient } from '@/lib/supabase/server';
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
 * Create a new customer record
 */
export async function createCustomer(userId: string) {
  const supabase = await createClient();

  return await supabase
    .from('customers')
    .insert({
      user_id: userId,
      laundry_bags_count: 0
    })
    .select()
    .single();
}
