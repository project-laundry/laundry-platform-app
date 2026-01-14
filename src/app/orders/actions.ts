"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSubscription, getActiveSubscriptionByCustomerId, getSubscriptionById, getSubscriptionByAgreementId } from "@/lib/database/subscriptions";
import { getCustomerByUserId } from "@/lib/database/customers";
import {
  findAvailableCleaner,
  getAvailableWeekdaysForCity,
} from "@/lib/database/cleaners";
import { createVippsAgreement } from "@/lib/payments/vipps/service";
import { isVippsTestEnvironment } from "@/lib/payments/vipps/config";
import { createVippsRecurringClient } from "@/lib/payments/vipps/recurring-client";
import { getWeekdayFromDate } from "@/lib/utils/date";
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
  agreementId?: string;
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
  // Note: Don't include ironing in agreement name since it can be changed per order
  const frequencyNorwegian = translateFrequency(frequency);

  const agreementResponse = await createVippsAgreement({
    productName: `NooraCare - Vask`,
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
    agreementId: agreementResponse.agreementId,
  };
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

    // 3. Get subscription to verify ownership
    const subscription = await getSubscriptionByAgreementId(agreementId);
    if (!subscription) {
      return {
        success: false,
        error: 'Abonnement ikke funnet',
      };
    }

    // Verify customer ownership
    const customer = await getCustomerByUserId(authUser.id);
    if (!customer || customer.id !== subscription.customer_id) {
      return {
        success: false,
        error: 'Ikke autorisert',
      };
    }

    // 4. Call Vipps forceAcceptAgreement API
    const vippsClient = createVippsRecurringClient();
    await vippsClient.forceAcceptAgreement(agreementId, formattedPhone);

    // 5. Poll subscription status until active (max 30 seconds)
    const maxAttempts = 30;
    const delayMs = 1000; // 1 second between attempts

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Wait before checking (except first attempt)
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      // Check subscription status
      const updatedSubscription = await getSubscriptionByAgreementId(agreementId);
      if (updatedSubscription?.status === 'active') {
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

// ----- Reschedule Actions -----

export interface OrderDetailsForReschedule {
  id: string;
  orderNumber: string;
  scheduledDate: string;
  deliveryDate: string;
  city: string;
  status: OrderStatus;
}

/**
 * Get order details needed for the reschedule page
 */
export async function getOrderDetailsForRescheduleAction(
  orderId: string
): Promise<{ data: OrderDetailsForReschedule | null; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { data: null, error: 'Customer not found' };
    }

    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { data: null, error: 'Order not found' };
    }

    return {
      data: {
        id: order.id,
        orderNumber: order.order_number,
        scheduledDate: order.scheduled_date,
        deliveryDate: order.delivery_date,
        city: order.city,
        status: order.status,
      }
    };
  } catch (error) {
    console.error('Error fetching order for reschedule:', error);
    return { data: null, error: 'An error occurred' };
  }
}

export interface RescheduleOrderResult {
  success: boolean;
  error?: string;
  newScheduledDate?: string;
  newDeliveryDate?: string;
}

/**
 * Reschedule an order's pickup date
 * Customer can only reschedule orders in pending_assignment or pickup_scheduled status
 * Must be at least 2 days before the new pickup date
 * Must be more than 24 hours before current pickup date
 */
export async function rescheduleOrderAction(
  orderId: string,
  newScheduledDate: string
): Promise<RescheduleOrderResult> {
  try {
    const { updateOrderScheduledDate } = await import('@/lib/database/orders');
    const { DAYS_PICKUP_TO_DELIVERY, HOURS_BEFORE_PICKUP_RESCHEDULE_CUTOFF } = await import('@/lib/config/order-timing');
    const { addDays, toISODateString } = await import('@/lib/utils/date');

    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // 2. Get customer and verify ownership
    const customer = await getCustomerByUserId(user.id);
    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // 3. Get order and verify it belongs to customer
    const order = await getOrderWithDetailsByIdAndCustomerId(orderId, customer.id);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // 4. Check order status is editable
    const editableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
    if (!editableStatuses.includes(order.status)) {
      return {
        success: false,
        error: 'Kan ikke endre dato etter at hentedag er passert'
      };
    }

    // 5. Check 24-hour cutoff for current pickup date
    const now = new Date();
    const currentPickupDate = new Date(order.scheduled_date);
    const hoursUntilCurrentPickup = (currentPickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilCurrentPickup <= HOURS_BEFORE_PICKUP_RESCHEDULE_CUTOFF) {
      return {
        success: false,
        error: 'Kan ikke endre dato mindre enn 24 timer før henting'
      };
    }

    // 6. Validate new date is at least 2 days in future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 2);

    const newDate = new Date(newScheduledDate);
    if (newDate < minDate) {
      return {
        success: false,
        error: 'Hentedato må være minst 2 dager fram i tid'
      };
    }

    // 7. Validate weekday is available for the city
    const weekday = getWeekdayFromDate(newScheduledDate);
    const availableWeekdays = await getAvailableWeekdaysAction(order.city);
    if (!availableWeekdays.includes(weekday)) {
      return {
        success: false,
        error: 'Denne dagen er ikke tilgjengelig for henting i din by'
      };
    }

    // 8. Update order dates
    const result = await updateOrderScheduledDate(orderId, newScheduledDate);

    if (result.error) {
      return { success: false, error: 'Kunne ikke oppdatere dato' };
    }

    // 9. Calculate delivery date for response
    const pickupDate = new Date(newScheduledDate);
    const deliveryDate = addDays(pickupDate, DAYS_PICKUP_TO_DELIVERY);

    return {
      success: true,
      newScheduledDate,
      newDeliveryDate: toISODateString(deliveryDate)
    };
  } catch (error) {
    console.error('Error rescheduling order:', error);
    return { success: false, error: 'En feil oppstod' };
  }
}
