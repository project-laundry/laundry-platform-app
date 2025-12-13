"use server";

import { createClient } from "@/lib/supabase/server";
import { createSubscription, getActiveSubscriptionByCustomerId } from "@/lib/database/subscriptions";
import { createPayment } from "@/lib/database/payments";
import { getSubscriptionPlanBySlug } from "@/lib/database/subscriptions";
import { getCustomerByUserId } from "@/lib/database/customers";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { calculateBillingCostOre } from "@/lib/config/pricing";
import { createVippsAgreement, createVippsEPayment } from "@/lib/payments/vipps/service";
import { createOrder } from "@/lib/database/orders";
import { createBagDelivery } from "@/lib/database/bag-deliveries";
import { addDays, toISODateString, getWeekdayFromDate } from "@/lib/utils/date";
import type {
  PickupMethod,  
  Weekday,
} from "@/types/database";
import { Plan } from "@/types/order-flow";

export interface CreateSubscriptionInput {
  planSlug: Plan;
  firstPickupDate: string;  
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
  redirectUrl?: string;
  error?: string;
  displayError?: string;
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

  // Get subscription plan
  const plan = await getSubscriptionPlanBySlug(input.planSlug);
  if (!plan) {
    return { error: "Plan not found" };
  }

  // Calculate billing cost
  const billingCostOre = calculateBillingCostOre(plan.price_ore, {
    needsIroning: input.needsIroning,
    delicateItemsCount: input.delicateItemsCount,
    extraKg: input.extraKg,
  });

  const agreementResponse = await createVippsAgreement({
    price: billingCostOre,
    productName: `${plan.name}`,
    productDescription: `Abonnement på ${plan.name}`
  });

  const recurringWeekday = getWeekdayFromDate(input.firstPickupDate);

  // Find available cleaner
  const cleaner = await findAvailableCleaner(
    input.deliveryCity,
    new Date(input.firstPickupDate),
  );

  // Create subscription
  const subscription = await createSubscription({
    customer_id: customer.id,
    plan_id: plan.id,
    assigned_cleaner_id: cleaner?.id,
    default_extra_kg: input.extraKg || 0,
    default_needs_ironing: input.needsIroning || false,
    default_delicate_items_count: input.delicateItemsCount || 0,
    recurring_weekday: recurringWeekday,
    delivery_street: input.deliveryStreet,
    delivery_postal_code: input.deliveryPostalCode,
    delivery_city: input.deliveryCity,
    delivery_country: input.deliveryCountry,
    delivery_special_instructions: input.deliverySpecialInstructions,
    billing_cost_ore: billingCostOre,
    provider_agreement_id: agreementResponse.agreementId,
  });

  if (!subscription) {
    return { error: "Failed to create subscription" };
  }
  
  const payment = await createPayment({
    customer_id: customer.id,
    subscription_id: subscription.id,
    payment_type: "recurring",
    amount_ore: billingCostOre,
    payment_provider: input.paymentProvider,
    provider_metadata: {
      vipps_agreement_id: agreementResponse.agreementId,
      vipps_charge_id: agreementResponse.chargeId,
    }
  });

  if (!payment) {
    return { error: "Failed to create payment" };
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
  
  const scheduledDate = new Date(input.scheduledDate);

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

  // Calculate delivery date (3 days after pickup)
  const deliveryDate = addDays(scheduledDate, 3);

  // Find available cleaner
  const cleaner = await findAvailableCleaner(
    input.deliveryCity,
    scheduledDate,
  );

  // Calculate order cost
  const totalCostOre = calculateBillingCostOre(plan.price_ore, {
    needsIroning: input.needsIroning,
    delicateItemsCount: input.delicateItemsCount,
    extraKg: input.extraKg,
  });

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
