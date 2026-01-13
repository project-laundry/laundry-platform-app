// Order generation service for subscription-based orders

import type {
  SubscriptionFrequency,
  SubscriptionOrderDefaults,
} from '@/types/database';
import { getNextOccurrenceOfWeekday, addDays, toISODateString, getWeekdayFromDate } from '@/lib/utils/date';
import { DAYS_PICKUP_TO_DELIVERY } from '@/lib/config/order-timing';

// Constants for order generation logic
const TARGET_UPCOMING_ORDERS = 1; // Rolling window: maintain 1 upcoming order
const DAYS_IN_WEEK = 7;
const DAYS_IN_BIWEEK = 14;
const APPROXIMATE_DAYS_IN_MONTH = 30;

/**
 * Context object containing all data needed for order generation
 */
interface OrderGenerationContext {
  subscription: {
    id: string;
    customer_id: string;
    frequency: SubscriptionFrequency;
    order_defaults: SubscriptionOrderDefaults;
  };
  lastScheduledDate: string;
  upcomingOrderCount: number;
}

/**
 * Calculate the next pickup date based on subscription frequency
 * Pure function with no side effects
 *
 * @param frequency - Subscription frequency (weekly, biweekly, monthly)
 * @param lastScheduledDate - ISO date string of last scheduled order
 * @param firstPickupDate - ISO date string of the original first pickup (used for monthly to preserve weekday)
 * @returns Next pickup date
 */
function calculateNextPickupDate(
  frequency: SubscriptionFrequency,
  lastScheduledDate: string,
  firstPickupDate: string
): Date {
  const lastDate = new Date(lastScheduledDate);

  switch (frequency) {
    case 'weekly':
      return addDays(lastDate, DAYS_IN_WEEK);

    case 'biweekly':
      return addDays(lastDate, DAYS_IN_BIWEEK);

    case 'monthly':
      // For monthly: add ~30 days then find next occurrence of the original weekday
      // This preserves the same day of week as the first pickup
      const targetWeekday = getWeekdayFromDate(firstPickupDate);
      const approximateDate = addDays(lastDate, APPROXIMATE_DAYS_IN_MONTH);
      return getNextOccurrenceOfWeekday(approximateDate, targetWeekday);

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
}

/**
 * Fetch all data needed for order generation in a single pass
 * Returns null if subscription is not eligible for order generation
 *
 * @param subscriptionId - Subscription ID to fetch context for
 * @param adminClient - Supabase admin client
 * @returns Context object or null if not eligible
 */
async function fetchOrderGenerationContext(
  subscriptionId: string,
  adminClient: any
): Promise<OrderGenerationContext | null> {
  // Fetch subscription
  const { data: subscription, error: subError } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    return null; // Not eligible: subscription not found or not active
  }

  // Count upcoming orders (not completed/cancelled)
  const { count } = await adminClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .not('status', 'in', '(completed,cancelled)')
    .gte('scheduled_date', toISODateString(new Date()));

  // Get last scheduled order to calculate next date
  const { data: lastOrder } = await adminClient
    .from('orders')
    .select('scheduled_date')
    .eq('subscription_id', subscriptionId)
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .single();

  if (!lastOrder) {
    return null; // Not eligible: no orders exist yet
  }

  return {
    subscription: {
      id: subscription.id,
      customer_id: subscription.customer_id,
      frequency: subscription.frequency,
      order_defaults: subscription.order_defaults as SubscriptionOrderDefaults,
    },
    lastScheduledDate: lastOrder.scheduled_date,
    upcomingOrderCount: count ?? 0,
  };
}

/**
 * Validate that order defaults contain all required data
 *
 * @param orderDefaults - Order defaults from subscription
 * @returns true if valid, false otherwise
 */
function validateOrderDefaults(orderDefaults: SubscriptionOrderDefaults): boolean {
  if (!orderDefaults?.initial_address) {
    return false;
  }

  const { street, postal_code, city, country } = orderDefaults.initial_address;
  return Boolean(street && postal_code && city && country);
}

