"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSubscription, getActiveSubscriptionByCustomerId, getSubscriptionById } from "@/lib/database/subscriptions";
import { createPaymentAgreement, getPaymentAgreementByProviderId } from "@/lib/database/payment-agreements";
import { getCustomerByUserId } from "@/lib/database/customers";
import { validatePromoCode } from "@/lib/database/promo-codes";
import { oreToNok } from "@/lib/config/pricing";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { createVippsAgreement } from "@/lib/payments/vipps/service";
import { isVippsTestEnvironment } from "@/lib/payments/vipps/config";
import { createVippsRecurringClient } from "@/lib/payments/vipps/recurring-client";
import { getWeekdayFromDate, isWeekdayInSchedule, addDays, toISODateString } from "@/lib/utils/date";
import { DAYS_PICKUP_TO_DELIVERY, MIN_DAYS_NOTICE } from "@/lib/config/order-timing";
import { translateFrequency } from "@/lib/utils/i18n";
import { getOrderWithDetailsByIdAndCustomerId, updateOrderStatus } from "@/lib/database/orders";
import { checkAndGenerateNextOrders } from "@/lib/services/order-generation";
import { cancelSubscriptionAction } from "@/app/dashboard/subscription/actions";
import { validatePostalCode } from "@/lib/validation/cleaner";
import type {
  Weekday,
  SubscriptionFrequency,
  SubscriptionOrderDefaults,
  OrderStatus,
  OrderPromo,
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
  promoCode?: string;
}

export interface CreateSubscriptionResult {
  redirectUrl?: string;
  agreementId?: string;
  error?: string;
  displayError?: string;
}

/**
 * Create a new order checkout with Vipps agreement
 * Called from the order confirmation page
 *
 * Flow:
 * 1. Create PaymentAgreement record (required for all checkouts)
 * 2. If recurring: create Subscription linked to PaymentAgreement
 * 3. If one-time: store order_defaults on PaymentAgreement.provider_metadata
 * 4. Create Vipps recurring agreement
 * 5. Return Vipps checkout URL for user to approve
 * 6. Webhook activates agreement and creates orders
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

  // Validate promo code (if provided) and lock its discount terms.
  // Re-validated server-side here even though the UI validates inline — never trust the client.
  let promoSnapshot: OrderPromo | null = null;
  if (input.promoCode?.trim()) {
    const promoResult = await validatePromoCode(input.promoCode, customer.id);
    if (!promoResult.valid || !promoResult.promo) {
      return {
        displayError: promoResult.error || "Ugyldig rabattkode",
        error: "Invalid promo code",
      };
    }
    promoSnapshot = promoResult.promo;
  }

  // Determine the subscription frequency
  // - For recurring orders: use the selected frequency
  // - For single orders: 'on_demand' (no subscription created)
  const frequency: SubscriptionFrequency = input.isRecurring && input.frequency
    ? input.frequency
    : 'on_demand';

  const isRecurring = frequency !== 'on_demand';

  // Only check for existing active subscription for recurring orders
  if (isRecurring) {
    const existingSubscription = await getActiveSubscriptionByCustomerId(customer.id);
    if (existingSubscription) {
      return { displayError: "Du har allerede et aktivt abonnement", error: "Customer already has an active subscription" };
    }
  }

  // For Vipps agreement, we need a billing interval
  // 'on_demand' (single orders) uses 'monthly' as Vipps requires an interval
  const vippsFrequency: 'weekly' | 'biweekly' | 'monthly' =
    frequency === 'on_demand' ? 'monthly' : frequency;

  // Find available cleaner
  const cleaner = await findAvailableCleaner(
    input.location,
    new Date(input.firstPickupDate),
  );

  // Create Vipps FLEXIBLE agreement (NO price parameter)
  const frequencyNorwegian = translateFrequency(frequency);

  const agreementResponse = await createVippsAgreement({
    productName: `NooraCare - Vask`,
    productDescription: `${frequencyNorwegian} henting i ${input.location}`,
    frequency: vippsFrequency, // Vipps requires a billing interval
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

  // Build payment agreement metadata.
  // - one-time orders: store order_defaults here (no subscription to hold them)
  // - promo snapshot (if any): stored here so the discount survives until first-order generation
  const providerMetadata: Record<string, unknown> = {};
  if (!isRecurring) {
    providerMetadata.order_defaults = orderDefaults;
  }
  if (promoSnapshot) {
    providerMetadata.promo = promoSnapshot;
  }

  // 1. Create PaymentAgreement (required for all checkouts)
  const paymentAgreement = await createPaymentAgreement({
    customer_id: customer.id,
    provider_agreement_id: agreementResponse.agreementId,
    provider_metadata: Object.keys(providerMetadata).length > 0 ? providerMetadata : null,
  });

  if (!paymentAgreement) {
    return { error: "Failed to create payment agreement" };
  }

  // 2. If recurring: create Subscription linked to PaymentAgreement
  if (isRecurring) {
    const subscription = await createSubscription({
      customer_id: customer.id,
      frequency,
      payment_agreement_id: paymentAgreement.id,
      order_defaults: orderDefaults,
    });

    if (!subscription) {
      return { error: "Failed to create subscription" };
    }
  }

  return {
    redirectUrl: agreementResponse.vippsConfirmationUrl,
    agreementId: agreementResponse.agreementId,
  };
}

export interface ValidatePromoCodeResult {
  valid: boolean;
  error?: string;
  discountLabel?: string; // e.g. "20% rabatt" or "100 kr rabatt"
}

/**
 * Validate a promo code for the current customer (inline check on the confirm page).
 * This is advisory UX only — createSubscriptionAction re-validates server-side at checkout.
 */
