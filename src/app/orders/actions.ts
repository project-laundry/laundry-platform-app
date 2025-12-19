"use server";

import { createClient } from "@/lib/supabase/server";
import { createSubscription, getActiveSubscriptionByCustomerId } from "@/lib/database/subscriptions";
import { getCustomerByUserId } from "@/lib/database/customers";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { createVippsAgreement } from "@/lib/payments/vipps/service";
import { getWeekdayFromDate } from "@/lib/utils/date";
import { translateFrequency } from "@/lib/utils/i18n";
import type {
  PickupMethod,
  Weekday,
  SubscriptionFrequency,
  SubscriptionOrderDefaults,
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
  pickupMethod: PickupMethod;
  pickupLocationDescription?: string;
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

  // Determine frequency (default to monthly if one-time or on_demand)
  const frequency: 'weekly' | 'biweekly' | 'monthly' =
    input.isRecurring && input.frequency && input.frequency !== 'on_demand'
      ? input.frequency
      : 'monthly';

  // Calculate recurring weekday
  const recurringWeekday = getWeekdayFromDate(input.firstPickupDate);

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
    pickup_method: input.pickupMethod,
    pickup_location_description: input.pickupLocationDescription,
    special_instructions: input.specialInstructions,
    location_city: input.location,
    default_needs_ironing: input.needsIroning,
    default_cleaner_id: cleaner?.id || null,
  };

  // Create subscription with all order defaults
  const subscription = await createSubscription({
    customer_id: customer.id,
    frequency,
    recurring_weekday: recurringWeekday,
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
