// Vipps Service Layer
// High-level functions that orchestrate Vipps API calls with database operations

import { createVippsClient } from './client';
import {
  getSubscriptionById,
  getSubscriptionPlanById,
} from '@/lib/database/subscriptions';
import { createPayment } from '@/lib/database/payments';
import type { Subscription, SubscriptionPlan } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateAgreementResult {
  agreementId: string;
  checkoutUrl: string;
  paymentId: string;
}

// =============================================================================
// AGREEMENT CREATION
// =============================================================================

/**
 * Create Vipps recurring agreement for a subscription
 *
 * Flow:
 * 1. Fetch subscription and plan details
 * 2. Create Vipps agreement with initial charge (RESERVE_CAPTURE)
 * 3. Create payment record in database
 * 4. Update subscription with agreement metadata
 * 5. Return checkout URL for user redirect
 *
 * @param subscriptionId - Subscription ID to create agreement for
 * @returns Agreement details and checkout URL
 */
export async function createVippsAgreementForSubscription(
  subscriptionId: string
): Promise<CreateAgreementResult> {
  // Get subscription
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) {
    throw new Error('Subscription not found');
  }

  if (subscription.status !== 'pending_payment') {
    throw new Error(`Cannot create agreement for subscription with status: ${subscription.status}`);
  }

  // Get plan details
  const plan = await getSubscriptionPlanById(subscription.plan_id);
  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  // Initialize Vipps client
  const vipps = createVippsClient();

  // Determine interval based on billing period
  const interval = plan.billing_period === 'one_time' ? 'MONTH' : 'MONTH';

  // Create agreement with initial charge (RESERVE_CAPTURE)
  const result = await vipps.createAgreement({
    productName: plan.name,
    productDescription: plan.description,
    price: subscription.billing_cost_ore,
    interval,
    initialCharge: {
      amount: subscription.billing_cost_ore,
      description: `${plan.name} - Initial payment`,
      transactionType: 'RESERVE_CAPTURE', // Two-step: reserve then capture
    },
    merchantRedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/vipps/agreements/callback?subscriptionId=${subscriptionId}`,
    merchantAgreementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  // Create payment record
  const payment = await createPayment({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    payment_type: plan.billing_period === 'one_time' ? 'one_time' : 'recurring',
    amount_ore: subscription.billing_cost_ore,
    payment_provider: 'vipps',
  });

  if (!payment) {
    throw new Error('Failed to create payment record');
  }

  // Update payment with Vipps metadata (initial - will be updated by webhook)
  // Note: This will be done via database functions we'll create next

  // Update subscription with agreement metadata
  // Note: This will be done via database functions we'll create next

  return {
    agreementId: result.agreementId,
    checkoutUrl: result.vippsConfirmationUrl,
    paymentId: payment.id,
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
 * 2. Create charge via Vipps API (RESERVE_CAPTURE)
 * 3. Create payment record in database
 * 4. Webhook will handle reservation and capture
 *
 * @param subscriptionId - Subscription ID to create charge for
 * @returns Payment ID for the new charge
 */
export async function createRecurringChargeForSubscription(
  subscriptionId: string
): Promise<string> {
  // Get subscription
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription || !subscription.provider_agreement_id) {
    throw new Error('Subscription or Vipps agreement not found');
  }

  if (subscription.status !== 'active') {
    throw new Error(`Cannot create charge for subscription with status: ${subscription.status}`);
  }

  // Get plan details
  const plan = await getSubscriptionPlanById(subscription.plan_id);
  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  // Initialize Vipps client
  const vipps = createVippsClient();

  // Calculate due date (minimum 2 days in future per Vipps requirement)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 2);
  const dueDateString = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

  // Create charge
  const result = await vipps.createCharge(subscription.provider_agreement_id, {
    amount: subscription.billing_cost_ore,
    description: `${plan.name} - Monthly payment`,
    due: dueDateString,
    retryDays: 3, // Vipps will retry for 3 days if payment fails
    transactionType: 'RESERVE_CAPTURE', // Two-step: reserve then capture
  });

  // Create payment record
  const payment = await createPayment({
    customer_id: subscription.customer_id,
    subscription_id: subscription.id,
    payment_type: 'recurring',
    amount_ore: subscription.billing_cost_ore,
    payment_provider: 'vipps',
  });

  if (!payment) {
    throw new Error('Failed to create payment record');
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
  description: string
): Promise<void> {
  const vipps = createVippsClient();

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
export async function cancelVippsAgreement(subscriptionId: string): Promise<void> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription || !subscription.provider_agreement_id) {
    throw new Error('Subscription or Vipps agreement not found');
  }

  const vipps = createVippsClient();
  await vipps.stopAgreement(subscription.provider_agreement_id);
}
