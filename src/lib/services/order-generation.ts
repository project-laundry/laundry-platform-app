// Order Generation Service
// Generates orders for a subscription based on billing period and frequency

import { createClient } from '@/lib/supabase/server';
import { createOrder } from '@/lib/database/orders';
import { createBagDelivery } from '@/lib/database/bag-deliveries';
import { getCustomerById } from '@/lib/database/customers';
import { getNextWeekdayOccurrences, addDays, toISODateString } from '@/lib/utils/date';
import { calculateBillingCostOre } from '@/lib/config/pricing';
import type {
  Subscription,
  SubscriptionPlan,
  Order,
  BagDelivery,
  PickupMethod,
} from '@/types/database';

export interface GeneratedOrders {
  orders: Order[];
  bagDelivery: BagDelivery | null;
}

/**
 * Calculate the number of orders to generate for a billing period
 */
function calculateOrderCount(
  billingPeriod: string,
  frequency: string
): number {
  if (billingPeriod === 'one_time') {
    return 1;
  }

  // Monthly billing
  switch (frequency) {
    case 'weekly':
      return 4;
    case 'biweekly':
      return 2;
    case 'monthly':
      return 1;
    default:
      return 1;
  }
}

export interface AddressData {
  street: string;
  postal_code: string;
  city: string;
  country: string;
  special_instructions?: string | null;
}

/**
 * Generate orders for a subscription after payment success
 *
 * @param subscription - The activated subscription
 * @param plan - The subscription plan
 * @param address - Customer's delivery address
 * @param pickupMethod - How the pickup should be done
 * @returns Generated orders and optional bag delivery
 */
export async function generateOrdersForSubscription(
  subscription: Subscription,
  plan: SubscriptionPlan,
  address: AddressData,
  pickupMethod: PickupMethod = 'home'
): Promise<GeneratedOrders> {
  const supabase = await createClient();

  // Get customer to check bag count
  const customer = await getCustomerById(subscription.customer_id);
  if (!customer) {
    throw new Error('Customer not found');
  }

  // Calculate number of orders
  const orderCount = calculateOrderCount(plan.billing_period, plan.frequency);

  // Calculate pickup dates
  let pickupDates: Date[];

  if (!subscription.recurring_weekday) {
    // If no recurring weekday (shouldn't happen for subscriptions), use next N days
    const startDate = new Date();
    pickupDates = [];
    for (let i = 1; i <= orderCount; i++) {
      pickupDates.push(addDays(startDate, i * 7));
    }
  } else {
    // Get next N occurrences of the recurring weekday
    const startDate = subscription.started_at
      ? new Date(subscription.started_at)
      : new Date();

    pickupDates = getNextWeekdayOccurrences(
      startDate,
      subscription.recurring_weekday,
      orderCount
    );
  }

  // Calculate total cost per order (same as billing cost for now)
  const orderCostOre = calculateBillingCostOre(plan.price_ore, {
    needsIroning: subscription.default_needs_ironing,
    delicateItemsCount: subscription.default_delicate_items_count,
    extraKg: subscription.default_extra_kg,
  });

  // For one-time subscriptions, cost is per order
  // For recurring, billing_cost_ore covers all orders in the period
  const perOrderCost = plan.billing_period === 'one_time'
    ? orderCostOre
    : Math.round(subscription.billing_cost_ore / orderCount);

  // Check if we need bag delivery
  let bagDelivery: BagDelivery | null = null;

  if (customer.laundry_bags_count === 0) {
    // Schedule bag delivery 1 day before first pickup
    const bagDeliveryDate = addDays(pickupDates[0], -1);

    bagDelivery = await createBagDelivery({
      customer_id: subscription.customer_id,
      delivery_street: address.street,
      delivery_postal_code: address.postal_code,
      delivery_city: address.city,
      delivery_country: address.country,
      delivery_special_instructions: address.special_instructions || null,
      scheduled_date: toISODateString(bagDeliveryDate),
      bag_quantity: 1,
    });
  }

  // Generate orders
  const orders: Order[] = [];

  for (let i = 0; i < pickupDates.length; i++) {
    const pickupDate = pickupDates[i];

    // Delivery is typically 2 days after pickup (can be configured)
    const deliveryDate = addDays(pickupDate, 2);

    const order = await createOrder({
      customer_id: subscription.customer_id,
      subscription_id: subscription.id,
      plan_id: plan.id,
      cleaner_id: subscription.assigned_cleaner_id,
      pickup_street: address.street,
      pickup_postal_code: address.postal_code,
      pickup_city: address.city,
      pickup_country: address.country,
      pickup_special_instructions: address.special_instructions || null,
      scheduled_date: toISODateString(pickupDate),
      delivery_date: toISODateString(deliveryDate),
      pickup_method: pickupMethod,
      extra_kg: subscription.default_extra_kg,
      delicate_items_count: subscription.default_delicate_items_count,
      needs_ironing: subscription.default_needs_ironing,
      total_cost_ore: perOrderCost,
      // Link first order to bag delivery if needed
      prerequisite_bag_delivery_id: i === 0 && bagDelivery ? bagDelivery.id : null,
    });

    if (order) {
      orders.push(order);
    }
  }

  return {
    orders,
    bagDelivery,
  };
}

/**
 * Get subscription with plan details
 */
export async function getSubscriptionWithPlan(
  subscriptionId: string
): Promise<{ subscription: Subscription; plan: SubscriptionPlan } | null> {
  const supabase = await createClient();

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single();

  if (subError || !subscription) {
    return null;
  }

  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', subscription.plan_id)
    .single();

  if (planError || !plan) {
    return null;
  }

  return { subscription, plan };
}
