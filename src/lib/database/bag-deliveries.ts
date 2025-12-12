// Bag delivery database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { BagDelivery, BagDeliveryStatus } from '@/types/database';
import { generateOrderNumber } from '@/lib/utils/order-number';

export interface CreateBagDeliveryData {
  customer_id: string;
  delivery_street: string;
  delivery_postal_code: string;
  delivery_city: string;
  delivery_country: string;
  delivery_special_instructions?: string | null;
  scheduled_date: string; // ISO date string
  bag_quantity?: number;
  special_instructions?: string | null;
}

/**
 * Create a new bag delivery
 */
export async function createBagDelivery(
  data: CreateBagDeliveryData
): Promise<BagDelivery | null> {
  const supabase = await createAdminClient();

  // Generate unique delivery number (same format as order number)
  let deliveryNumber = generateOrderNumber(6);
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('bag_deliveries')
      .select('id')
      .eq('delivery_number', deliveryNumber)
      .single();

    if (!existing) {
      break;
    }

    deliveryNumber = generateOrderNumber(6);
    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.error('Failed to generate unique delivery number');
    return null;
  }  

  const { data: bagDelivery, error } = await supabase
    .from('bag_deliveries')
    .insert({
      delivery_number: deliveryNumber,
      customer_id: data.customer_id,
      delivery_street: data.delivery_street,
      delivery_postal_code: data.delivery_postal_code,
      delivery_city: data.delivery_city,
      delivery_country: data.delivery_country,
      delivery_special_instructions: data.delivery_special_instructions || null,
      status: 'pending' as BagDeliveryStatus,
      bag_quantity: data.bag_quantity || 1,
      scheduled_date: data.scheduled_date,
      special_instructions: data.special_instructions || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating bag delivery:', error);
    return null;
  }

  return bagDelivery;
}

/**
 * Get a bag delivery by ID
 */
export async function getBagDeliveryById(
  bagDeliveryId: string
): Promise<BagDelivery | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('bag_deliveries')
    .select('*')
    .eq('id', bagDeliveryId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Mark a bag delivery as completed and increment customer's bag count
 */
export async function completeBagDelivery(
  bagDeliveryId: string
): Promise<BagDelivery | null> {
  const supabase = await createAdminClient();

  // Get the bag delivery
  const { data: delivery } = await supabase
    .from('bag_deliveries')
    .select('*')
    .eq('id', bagDeliveryId)
    .single();

  if (!delivery) {
    return null;
  }

  // Update bag delivery status
  const { data: updatedDelivery, error } = await supabase
    .from('bag_deliveries')
    .update({
      status: 'completed' as BagDeliveryStatus,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', bagDeliveryId)
    .select()
    .single();

  if (error) {
    console.error('Error completing bag delivery:', error);
    return null;
  }

  // Increment customer's laundry_bags_count
  const { data: customer } = await supabase
    .from('customers')
    .select('laundry_bags_count')
    .eq('id', delivery.customer_id)
    .single();

  if (customer) {
    await supabase
      .from('customers')
      .update({
        laundry_bags_count: customer.laundry_bags_count + delivery.bag_quantity,
      })
      .eq('id', delivery.customer_id);
  }

  return updatedDelivery;
}

/**
 * Get bag deliveries for a customer
 */
export async function getBagDeliveriesForCustomer(
  customerId: string
): Promise<BagDelivery[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('bag_deliveries')
    .select('*')
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false });

  if (error) {
    return [];
  }

  return data;
}

/**
 * Get pending bag deliveries
 */
export async function getPendingBagDeliveries(): Promise<BagDelivery[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('bag_deliveries')
    .select('*')
    .in('status', ['pending', 'scheduled', 'en_route'])
    .order('scheduled_date', { ascending: true });

  if (error) {
    return [];
  }

  return data;
}
