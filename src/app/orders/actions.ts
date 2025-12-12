"use server";

import { createClient } from "@/lib/supabase/server";
import { createSubscription } from "@/lib/database/subscriptions";
import { createPayment } from "@/lib/database/payments";
import { getSubscriptionPlanBySlug } from "@/lib/database/subscriptions";
import { getCustomerByUserId } from "@/lib/database/customers";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { calculateBillingCostOre } from "@/lib/config/pricing";
import { createVippsAgreementForSubscription, createVippsEPayment } from "@/lib/payments/vipps/service";
import { updateSubscriptionVippsAgreement } from "@/lib/database/subscriptions";
import { updatePaymentWithMetadata } from "@/lib/database/payments";
import { createOrder } from "@/lib/database/orders";
import { createBagDelivery } from "@/lib/database/bag-deliveries";
import { addDays, toISODateString } from "@/lib/utils/date";
import type {
  Customer,
  PickupMethod,
  VippsAgreementMetadata,
  Weekday,
} from "@/types/database";
import { Plan } from "@/types/order-flow";

export interface CreateSubscriptionInput {
  planSlug: Plan;
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
  // Payment
  paymentProvider?: "manual" | "vipps";
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
  input: CreateSubscriptionInput,
): Promise<CreateSubscriptionResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get customer record
  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    return { success: false, error: "Customer not found" };
  }

  // Get subscription plan
  const plan = await getSubscriptionPlanBySlug(input.planSlug);
  if (!plan) {
    return { success: false, error: "Plan not found" };
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
    return { success: false, error: "Failed to create subscription" };
  }

  // Create payment record
  const paymentType = plan.billing_period === "one_time"
    ? "one_time"
    : "recurring";
  const payment = await createPayment({
    customer_id: customer.id,
    subscription_id: subscription.id,
    payment_type: paymentType,
    amount_ore: billingCostOre,
    payment_provider: input.paymentProvider || "manual",
  });

  if (!payment) {
    return { success: false, error: "Failed to create payment" };
  }

  return {
    success: true,
    subscriptionId: subscription.id,
    paymentId: payment.id,
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
  subscriptionId: string,
): Promise<CreateVippsAgreementResult> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Create Vipps agreement
    const result = await createVippsAgreementForSubscription(subscriptionId);

    // Update subscription with agreement metadata
    const agreementMetadata: VippsAgreementMetadata = {
      vipps_agreement_id: result.agreementId,
      vipps_checkout_url: result.checkoutUrl,
      agreement_status: "PENDING",
      created_at: new Date().toISOString(),
    };

    await updateSubscriptionVippsAgreement(
      subscriptionId,
      result.agreementId,
      agreementMetadata,
    );

    // Update payment with initial metadata
    await updatePaymentWithMetadata(
      result.paymentId,
      result.agreementId,
      {
        vipps_agreement_id: result.agreementId,
        vipps_checkout_url: result.checkoutUrl,
      },
    );

    // Return success with checkout URL
    return {
      success: true,
      agreementId: result.agreementId,
      checkoutUrl: result.checkoutUrl,
      paymentId: result.paymentId,
    };
  } catch (error) {
    console.error("Vipps agreement creation error:", error);

    // Return user-friendly error message
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to create Vipps agreement";

    return {
      success: false,
      error: errorMessage,
    };
  }
}

export interface CreateStandaloneOrderInput {
  planSlug: Plan;
  scheduledDate: string; // ISO date string
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
  // Payment
  paymentProvider?: "manual" | "vipps";
}

export interface CreateStandaloneOrderResult {  
  error?: string;
  redirectUrl?: string;
}

/**
 * Create a standalone order with pending_payment status
 * Called from the order confirmation page for one-time orders
 * Initiates a payment record linked to the order
 */
