// Order generation service for subscription-based orders

import type {
  SubscriptionFrequency,
  Weekday,
  SubscriptionOrderDefaults,
} from '@/types/database';
import { getNextOccurrenceOfWeekday, addDays, toISODateString } from '@/lib/utils/date';

/**
 * Generate pickup dates based on subscription frequency
 * Always generates a rolling window of upcoming orders (4 weeks ahead)
 *
 * @param frequency - The subscription frequency
 * @param recurringWeekday - The weekday for pickups
 * @param startDate - The reference date (start of window)
 * @returns Array of pickup dates
 */
export function generatePickupDates(
  frequency: SubscriptionFrequency,
  recurringWeekday: Weekday,
  startDate: Date
): Date[] {
  const pickupDates: Date[] = [];

  switch (frequency) {
    case 'weekly':
      // Generate 4 weekly pickups
      let weeklyDate = getNextOccurrenceOfWeekday(startDate, recurringWeekday);
      for (let i = 0; i < 4; i++) {
        pickupDates.push(new Date(weeklyDate));
        weeklyDate = addDays(weeklyDate, 7);
      }
      break;

    case 'biweekly':
      // Generate 2 biweekly pickups (every 2 weeks)
      let biweeklyDate = getNextOccurrenceOfWeekday(startDate, recurringWeekday);
      for (let i = 0; i < 2; i++) {
        pickupDates.push(new Date(biweeklyDate));
        biweeklyDate = addDays(biweeklyDate, 14);
      }
      break;

    case 'monthly':
      // Generate 1 monthly pickup
      pickupDates.push(getNextOccurrenceOfWeekday(startDate, recurringWeekday));
      break;

    default:
      // on_demand or unknown frequency - no auto-generated orders
      break;
  }

  return pickupDates;
}

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

  // Determine target count based on frequency
  const targetCount = subscription.frequency === 'weekly' ? 4
    : subscription.frequency === 'biweekly' ? 2
    : subscription.frequency === 'monthly' ? 1
    : 0;

  if ((count ?? 0) >= targetCount) {
    return; // Already have enough upcoming orders
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

  // Calculate interval based on frequency
  const interval = subscription.frequency === 'weekly' ? 7
    : subscription.frequency === 'biweekly' ? 14
    : 30; // monthly

  const nextDate = addDays(new Date(lastOrder.scheduled_date), interval);

  // Get order defaults from subscription
  const orderDefaults = subscription.order_defaults as SubscriptionOrderDefaults;
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
    delivery_date: toISODateString(addDays(nextDate, 3)),
    needs_ironing: needsIroning,
    total_cost_ore: null, // Cleaner sets price    
    // Address from order defaults
    street: address.street,
    postal_code: address.postal_code,
    city: address.city,
    country: address.country,
    special_instructions_address: address.special_instructions,
    // Pickup details from order defaults
    pickup_method: orderDefaults.pickup_method,
    pickup_location_description: orderDefaults.pickup_location_description,
    special_instructions: orderDefaults.special_instructions,
  });

  console.log(`[Order Generation] Generated next order for subscription ${subscriptionId} (pickup: ${toISODateString(nextDate)})`);
}
