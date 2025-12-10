'use server';

import { createClient } from '@/lib/supabase/server';
import { createSubscription } from '@/lib/database/subscriptions';
import { createPayment } from '@/lib/database/payments';
import { getSubscriptionPlanBySlug } from '@/lib/database/subscriptions';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getAvailableWeekdaysForCity } from '@/lib/database/cleaners';
import { calculateBillingCostOre } from '@/lib/config/pricing';
import { createVippsAgreementForSubscription } from '@/lib/payments/vipps/service';
import { updateSubscriptionVippsAgreement } from '@/lib/database/subscriptions';
import { updatePaymentWithMetadata } from '@/lib/database/payments';
import type { Weekday, PickupMethod, Customer, VippsAgreementMetadata } from '@/types/database';

export interface CreateSubscriptionInput {
  planSlug: string;
  recurringWeekday: Weekday;
  pickupMethod: PickupMethod;
  pickupLocationDescription?: string;
  specialInstructions?: string;
  // Delivery address
  deliveryStreet: string;
  deliveryPostalCode: string;
  deliveryCity: string;
  deliveryCountry: string;
  deliverySpecialInstructions?: string;
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
    delivery_street: input.deliveryStreet,
    delivery_postal_code: input.deliveryPostalCode,
    delivery_city: input.deliveryCity,
    delivery_country: input.deliveryCountry,
    delivery_special_instructions: input.deliverySpecialInstructions,
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

/**
 * Get available weekdays for a city based on cleaner availability
 */
export async function getAvailableWeekdaysAction(city: string): Promise<Weekday[]> {
  return getAvailableWeekdaysForCity(city);
}

/**
 * Get subscription plan by slug
 */
export async function getSubscriptionPlanBySlugAction(slug: string) {
  return getSubscriptionPlanBySlug(slug);
}

export interface CreateVippsAgreementResult {
  success: boolean;
  agreementId?: string;
  checkoutUrl?: string;
  paymentId?: string;
  error?: string;
}

/**
 * Create Vipps recurring agreement for a subscription
 * Called from the order confirmation page after subscription is created
 */
export async function createVippsAgreementAction(
  subscriptionId: string
): Promise<CreateVippsAgreementResult> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Create Vipps agreement
    const result = await createVippsAgreementForSubscription(subscriptionId);

    // Update subscription with agreement metadata
    const agreementMetadata: VippsAgreementMetadata = {
      vipps_agreement_id: result.agreementId,
      vipps_checkout_url: result.checkoutUrl,
      agreement_status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    await updateSubscriptionVippsAgreement(
      subscriptionId,
      result.agreementId,
      agreementMetadata
    );

    // Update payment with initial metadata
    await updatePaymentWithMetadata(
      result.paymentId,
      result.agreementId,
      {
        vipps_agreement_id: result.agreementId,
        vipps_checkout_url: result.checkoutUrl,
      }
    );

    // Return success with checkout URL
    return {
      success: true,
      agreementId: result.agreementId,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.paymentId,
    };
  } catch (error) {
    console.error('Vipps agreement creation error:', error);

    // Return user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to create Vipps agreement';

    return {
      success: false,
      error: errorMessage,
    };
  }
}