export async function validatePromoCodeAction(
  code: string,
): Promise<ValidatePromoCodeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { valid: false, error: "Ikke autentisert" };
  }

  const customer = await getCustomerByUserId(user.id);
  if (!customer) {
    return { valid: false, error: "Fant ikke kunde" };
  }

  const result = await validatePromoCode(code, customer.id);
  if (!result.valid || !result.promo) {
    return { valid: false, error: result.error };
  }

  const discountLabel =
    result.promo.discount_type === "percentage"
      ? `${result.promo.discount_value}% rabatt`
      : `${oreToNok(result.promo.discount_value)} kr rabatt`;

  return { valid: true, discountLabel };
}

/**
 * Force accept a Vipps agreement (TEST ENVIRONMENT ONLY)
 * Bypasses manual approval in Vipps app for testing purposes
 *
 * Flow:
 * 1. Validates test environment
 * 2. Gets user phone number from auth metadata
 * 3. Calls Vipps forceAcceptAgreement API
 * 4. Polls subscription status until webhook activates it
 * 5. Returns success or error
 *
 * @param agreementId - The Vipps agreement ID to force accept
 * @returns { success: boolean, error?: string }
 */
export async function forceAcceptAgreementAction(
  agreementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate test environment
    if (!isVippsTestEnvironment()) {
      return {
        success: false,
        error: 'Auto-godkjenning er kun tilgjengelig i testmiljø',
      };
    }

    // 2. Get authenticated user and phone number from users table
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return {
        success: false,
        error: 'Ikke autentisert',
      };
    }

    // Fetch phone number from users table
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('phone')
      .eq('id', authUser.id)
      .single();

    if (userError || !dbUser?.phone) {
      return {
        success: false,
        error: 'Telefonnummer mangler. Vennligst oppdater profilen din.',
      };
    }

    const phoneNumber = dbUser.phone;

    // Format phone number: Remove +47 prefix (Vipps expects format: 4712345678)
    const formattedPhone = phoneNumber.replace(/^\+/, '');

    // 3. Get payment agreement to verify ownership
    const paymentAgreement = await getPaymentAgreementByProviderId(agreementId);
    if (!paymentAgreement) {
      return {
        success: false,
        error: 'Avtale ikke funnet',
      };
    }

    // Verify customer ownership
    const customer = await getCustomerByUserId(authUser.id);
    if (!customer || customer.id !== paymentAgreement.customer_id) {
      return {
        success: false,
        error: 'Ikke autorisert',
      };
    }

    // 4. Call Vipps forceAcceptAgreement API
    const vippsClient = createVippsRecurringClient();
    await vippsClient.forceAcceptAgreement(agreementId, formattedPhone);

    // 5. Poll payment agreement status until active (max 30 seconds)
    const maxAttempts = 30;
    const delayMs = 1000; // 1 second between attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wait before checking (except first attempt)
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // Check payment agreement status
      const updatedAgreement = await getPaymentAgreementByProviderId(agreementId);
      if (updatedAgreement?.status === 'active') {
        return {
          success: true,
        };
      }
    }

    // Timeout - webhook didn't activate subscription in time
    return {
      success: false,
      error: 'Avtalen ble godkjent, men aktivering tok for lang tid. Sjekk abonnementsstatus i dashboard.',
    };
  } catch (error) {
    console.error('Force accept agreement failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'En feil oppstod',
    };
  }
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

