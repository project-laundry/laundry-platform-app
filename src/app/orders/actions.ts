'use server';

import { createClient } from '@/lib/supabase/server';
import { createSubscription } from '@/lib/database/subscriptions';
import { createPayment } from '@/lib/database/payments';
import { getSubscriptionPlanBySlug } from '@/lib/database/subscriptions';
import { getCustomerByUserId } from '@/lib/database/customers';
import { calculateBillingCostOre } from '@/lib/config/pricing';
import type { Weekday, PickupMethod, Customer } from '@/types/database';

export interface CreateSubscriptionInput {
  planSlug: string;
  recurringWeekday: Weekday;
  pickupMethod: PickupMethod;
  pickupLocationDescription?: string;
  specialInstructions?: string;
  // Add-ons
  extraKg?: number;
  needsIroning?: boolean;
  delicateItemsCount?: number;
}

export interface CreateSubscriptionResult {
  success: boolean;
  subscriptionId?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Create a new subscription with pending payment
 * Called from the order confirmation page
 */
export async function createSubscriptionAction(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get customer record
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  // Get subscription plan
  const plan = await getSubscriptionPlanBySlug(input.planSlug);
  if (!plan) {
    return { success: false, error: 'Plan not found' };
  }

  // Calculate billing cost
  const billingCostOre = calculateBillingCostOre(plan.price_ore, {
    needsIroning: input.needsIroning,
    delicateItemsCount: input.delicateItemsCount,
    extraKg: input.extraKg,
  });

  // Create subscription
  const subscription = await createSubscription({
    customer_id: customer.id,
    plan_id: plan.id,
    default_extra_kg: input.extraKg || 0,
    default_needs_ironing: input.needsIroning || false,
    default_delicate_items_count: input.delicateItemsCount || 0,
    recurring_weekday: input.recurringWeekday,
    billing_cost_ore: billingCostOre,
  });

  if (!subscription) {
    return { success: false, error: 'Failed to create subscription' };
  }

  // Create payment record
  const paymentType = plan.billing_period === 'one_time' ? 'one_time' : 'recurring';
  const payment = await createPayment({
    customer_id: customer.id,
    subscription_id: subscription.id,
    payment_type: paymentType,
    amount_ore: billingCostOre,
    payment_provider: 'manual', // Mock payment for now
  });

  if (!payment) {
    return { success: false, error: 'Failed to create payment' };
  }

  return {
    success: true,
    subscriptionId: subscription.id,
    paymentId: payment.id,
  };
}

/**
 * Get the current user's customer data
 */
export async function getCurrentCustomerAction(): Promise<Customer | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return getCustomerByUserId(user.id);
}
