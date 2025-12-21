// Vipps Service Layer
// High-level functions that orchestrate Vipps API calls with database operations

import { createVippsRecurringClient } from "./recurring-client";
import { createVippsEPaymentClient } from "./epayment-client";
import {
  getSubscriptionById  
} from "@/lib/database/subscriptions";
import {
  createPayment,
} from "@/lib/database/payments";

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAgreementData {
  productName: string;
  productDescription: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  // Note: No price - using FLEXIBLE pricing model
}

export interface CreateAgreementResult {
  agreementId: string;
  vippsConfirmationUrl: string;
  chargeId?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map subscription frequency to Vipps interval format
 */
function mapFrequencyToVippsInterval(frequency: 'weekly' | 'biweekly' | 'monthly'): {
  unit: 'WEEK' | 'MONTH';
  count: number;
} {
  switch (frequency) {
    case 'weekly':
      return { unit: 'WEEK', count: 1 };
    case 'biweekly':
      return { unit: 'WEEK', count: 2 };
    case 'monthly':
      return { unit: 'MONTH', count: 1 };
  }
}

// =============================================================================
// AGREEMENT CREATION
// =============================================================================

/**
 * Create Vipps recurring agreement for a subscription (FLEXIBLE pricing)
 * No upfront payment - charges created per order after cleaner calculates price
 *
 * Flow:
 * 1. User redirected to Vipps to approve agreement
 * 2. After approval, Vipps redirects to /orders/success (generic success page)
 * 3. Webhook handles subscription activation (agreement-activated event)
 *
 * @param createAgreementData - Agreement product info
 * @returns Agreement details and checkout URL
 */
export async function createVippsAgreement(
  createAgreementData: CreateAgreementData,
): Promise<CreateAgreementResult> {
  const vipps = createVippsRecurringClient();

  // Map subscription frequency to Vipps interval
  const interval = mapFrequencyToVippsInterval(createAgreementData.frequency);

  // Create agreement with FLEXIBLE pricing (no upfront payment)
  const result = await vipps.createAgreement({
    productName: createAgreementData.productName,
    productDescription: createAgreementData.productDescription,
    interval,
    merchantRedirectUrl:
      `${process.env.NEXT_PUBLIC_APP_URL}/orders/success`,
    merchantAgreementUrl: `https://laundry-landing-page-rho.vercel.app`,
  });

  return {
    agreementId: result.agreementId,
    vippsConfirmationUrl: result.vippsConfirmationUrl,
    chargeId: result.chargeId,
  };
}


// =============================================================================
// CHARGE CAPTURE
// =============================================================================

/**
 * Capture a reserved Vipps charge
 *
 * Called automatically by webhook when charge status becomes RESERVED
 *
 * @param agreementId - Vipps agreement ID
 * @param chargeId - Vipps charge ID
 * @param amount - Amount to capture in øre
 * @param description - Description for capture transaction
 */
export async function captureVippsCharge(
  agreementId: string,
  chargeId: string,
  amount: number,
  description: string,
): Promise<void> {
  const vipps = createVippsRecurringClient();

  await vipps.captureCharge(agreementId, chargeId, {
    amount,
    description,
  });
}

// =============================================================================
// AGREEMENT CANCELLATION
// =============================================================================

/**
 * Cancel subscription's Vipps agreement
 *
 * @param subscriptionId - Subscription ID to cancel agreement for
 */
export async function cancelVippsAgreement(
  subscriptionId: string,
): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription || !subscription.provider_agreement_id) {
    throw new Error("Subscription or Vipps agreement not found");
  }

  const vipps = createVippsRecurringClient();
  await vipps.stopAgreement(subscription.provider_agreement_id);
}

// =============================================================================
// EPAYMENT API (ONE-TIME PAYMENTS)
// =============================================================================

export interface CreateEPaymentResult {
  redirectUrl: string;
}

/**
 * Create Vipps ePayment for a standalone order
 *
 * Flow:
 * 1. Create Vipps ePayment via API
 * 2. Return redirect URL for user payment
 *
 * @param orderId - Order ID to create ePayment for
 * @param reference - Unique merchant reference for this payment (8-64 chars)
 * @returns Payment ID and checkout URL
 */
export async function createVippsEPayment(
  orderId: string,
  reference: string,
  amount: number,
): Promise<CreateEPaymentResult> {
  // Initialize Vipps ePayment client
  const vipps = createVippsEPaymentClient();

  // Create ePayment
  const result = await vipps.createPayment({
    reference,
    amount: amount,
    paymentDescription: `NooraCare - Laundry service`,
    userFlow: "WEB_REDIRECT", // Most common flow
    returnUrl:
      `${process.env.NEXT_PUBLIC_APP_URL}/orders/success?orderId=${orderId}`,
    paymentMethod: {
      type: "WALLET", // Vipps app payment
    },
  });

  return {
    redirectUrl: result.redirectUrl || "",
  };
}

/**
 * Capture authorized Vipps ePayment
 *
 * Called automatically by webhook when payment is authorized
 *
 * @param reference - Merchant reference
 * @param amount - Amount to capture in øre
 * @returns void
 */
export async function captureVippsEPayment(
  reference: string,
  amount: number,
): Promise<void> {
  const vipps = createVippsEPaymentClient();

  await vipps.capturePayment(reference, {
    amount,
    description: "Payment capture",
  });
}

// =============================================================================
// FLEXIBLE PRICING - CHARGE CREATION AFTER SERVICE
// =============================================================================

/**
 * Create charge for completed order with calculated price
 * Called by cleaner after weighing and pricing the order
 *
 * Flow:
 * 1. Get order with subscription
 * 2. Verify Vipps agreement exists
 * 3. Create payment record in database
 * 4. Create Vipps charge with calculated amount
 * 5. Webhook will handle payment confirmation
 *
 * @param orderId - Order ID to create charge for
 * @param amountOre - Calculated amount in øre
 * @param description - Charge description
 * @returns Payment ID for the new charge
 */
export async function createChargeForCompletedOrder(
  orderId: string,
  amountOre: number,
  description: string
): Promise<string> {
  // Import admin client dynamically to avoid circular dependency
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  // 1. Get order with subscription
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('*, subscriptions!inner(provider_agreement_id, customer_id, id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const subscription = order.subscriptions as any;

  // 2. Verify agreement exists and is active
  if (!subscription.provider_agreement_id) {
    throw new Error('No Vipps agreement found for subscription');
  }

  // 3. Create payment record
  const payment = await createPayment({
    customer_id: subscription.customer_id,
    order_id: orderId,
    subscription_id: subscription.id,
    payment_type: 'one_time',
    amount_ore: amountOre,
    payment_provider: 'vipps',
  });

  if (!payment) {
    throw new Error('Failed to create payment record');
  }

  // 4. Create Vipps charge (due in 2 days minimum per Vipps requirement)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  const dueDateString = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const vipps = createVippsRecurringClient();
  const result = await vipps.createCharge(subscription.provider_agreement_id, {
    amount: amountOre,
    description,
    due: dueDateString,
    retryDays: 3,
    transactionType: 'DIRECT_CAPTURE',
  });

  // 5. Update payment with charge ID
  const { updatePayment } = await import('@/lib/database/payments');
  await updatePayment(payment.id, {
    provider_reference: result.chargeId,
    provider_metadata: {
      vipps_agreement_id: subscription.provider_agreement_id,
      vipps_charge_id: result.chargeId,
    },
  });

  return payment.id;
}
