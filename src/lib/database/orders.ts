// Order database operations

import { createClient } from '@/lib/supabase/server';
import type { Order, OrderStatus, PickupMethod } from '@/types/database';
import { generateOrderNumber } from '@/lib/utils/order-number';

export interface CreateOrderData {
  customer_id: string;
  subscription_id?: string | null;
  plan_id: string;
  cleaner_id?: string | null;
  pickup_street: string;
  pickup_postal_code: string;
  pickup_city: string;
  pickup_country: string;
  pickup_special_instructions?: string | null;
  scheduled_date: string; // ISO date string
  delivery_date: string; // ISO date string
  pickup_method: PickupMethod;
  pickup_location_description?: string | null;
  special_instructions?: string | null;
  extra_kg?: number;
  delicate_items_count?: number;
  needs_ironing?: boolean;
  total_cost_ore: number;
  prerequisite_bag_delivery_id?: string | null;
}

/**
 * Create a new order with a unique order number
 */
export async function createOrder(data: CreateOrderData): Promise<Order | null> {
  const supabase = await createClient();

  // Generate unique order number with collision checking
  let orderNumber = generateOrderNumber();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderNumber)
      .single();

    if (!existing) {
      break;
    }

    orderNumber = generateOrderNumber();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.error('Failed to generate unique order number');
    return null;
  }

  // Determine initial status
  const status: OrderStatus = data.cleaner_id ? 'pickup_scheduled' : 'pending_assignment';

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: data.customer_id,
      subscription_id: data.subscription_id || null,
      plan_id: data.plan_id,
      cleaner_id: data.cleaner_id || null,
      status,
      pickup_street: data.pickup_street,
      pickup_postal_code: data.pickup_postal_code,
      pickup_city: data.pickup_city,
      pickup_country: data.pickup_country,
      pickup_special_instructions: data.pickup_special_instructions || null,
      scheduled_date: data.scheduled_date,
      delivery_date: data.delivery_date,
      pickup_method: data.pickup_method,
      pickup_location_description: data.pickup_location_description || null,
      special_instructions: data.special_instructions || null,
      extra_kg: data.extra_kg || 0,
      delicate_items_count: data.delicate_items_count || 0,
      needs_ironing: data.needs_ironing || false,
      total_cost_ore: data.total_cost_ore,
      prerequisite_bag_delivery_id: data.prerequisite_bag_delivery_id || null,
      assigned_at: data.cleaner_id ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating order:', error);
    return null;
  }

  return order;
}

/**
 * Get an order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get orders pending assignment
 */
export async function getOrdersPendingAssignment(): Promise<Order[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'pending_assignment')
    .order('scheduled_date', { ascending: true });

  if (error) {
    return [];
  }

  return data;
}

/**
 * Assign a cleaner to an order
 */
export async function assignCleanerToOrder(
  orderId: string,
  cleanerId: string
): Promise<Order | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .update({
      cleaner_id: cleanerId,
      status: 'pickup_scheduled' as OrderStatus,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error assigning cleaner to order:', error);
    return null;
  }

  return data;
}

/**
 * Get orders for a subscription
 */
export async function getOrdersForSubscription(subscriptionId: string): Promise<Order[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('scheduled_date', { ascending: true });

  if (error) {
    return [];
  }

  return data;
}

/**
 * Get orders for a customer
 */
export async function getOrdersForCustomer(customerId: string): Promise<Order[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('scheduled_date', { ascending: false });

  if (error) {
    return [];
  }

  return data;
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order | null> {
  const supabase = await createClient();

  // Map status to timestamp field
  const timestampField: Record<OrderStatus, string | null> = {
    pending_assignment: null,
    pickup_scheduled: null,
    picked_up: 'picked_up_at',
    in_cleaning: 'in_cleaning_at',
    ready_for_delivery: 'ready_for_delivery_at',
    out_for_delivery: 'out_for_delivery_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
  };

  const updateData: Record<string, unknown> = { status };
  const field = timestampField[status];
  if (field) {
    updateData[field] = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order status:', error);
    return null;
  }

  return data;
}
