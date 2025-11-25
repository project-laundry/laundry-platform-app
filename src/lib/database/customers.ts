// Customer database operations

import { createClient } from '@/lib/supabase/server';
import type { Customer, Address } from '@/types/database';

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
 * Get a customer by ID
 */
export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Update customer's laundry bags count
 */
export async function updateLaundryBagsCount(
  customerId: string,
  increment: number
): Promise<boolean> {
  const supabase = await createClient();

  // Get current count
  const { data: customer } = await supabase
    .from('customers')
    .select('laundry_bags_count')
    .eq('id', customerId)
    .single();

  if (!customer) {
    return false;
  }

  const newCount = customer.laundry_bags_count + increment;

  const { error } = await supabase
    .from('customers')
    .update({ laundry_bags_count: newCount })
    .eq('id', customerId);

  return !error;
}

/**
 * Get customer's default address
 */
export async function getCustomerDefaultAddress(userId: string): Promise<Address | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .single();

  if (error) {
    return null;
  }

  return data;
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
