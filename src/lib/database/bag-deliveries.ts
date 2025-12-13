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