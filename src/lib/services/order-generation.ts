// Order generation service for subscription-based orders

import type {
  SubscriptionOrderDefaults,
} from '@/types/database';
import { getNextOccurrenceOfWeekday, addDays, toISODateString, getWeekdayFromDate } from '@/lib/utils/date';
import { DAYS_PICKUP_TO_DELIVERY } from '@/lib/config/order-timing';

/**
 * Check if subscription needs new orders generated and create them
 * Called when order is completed - maintains rolling window of upcoming orders
 *
 * This function ensures there are always a minimum number of upcoming orders
 * based on the subscription frequency (4 for weekly, 2 for biweekly, 1 for monthly)
 *
 * @param subscriptionId - Subscription ID to check
 */
export async function checkAndGenerateNextOrders(subscriptionId: string): Promise<void> {
  // Import admin client dynamically to avoid circular dependency
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // Get subscription
  const { data: subscription, error: subError } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription || subscription.status !== 'active') {
    return; // Exit silently if subscription not found or not active
  }

  // Count upcoming orders (not completed/cancelled)
  const { count } = await adminClient
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .not('status', 'in', '(completed,cancelled)')
    .gte('scheduled_date', toISODateString(new Date()));

  // Rolling window approach: always maintain 1 upcoming order
  const targetCount = 1;

  if ((count ?? 0) >= targetCount) {
    return; // Already have an upcoming order
  }

  // Get last scheduled order to calculate next date
  const { data: lastOrder } = await adminClient
    .from('orders')
    .select('scheduled_date')
    .eq('subscription_id', subscriptionId)
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .single();

  if (!lastOrder) {
    return; // No orders yet, shouldn't happen but exit gracefully
  }

  // Get order defaults from subscription (needed for monthly frequency)
  const orderDefaults = subscription.order_defaults as SubscriptionOrderDefaults;

  // Calculate next pickup date based on frequency
  let nextDate: Date;

  if (subscription.frequency === 'weekly') {
    nextDate = addDays(new Date(lastOrder.scheduled_date), 7);
  } else if (subscription.frequency === 'biweekly') {
    nextDate = addDays(new Date(lastOrder.scheduled_date), 14);
  } else if (subscription.frequency === 'monthly') {
    // For monthly: add ~30 days then find next occurrence of the original weekday
    // Derive weekday from first pickup date
    const weekday = getWeekdayFromDate(orderDefaults.first_pickup_date);
    const approximateDate = addDays(new Date(lastOrder.scheduled_date), 30);
    nextDate = getNextOccurrenceOfWeekday(approximateDate, weekday);
  } else if (subscription.frequency === 'on_demand') {
    // on_demand = single order, no recurring orders to generate
    return;
  } else {
    console.error(`[Order Generation] Unsupported frequency: ${subscription.frequency}`);
    return;
  }

  // Check if order already exists for this date (duplicate prevention)
  const { data: existingOrder } = await adminClient
    .from('orders')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('scheduled_date', toISODateString(nextDate))
    .single();

  if (existingOrder) {
    console.log(`[Order Generation] Order already exists for ${toISODateString(nextDate)}, skipping generation`);
    return;
  }

  // Validate order defaults
  if (!orderDefaults?.initial_address) {
    console.error(`[Order Generation] No order_defaults found in subscription ${subscriptionId}`);
    return;
  }

  const address = orderDefaults.initial_address;
  const defaultCleanerId = orderDefaults.default_cleaner_id;
  const needsIroning = orderDefaults.default_needs_ironing;

  // Import createOrder function
  const { createOrder } = await import('@/lib/database/orders');

  // Create next order with defaults from metadata
  await createOrder({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    cleaner_id: defaultCleanerId,
    status: defaultCleanerId ? 'pickup_scheduled' : 'pending_assignment',
    scheduled_date: toISODateString(nextDate),
    delivery_date: toISODateString(addDays(nextDate, DAYS_PICKUP_TO_DELIVERY)),
    needs_ironing: needsIroning,
    total_cost_ore: null, // Cleaner sets price    
    // Address from order defaults
    street: address.street,
    postal_code: address.postal_code,
    city: address.city,
    country: address.country,
    special_instructions_address: address.special_instructions,
    // Geocoded coordinates (propagated from checkout; null if geocoding failed)
    latitude: address.latitude ?? null,
    longitude: address.longitude ?? null,
    // Pickup details from order defaults
    special_instructions: orderDefaults.special_instructions,
  });

  console.log(`[Order Generation] Generated next order for subscription ${subscriptionId} (pickup: ${toISODateString(nextDate)})`);
}
