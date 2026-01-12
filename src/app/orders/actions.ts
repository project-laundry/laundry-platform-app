"use server";

import { createClient } from "@/lib/supabase/server";
import { createSubscription, getActiveSubscriptionByCustomerId, getSubscriptionById } from "@/lib/database/subscriptions";
import { getCustomerByUserId } from "@/lib/database/customers";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { createVippsAgreement } from "@/lib/payments/vipps/service";
import { getWeekdayFromDate } from "@/lib/utils/date";
import { translateFrequency } from "@/lib/utils/i18n";
import { getOrderWithDetailsByIdAndCustomerId, updateOrderStatus } from "@/lib/database/orders";
import { checkAndGenerateNextOrders } from "@/lib/services/order-generation";
import { cancelSubscriptionAction } from "@/app/dashboard/subscription/actions";
import type {
  Weekday,
  SubscriptionFrequency,
  SubscriptionOrderDefaults,
  OrderStatus,
} from "@/types/database";

export interface CreateSubscriptionInput {
  location: 'Bergen' | 'Oslo';
  needsIroning: boolean; // Default preference for all orders
  isRecurring: boolean;
  frequency?: SubscriptionFrequency;
  firstPickupDate: string; // ISO date
  pickupAddress: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
    specialInstructions?: string;
  };
  specialInstructions?: string;
}

export interface CreateSubscriptionResult {
  redirectUrl?: string;
  error?: string;
  displayError?: string;
}

/**
 * Create a new subscription with Vipps agreement
 * Called from the order confirmation page
 *
 * Flow:
 * 1. Create subscription record in database
 * 2. Create Vipps recurring agreement
 * 3. Return Vipps checkout URL for user to approve
 * 4. User redirects to Vipps, approves, then redirects to /orders/success
 * 5. Webhook activates subscription when agreement approved
 */
export async function createSubscriptionAction(
  input: CreateSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get customer record
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    return { error: "Customer not found" };
  }

  // Check if customer already has an active subscription
  const existingSubscription = await getActiveSubscriptionByCustomerId(customer.id);
  if (existingSubscription) {
    return { displayError: "Du har allerede et aktivt abonnement", error: "Customer already has an active subscription" };
  }

  const frequency: 'weekly' | 'biweekly' | 'monthly' =
    input.isRecurring && input.frequency && input.frequency !== 'on_demand'
      ? input.frequency
      : 'monthly';

  // Find available cleaner
  const cleaner = await findAvailableCleaner(
    input.location,
    new Date(input.firstPickupDate),
  );

  // Create Vipps FLEXIBLE agreement (NO price parameter)
  const ironingSuffix = input.needsIroning ? ' + Stryking' : '';
  const frequencyNorwegian = translateFrequency(frequency);

  const agreementResponse = await createVippsAgreement({
    productName: `NooraCare - Vask${ironingSuffix}`,
    productDescription: `${frequencyNorwegian} henting i ${input.location}`,
    frequency,
  });

  // Build complete order defaults object
  const orderDefaults: SubscriptionOrderDefaults = {
    initial_address: {
      street: input.pickupAddress.street,
      postal_code: input.pickupAddress.postalCode,
      city: input.pickupAddress.city,
      country: input.pickupAddress.country,
      special_instructions: input.pickupAddress.specialInstructions,
    },
    special_instructions: input.specialInstructions,
    location_city: input.location,
    default_needs_ironing: input.needsIroning,
    default_cleaner_id: cleaner?.id || null,
    first_pickup_date: input.firstPickupDate,
  };

  // Create subscription with all order defaults
  const subscription = await createSubscription({
    customer_id: customer.id,
    frequency,
    provider_agreement_id: agreementResponse.agreementId,
    order_defaults: orderDefaults,
  });

  if (!subscription) {
    return { error: "Failed to create subscription" };
  }

  return {
    redirectUrl: agreementResponse.vippsConfirmationUrl,
  };
}

/**
 * Get available weekdays for a city based on cleaner availability
 */
export async function getAvailableWeekdaysAction(
  city: string,
): Promise<Weekday[]> {
  return getAvailableWeekdaysForCity(city);
}

export interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Cancel an order - customer can only cancel before pickup
 * Allowed statuses: pending_assignment, pickup_scheduled
 *
 * @param orderId - The order ID to cancel
 * @param alsoCancel Subscription - If true, also cancel the subscription (stops all future orders + Vipps agreement)
 */
export async function cancelOrderAction(
  orderId: string,
  alsoCancelSubscription: boolean = false
): Promise<ActionResult> {
  try {
    // Get current user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get customer
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Get order and verify ownership
    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify order status is cancellable
    const cancellableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!cancellableStatuses.includes(order.status)) {
      return {
        success: false,
        error: `Kan ikke kansellere ordre med status: ${order.status}`
      };
    }

    // If user wants to cancel subscription along with order
    if (alsoCancelSubscription && order.subscription_id) {
      const result = await cancelSubscriptionAction(order.subscription_id);
      return result;
    }

    // Otherwise, cancel order only
    const cancelled = await updateOrderStatus(orderId, 'cancelled');
    if (!cancelled) {
      return { success: false, error: 'Failed to cancel order' };
    }

    // If order belongs to active subscription, generate next order to maintain rolling window
    if (order.subscription_id) {
      const subscription = await getSubscriptionById(order.subscription_id);
      if (subscription && subscription.status === 'active') {
        try {
          await checkAndGenerateNextOrders(order.subscription_id);
        } catch (genError) {
          console.error('Error generating next order after cancellation:', genError);
          // Don't fail the cancellation if next order generation fails
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return { success: false, error: 'An error occurred while cancelling order' };
  }
}