/**
 * Check if an order already exists for a specific date
 *
 * @param subscriptionId - Subscription ID
 * @param scheduledDate - Date to check (Date object)
 * @param adminClient - Supabase admin client
 * @returns true if order exists, false otherwise
 */
async function orderExistsForDate(
  subscriptionId: string,
  scheduledDate: Date,
  adminClient: any
): Promise<boolean> {
  const { data: existingOrder } = await adminClient
    .from('orders')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('scheduled_date', toISODateString(scheduledDate))
    .single();

  return Boolean(existingOrder);
}

/**
 * Create a new order with data from subscription defaults
 *
 * @param context - Order generation context
 * @param pickupDate - Scheduled pickup date
 */
async function createOrderFromDefaults(
  context: OrderGenerationContext,
  pickupDate: Date
): Promise<void> {
  const { subscription } = context;
  const { order_defaults: orderDefaults } = subscription;
  const address = orderDefaults.initial_address;

  // Import createOrder function dynamically to avoid circular dependency
  const { createOrder } = await import('@/lib/database/orders');

  await createOrder({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    cleaner_id: orderDefaults.default_cleaner_id,
    status: orderDefaults.default_cleaner_id ? 'pickup_scheduled' : 'pending_assignment',
    scheduled_date: toISODateString(pickupDate),
    delivery_date: toISODateString(addDays(pickupDate, DAYS_PICKUP_TO_DELIVERY)),
    needs_ironing: orderDefaults.default_needs_ironing,
    total_cost_ore: null, // Cleaner sets price after pickup
    // Address from order defaults
    street: address.street,
    postal_code: address.postal_code,
    city: address.city,
    country: address.country,
    special_instructions_address: address.special_instructions,
    // Pickup details from order defaults
    special_instructions: orderDefaults.special_instructions,
  });
}

/**
 * Check if subscription needs new orders generated and create them
 * Called when order is completed - maintains rolling window of upcoming orders
 *
 * This function ensures there is always 1 upcoming order for active subscriptions.
 * It coordinates multiple smaller functions to fetch data, calculate dates, and create orders.
 *
 * @param subscriptionId - Subscription ID to check
 */
export async function checkAndGenerateNextOrders(subscriptionId: string): Promise<void> {
  // Import admin client dynamically to avoid circular dependency
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // Fetch all required data
  const context = await fetchOrderGenerationContext(subscriptionId, adminClient);

  if (!context) {
    return; // Exit silently if not eligible
  }

  // Check if we already have enough upcoming orders
  if (context.upcomingOrderCount >= TARGET_UPCOMING_ORDERS) {
    return; // Rolling window satisfied
  }

  // Validate order defaults
  const { order_defaults: orderDefaults } = context.subscription;
  if (!validateOrderDefaults(orderDefaults)) {
    console.error(`[Order Generation] Invalid order_defaults for subscription ${subscriptionId}`);
    return;
  }

  // Calculate next pickup date
  let nextPickupDate: Date;
  try {
    nextPickupDate = calculateNextPickupDate(
      context.subscription.frequency,
      context.lastScheduledDate,
      orderDefaults.first_pickup_date
    );
  } catch (error) {
    console.error(`[Order Generation] Failed to calculate next pickup date:`, error);
    return;
  }

  // Check for duplicate orders
  const isDuplicate = await orderExistsForDate(subscriptionId, nextPickupDate, adminClient);
  if (isDuplicate) {
    console.log(`[Order Generation] Order already exists for ${toISODateString(nextPickupDate)}, skipping`);
    return;
  }

  // Create the order
  await createOrderFromDefaults(context, nextPickupDate);

  console.log(
    `[Order Generation] Generated next order for subscription ${subscriptionId} ` +
    `(pickup: ${toISODateString(nextPickupDate)})`
  );
}