export async function createStandaloneOrderAction(
  input: CreateStandaloneOrderInput,
): Promise<CreateStandaloneOrderResult> {
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

  // Get subscription plan
  const plan = await getSubscriptionPlanBySlug(input.planSlug);
  if (!plan) {
    return { error: "Plan not found" };
  }

  // Verify this is a one-time plan
  if (plan.billing_period !== "one_time") {
    return { error: "This action is only for one-time plans" };
  }

  // Calculate order cost
  const totalCostOre = calculateBillingCostOre(plan.price_ore, {
    needsIroning: input.needsIroning,
    delicateItemsCount: input.delicateItemsCount,
    extraKg: input.extraKg,
  });

  // Get weekday from scheduled date for cleaner matching
  const scheduledDate = new Date(input.scheduledDate);
  const weekdays: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const pickupWeekday = weekdays[scheduledDate.getDay()];

  // Calculate delivery date (3 days after pickup)
  const deliveryDate = addDays(scheduledDate, 3);

  // Find available cleaner
  const cleaner = await findAvailableCleaner(
    input.deliveryCity,
    pickupWeekday,
  );

  // Handle bag delivery if customer doesn't have a bag
  let bagDeliveryId: string | null = null;
  if (customer.laundry_bags_count === 0) {
    // Create bag delivery 1 day before pickup
    const bagDeliveryDate = addDays(scheduledDate, -1);

    try {
      const bagDelivery = await createBagDelivery({
        customer_id: customer.id,
        delivery_street: input.deliveryStreet,
        delivery_postal_code: input.deliveryPostalCode,
        delivery_city: input.deliveryCity,
        delivery_country: input.deliveryCountry,
        delivery_special_instructions: input.deliverySpecialInstructions ||
          null,
        scheduled_date: toISODateString(bagDeliveryDate),
        bag_quantity: 1,
      });

      if (bagDelivery) {
        bagDeliveryId = bagDelivery.id;
      }
    } catch (error) {
      console.error("Bag delivery creation error:", error);
      return { error: "Failed to create bag delivery" };
    }
  }

  // Create order with pending_payment status
  const order = await createOrder({
    customer_id: customer.id,
    subscription_id: null, // No subscription for standalone orders
    plan_id: plan.id,
    cleaner_id: cleaner?.id || null,
    pickup_street: input.deliveryStreet,
    pickup_postal_code: input.deliveryPostalCode,
    pickup_city: input.deliveryCity,
    pickup_country: input.deliveryCountry,
    pickup_special_instructions: input.deliverySpecialInstructions || null,
    scheduled_date: toISODateString(scheduledDate),
    delivery_date: toISODateString(deliveryDate),
    pickup_method: input.pickupMethod,
    pickup_location_description: input.pickupLocationDescription || null,
    special_instructions: input.specialInstructions || null,
    extra_kg: input.extraKg || 0,
    delicate_items_count: input.delicateItemsCount || 0,
    needs_ironing: input.needsIroning || false,
    total_cost_ore: totalCostOre,
    prerequisite_bag_delivery_id: bagDeliveryId,
    status: "pending_payment", // Order awaiting payment
  });

  if (!order) {
    return { error: "Failed to create order" };
  }

  const vippsPaymentResult = await createVippsEPayment(order.id, order.order_number, totalCostOre);

  // Create payment record linked to order
  const payment = await createPayment({
    customer_id: customer.id,
    order_id: order.id,
    subscription_id: null,
    payment_type: "one_time",
    amount_ore: totalCostOre,
    payment_provider: input.paymentProvider,
    provider_reference: order.order_number,
  });

  if (!payment) {
    return { error: "Failed to create payment" };
  }

  return {    
    redirectUrl: vippsPaymentResult.redirectUrl,
  };
}

// =============================================================================
// VIPPS EPAYMENT (ONE-TIME PAYMENTS)
// =============================================================================

export interface CreateVippsPaymentResult {
  success: boolean;
  reference?: string;
  checkoutUrl?: string;
  paymentId?: string;
  error?: string;
}
