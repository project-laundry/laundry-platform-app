// Order database operations

import { createAdminClient } from '@/lib/supabase/admin';
import type { Order, OrderStatus, OrderWithRelations, Customer, User, Subscription, OrderIroningDetails, OrderPromo } from '@/types/database';

/**
 * Order with customer and subscription details for cleaner dashboard
 */
export interface OrderWithCustomer extends Order {
  customer: Customer & { user: User };
  subscription: Pick<Subscription, 'frequency'> | null;
}
import { generateOrderNumber } from '@/lib/utils/order-number';

export interface CreateOrderData {
  customer_id: string;
  subscription_id?: string | null;
  payment_agreement_id?: string | null;
  cleaner_id?: string | null;
  // Address (single address - pickup = delivery)
  street: string;
  postal_code: string;
  city: string;
  country: string;
  special_instructions_address?: string | null;
  // Scheduling
  scheduled_date: string; // ISO date string
  delivery_date: string; // ISO date string
  // Pickup details
  special_instructions?: string | null;
  // Service preferences
  needs_ironing?: boolean;
  // Pricing (nullable - set by cleaner after pickup)
  total_cost_ore?: number | null;
  // Promo code locked snapshot (first order only); null if none
  promo?: OrderPromo | null;
  // Other
  status?: OrderStatus; // Optional: override auto-determined status
}

/**
 * Create a new order with a unique order number
 */
export async function createOrder(data: CreateOrderData): Promise<Order | null> {
  const supabase = await createAdminClient();

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

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: data.customer_id,
      subscription_id: data.subscription_id || null,
      payment_agreement_id: data.payment_agreement_id || null,
      cleaner_id: data.cleaner_id || null,
      status: data.status,
      // Address (single address - pickup = delivery)
      street: data.street,
      postal_code: data.postal_code,
      city: data.city,
      country: data.country,
      special_instructions_address: data.special_instructions_address || null,
      // Scheduling
      scheduled_date: data.scheduled_date,
      delivery_date: data.delivery_date,
      // Pickup details
      special_instructions: data.special_instructions || null,
      // Service preferences
      needs_ironing: data.needs_ironing || false,
      // Pricing (nullable - set by cleaner after pickup)
      total_cost_ore: data.total_cost_ore || null,
      // Promo code locked snapshot (first order only)
      promo: data.promo ?? null,
      // Other
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
  const supabase = await createAdminClient();

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
 * Assign a cleaner to an order
 */
export async function assignCleanerToOrder(
  orderId: string,
  cleanerId: string
): Promise<Order | null> {
  const supabase = await createAdminClient();

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
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order | null> {
  const supabase = await createAdminClient();

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

/**
 * Get upcoming orders for a customer
 * Returns orders that are not yet completed or cancelled
 */
export async function getUpcomingOrdersByCustomerId(
  customerId: string
): Promise<OrderWithRelations[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      cleaner:cleaners!orders_cleaner_id_fkey(
        *,
        user:users(*)
      ),
      subscription:subscriptions(*)
    `)
    .eq('customer_id', customerId)
    .in('status', [
      'pending_assignment',
      'pickup_scheduled',
      'picked_up',
      'in_cleaning',
      'ready_for_delivery',
      'out_for_delivery'
    ])
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming orders:', error);
    return [];
  }

  return data as OrderWithRelations[];
}

/**
 * Get completed orders for a customer
 * Returns orders that are completed or cancelled
 */
export async function getCompletedOrdersByCustomerId(
  customerId: string
): Promise<OrderWithRelations[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      cleaner:cleaners!orders_cleaner_id_fkey(
        *,
        user:users(*)
      ),
      subscription:subscriptions(*)
    `)
    .eq('customer_id', customerId)
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching completed orders:', error);
    return [];
  }

  return data as OrderWithRelations[];
}

/**
 * Get a single order with full details for a customer
 * Returns null if order doesn't exist or doesn't belong to customer
 */
export async function getOrderWithDetailsByIdAndCustomerId(
  orderId: string,
  customerId: string
): Promise<OrderWithRelations | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      cleaner:cleaners!orders_cleaner_id_fkey(
        *,
        user:users(*)
      ),
      subscription:subscriptions(*)
    `)
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    console.error('Error fetching order details:', error);
    return null;
  }

  return data as OrderWithRelations;
}

/**
 * Update order pricing after cleaner calculates price
 * Called by cleaner after weighing laundry
 */
export async function updateOrderPricing(
  orderId: string,
  cleanerId: string,
  actualWeightKg: number,
  totalCostOre: number,
  pricingNotes?: string
): Promise<{ data: Order | null; error: string | null }> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .update({
      actual_weight_kg: actualWeightKg,
      total_cost_ore: totalCostOre,
      pricing_notes: pricingNotes || null,
      price_calculated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order pricing:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get orders assigned to a cleaner
 * Returns active orders (not completed/cancelled) with customer details
 */
export async function getOrdersByCleanerId(
  cleanerId: string
): Promise<OrderWithCustomer[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(
        *,
        user:users!user_id(*)
      ),
      subscription:subscriptions(frequency)
    `)
    .eq('cleaner_id', cleanerId)
    .not('status', 'in', '(completed,cancelled)')
    .order('scheduled_date', { ascending: true });

  if (error) {
    console.error('Error fetching cleaner orders:', error);
    return [];
  }

  return data as OrderWithCustomer[];
}

