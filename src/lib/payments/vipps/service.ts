// Vipps Service Layer
// High-level functions that orchestrate Vipps API calls with database operations

import { createVippsRecurringClient } from "./recurring-client";
import { createVippsEPaymentClient } from "./epayment-client";
import {
  getSubscriptionById,
  getSubscriptionPlanById,
} from "@/lib/database/subscriptions";
import {
  createPayment,
  getPendingPaymentsForSubscription,
  cancelPendingPaymentsForSubscription,
} from "@/lib/database/payments";

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAgreementData {  
  productName: string;
  productDescription: string;
  price: number;
}

export interface CreateAgreementResult {
  agreementId: string;
  vippsConfirmationUrl: string;
  chargeId?: string;
}

// =============================================================================
// AGREEMENT CREATION
// =============================================================================

/**
 * Create Vipps recurring agreement for a subscription
 * @param subscriptionId - Subscription ID to create agreement for
 * @returns Agreement details and checkout URL
 */
export async function createVippsAgreement(
  createAgreementData: CreateAgreementData,
): Promise<CreateAgreementResult> {
  const vipps = createVippsRecurringClient();

  // Create agreement with initial charge (DIRECT_CAPTURE)
  const result = await vipps.createAgreement({
    productName: createAgreementData.productName,
    productDescription: createAgreementData.productDescription,
    price: createAgreementData.price,
    merchantRedirectUrl:
      `${process.env.NEXT_PUBLIC_APP_URL}/api/vipps/agreements/callback`,
    merchantAgreementUrl: `https://laundry-landing-page-rho.vercel.app`,
  });

  return {
    agreementId: result.agreementId,
    vippsConfirmationUrl: result.vippsConfirmationUrl,
    chargeId: result.chargeId,
  };
}

// =============================================================================
// RECURRING CHARGES
// =============================================================================

/**
 * Create recurring charge for a subscription's next billing cycle
 *
 * Flow:
 * 1. Validate subscription has active Vipps agreement
 * 2. Create charge via Vipps API (DIRECT_CAPTURE)
 * 3. Create payment record in database
 * 4. Webhook will handle payment confirmation
 *
 * @param subscriptionId - Subscription ID to create charge for
 * @returns Payment ID for the new charge
 */
export async function createRecurringChargeForSubscription(
  subscriptionId: string,
  dueDate?: string,
): Promise<string> {
  // Get subscription
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription || !subscription.provider_agreement_id) {
    throw new Error("Subscription or Vipps agreement not found");
  }

  if (subscription.status !== "active") {
    throw new Error(
      `Cannot create charge for subscription with status: ${subscription.status}`,
    );
  }

  // Get plan details
  const plan = await getSubscriptionPlanById(subscription.plan_id);
  if (!plan) {
    throw new Error("Subscription plan not found");
  }

  // Initialize Vipps Recurring client
  const vipps = createVippsRecurringClient();

  // Calculate due date (minimum 2 days in future per Vipps requirement)
  let dueDateString: string;
  if (dueDate) {
    dueDateString = dueDate;
  } else {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 2);
    dueDateString = defaultDueDate.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  // Create charge
  const result = await vipps.createCharge(subscription.provider_agreement_id, {
    amount: subscription.billing_cost_ore,
    description: `${plan.name} - Monthly payment`,
    due: dueDateString,
    retryDays: 3, // Vipps will retry for 3 days if payment fails
    transactionType: "DIRECT_CAPTURE", // Direct capture for recurring payments
  });

  // Create payment record
  const payment = await createPayment({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    payment_type: "recurring",
    amount_ore: subscription.billing_cost_ore,
    payment_provider: "vipps",
    provider_reference: result.chargeId,
  });

  if (!payment) {
    throw new Error("Failed to create payment record");
  }

  // Update payment with charge metadata
  // Note: This will be done via database functions we'll create next

  return payment.id;
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

/**
 * Cancel pending Vipps charges for a subscription when pausing
 *
 * Flow:
 * 1. Fetch all pending/authorized payments for subscription
 * 2. For each Vipps payment, cancel the charge via Vipps API
 * 3. If all Vipps cancellations succeed, update database
 * 4. If any Vipps cancellation fails, throw error (preserving subscription state)
 *
 * @param subscriptionId - Subscription ID to cancel payments for
 * @param providerAgreementId - Vipps agreement ID
 * @throws Error if Vipps API call fails or subscription not found
 */
export async function cancelPendingVippsChargesForSubscription(
  subscriptionId: string,
  providerAgreementId: string,
): Promise<void> {
  // Get subscription
  // Get pending payments
  const pendingPayments = await getPendingPaymentsForSubscription(subscriptionId);

  // Filter for Vipps payments with charge IDs
  const vippsPayments = pendingPayments.filter(
    (p) => p.payment_provider === 'vipps' && p.provider_reference
  );

  // If no Vipps payments to cancel, return early
  if (vippsPayments.length === 0) {
    return;
  }  

  // Cancel all charges in Vipps first (fail-fast on errors)
  const vipps = createVippsRecurringClient();

  for (const payment of vippsPayments) {
    const chargeId = payment.provider_reference!;

    try {
      await vipps.cancelCharge(providerAgreementId, chargeId);
    } catch (error) {
      // Re-throw Vipps errors to prevent subscription pause
      throw new Error(
        `Failed to cancel Vipps charge ${chargeId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // All Vipps cancellations succeeded - now update database
  await cancelPendingPaymentsForSubscription(
    subscriptionId,
    'Subscription paused by customer'
  );
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