export interface CancelOrderResult {
  success: boolean;
  error?: string;
  nextOrderId?: string;
}

/**
 * Update special instructions for an order
 * Customer can only update before pickup (pending_assignment, pickup_scheduled)
 */
export async function updateOrderSpecialInstructionsAction(
  orderId: string,
  specialInstructions: string
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        error: 'Kan ikke redigere instruksjoner etter henting'
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('orders')
      .update({ special_instructions: specialInstructions || null })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating special instructions:', error);
      return { success: false, error: 'Failed to update instructions' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating special instructions:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Update ironing preference for an order
 * Customer can only update before pickup (pending_assignment, pickup_scheduled)
 */
export async function updateOrderIroningAction(
  orderId: string,
  needsIroning: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        error: 'Kan ikke endre stryking etter henting'
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('orders')
      .update({ needs_ironing: needsIroning })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating ironing preference:', error);
      return { success: false, error: 'Failed to update ironing preference' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating ironing preference:', error);
    return { success: false, error: 'An error occurred' };
  }
}

export interface UpdateOrderAddressInput {
  street: string;
  postalCode: string;
  city: string;
  specialInstructionsAddress?: string | null;
}

/**
 * Update address and address-specific instructions for an order
 * Customer can only update before pickup (pending_assignment, pickup_scheduled)
 */
export async function updateOrderAddressAction(
  orderId: string,
  addressData: UpdateOrderAddressInput
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        error: 'Kan ikke endre adresse etter henting'
      };
    }

    // Validate street
    const trimmedStreet = addressData.street.trim();
    if (!trimmedStreet || trimmedStreet.length < 3) {
      return { success: false, error: 'Gateadresse må være minst 3 tegn' };
    }
    if (trimmedStreet.length > 200) {
      return { success: false, error: 'Gateadresse kan ikke være mer enn 200 tegn' };
    }

    // Validate postal code
    if (!validatePostalCode(addressData.postalCode)) {
      return { success: false, error: 'Postnummer må være 4 siffer' };
    }

    // Validate city
    if (!['Bergen', 'Oslo'].includes(addressData.city)) {
      return { success: false, error: 'By må være Bergen eller Oslo' };
    }

    // Validate address instructions (optional)
    if (addressData.specialInstructionsAddress && addressData.specialInstructionsAddress.length > 500) {
      return { success: false, error: 'Adresseinstruksjoner kan ikke være mer enn 500 tegn' };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('orders')
      .update({
        street: trimmedStreet,
        postal_code: addressData.postalCode,
        city: addressData.city,
        special_instructions_address: addressData.specialInstructionsAddress || null,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating address:', error);
      return { success: false, error: 'Failed to update address' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating address:', error);
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Cancel an order - customer can only cancel before pickup
 * Allowed statuses: pending_assignment, pickup_scheduled
 *
 * @param orderId - The order ID to cancel
 * @param alsoCancelSubscription - If true, also cancel the subscription (stops all future orders + Vipps agreement)
 */
export async function cancelOrderAction(
  orderId: string,
  alsoCancelSubscription: boolean = false
): Promise<CancelOrderResult> {
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

    // Verify it's more than 24 hours before pickup
    const now = new Date();
    const pickupDate = new Date(order.scheduled_date);
    const hoursUntilPickup = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilPickup <= 24) {
      return {
        success: false,
        error: 'Kan ikke kansellere ordre mindre enn 24 timer før henting'
      };
    }

    const cancelled = await updateOrderStatus(orderId, 'cancelled');
    if (!cancelled) {
      return { success: false, error: 'Failed to cancel order' };
    }

    // If user wants to cancel subscription along with order
    if (alsoCancelSubscription && order.subscription_id) {
      const result = await cancelSubscriptionAction(order.subscription_id);
      return result;
    }

    // If order belongs to active subscription, generate next order to maintain rolling window
    let nextOrderId: string | undefined;
    if (order.subscription_id) {
      const subscription = await getSubscriptionById(order.subscription_id);
      if (subscription && subscription.status === 'active') {
        try {
          await checkAndGenerateNextOrders(order.subscription_id);

          // Query for the newly created order
          const adminClient = createAdminClient();
          const { data: nextOrder } = await adminClient
            .from('orders')
            .select('id')
            .eq('subscription_id', order.subscription_id)
            .not('status', 'in', '(completed,cancelled)')
            .order('scheduled_date', { ascending: true })
            .limit(1)
            .single();

          if (nextOrder) {
            nextOrderId = nextOrder.id;
          }
        } catch (genError) {
          console.error('Error generating next order after cancellation:', genError);
          // Don't fail the cancellation if next order generation fails
        }
      }
    }

    return { success: true, nextOrderId };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return { success: false, error: 'An error occurred while cancelling order' };
  }
}

export interface UpdatePickupDateResult {
  success: boolean;
  error?: string;
  newPickupDate?: string;
  newDeliveryDate?: string;
  cleanerChanged?: boolean;
  newCleanerName?: string;
}

/**
 * Update pickup date for an order
 * Customer can only update before pickup (pending_assignment, pickup_scheduled)
 * Automatically updates delivery date (pickup + 2 days)
 * Smart cleaner reassignment: keeps cleaner if they work on new day, otherwise finds new cleaner
 */
export async function updateOrderPickupDateAction(
  orderId: string,
  newPickupDate: string
): Promise<UpdatePickupDateResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Verify order status is editable
    const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        error: 'Kan ikke endre hentedato etter at ordren er hentet'
      };
    }

    // Validate new date is at least MIN_DAYS_NOTICE days in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + MIN_DAYS_NOTICE);
    const pickupDate = new Date(newPickupDate);

    if (pickupDate < minDate) {
      return {
        success: false,
        error: `Hentedato må være minst ${MIN_DAYS_NOTICE} dager frem i tid`
      };
    }

    // Validate weekday has cleaner availability in order's city
    const newWeekday = getWeekdayFromDate(newPickupDate);
    const availableWeekdays = await getAvailableWeekdaysForCity(order.city);

    if (!availableWeekdays.includes(newWeekday)) {
      return {
        success: false,
        error: 'Ingen rensere tilgjengelig på denne dagen'
      };
    }

    // Calculate new delivery date
    const newDeliveryDate = toISODateString(addDays(pickupDate, DAYS_PICKUP_TO_DELIVERY));

    // Smart cleaner reassignment
    const adminClient = createAdminClient();
    let newCleanerId = order.assigned_cleaner_id;
    let cleanerChanged = false;
    let newCleanerName: string | undefined;

    if (order.assigned_cleaner_id) {
      // Check if current cleaner works on new weekday
      const { data: currentCleaner } = await adminClient
        .from('cleaners')
        .select('id, display_name, weekly_schedule')
        .eq('id', order.assigned_cleaner_id)
        .single();

      if (currentCleaner) {
        const cleanerWorksOnNewDay = isWeekdayInSchedule(currentCleaner.weekly_schedule, newWeekday);

        if (!cleanerWorksOnNewDay) {
          // Find new cleaner
          const newCleaner = await findAvailableCleaner(order.city, pickupDate);
          if (!newCleaner) {
            return {
              success: false,
              error: 'Ingen rensere tilgjengelig på denne dagen. Vennligst velg en annen dato.'
            };
          }
          newCleanerId = newCleaner.id;
          cleanerChanged = true;
          newCleanerName = newCleaner.display_name;
        }
      }
    }

    // Update order
    const { error } = await adminClient
      .from('orders')
      .update({
        scheduled_date: newPickupDate,
        delivery_date: newDeliveryDate,
        assigned_cleaner_id: newCleanerId,
      })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating pickup date:', error);
      return { success: false, error: 'Kunne ikke oppdatere hentedato' };
    }

    return {
      success: true,
      newPickupDate,
      newDeliveryDate,
      cleanerChanged,
      newCleanerName,
    };
  } catch (error) {
    console.error('Error updating pickup date:', error);
    return { success: false, error: 'En feil oppstod' };
  }
}