/**
 * Cleaner declines an order - resets to pending_assignment
 * Adds cleaner to declined_by_cleaner_ids to avoid re-assignment
 */
export async function declineOrder(
  orderId: string,
  cleanerId: string
): Promise<Order | null> {
  const supabase = await createAdminClient();

  // Get current declined IDs
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('declined_by_cleaner_ids, cleaner_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    console.error('Error fetching order for decline:', fetchError);
    return null;
  }

  // Verify this cleaner is assigned to the order
  if (order.cleaner_id !== cleanerId) {
    console.error('Cleaner not assigned to this order');
    return null;
  }

  const currentDeclined = order.declined_by_cleaner_ids || [];
  const updatedDeclined = [...currentDeclined, cleanerId];

  const { data, error } = await supabase
    .from('orders')
    .update({
      cleaner_id: null,
      status: 'pending_assignment',
      assigned_at: null,
      declined_by_cleaner_ids: updatedDeclined,
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error declining order:', error);
    return null;
  }

  return data;
}

/**
 * Data for updating laundry details
 */
export interface UpdateLaundryDetailsData {
  dark_loads: number;
  white_loads: number;
  ironing_details: OrderIroningDetails | null;
  total_cost_ore: number;
  pricing_notes?: string;
  // Updated promo snapshot with discount_ore filled in (if a promo was applied)
  promo?: OrderPromo | null;
}

/**
 * Update order with laundry details and calculated price
 * Called by cleaner after registering loads and ironing items
 */
export async function updateOrderLaundryDetails(
  orderId: string,
  cleanerId: string,
  data: UpdateLaundryDetailsData
): Promise<{ data: Order | null; error: string | null }> {
  const supabase = await createAdminClient();

  // First verify the cleaner owns this order and it's not completed
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('cleaner_id, status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { data: null, error: 'Order not found' };
  }

  if (order.cleaner_id !== cleanerId) {
    return { data: null, error: 'Not authorized to update this order' };
  }

  if (order.status === 'completed' || order.status === 'cancelled') {
    return { data: null, error: 'Cannot update a completed or cancelled order' };
  }

  const updateData: Record<string, unknown> = {
    dark_loads: data.dark_loads,
    white_loads: data.white_loads,
    ironing_details: data.ironing_details,
    total_cost_ore: data.total_cost_ore,
    pricing_notes: data.pricing_notes || null,
    price_calculated_at: new Date().toISOString(),
  };

  // Only touch promo when the caller provides it (with discount_ore filled in)
  if (data.promo !== undefined) {
    updateData.promo = data.promo;
  }

  const { data: updatedOrder, error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    console.error('Error updating order laundry details:', error);
    return { data: null, error: error.message };
  }

  return { data: updatedOrder, error: null };
}

/**
 * Get completed/cancelled orders for a cleaner (history)
 * Returns orders ordered by completion date, most recent first
 */
export async function getCompletedOrdersByCleanerId(
  cleanerId: string
): Promise<OrderWithCustomer[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(
        *,
        user:users!user_id(*)
      ),
      subscription:subscriptions(frequency)
    `)
    .eq('cleaner_id', cleanerId)
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('Error fetching cleaner order history:', error);
    return [];
  }

  return data as OrderWithCustomer[];
}

/**
 * Get a single order with full details for a cleaner
 * Returns null if order doesn't exist or doesn't belong to cleaner
 */
export async function getOrderByIdAndCleanerId(
  orderId: string,
  cleanerId: string
): Promise<OrderWithCustomer | null> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers!customer_id(
        *,
        user:users!user_id(*)
      ),
      subscription:subscriptions(frequency)
    `)
    .eq('id', orderId)
    .eq('cleaner_id', cleanerId)
    .single();

  if (error) {
    console.error('Error fetching order for cleaner:', error);
    return null;
  }

  return data as OrderWithCustomer;
}

/**
 * Cancel all pending/upcoming orders for a subscription
 *
 * Called when a subscription is cancelled or expired to prevent future orders.
 * Only cancels orders that haven't been completed yet.
 *
 * @param subscriptionId - The subscription ID
 * @returns Number of orders cancelled
 */
export async function cancelOrdersBySubscriptionId(
  subscriptionId: string
): Promise<number> {
  const supabase = await createAdminClient();

  console.log(`[cancelOrdersBySubscriptionId] Cancelling orders for subscription ${subscriptionId}`);

  // Cancel all non-completed/non-cancelled orders
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'cancelled' as OrderStatus,
      cancelled_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscriptionId)
    .not('status', 'in', '(completed,cancelled)')
    .select('id');

  if (error) {
    console.error('[cancelOrdersBySubscriptionId] Error cancelling orders:', error);
    return 0;
  }

  const count = data?.length || 0;
  console.log(`[cancelOrdersBySubscriptionId] Cancelled ${count} orders`);
  return count;
}
