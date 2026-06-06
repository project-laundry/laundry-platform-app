// Vipps Service Layer
// High-level functions that orchestrate Vipps API calls with database operations

import { createVippsRecurringClient } from "./recurring-client";
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
 * @param providerAgreementId - Vipps provider agreement ID
 */
export async function cancelVippsAgreement(
  providerAgreementId: string,
): Promise<void> {  
  const vipps = createVippsRecurringClient();
  await vipps.stopAgreement(providerAgreementId);
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

  // 1. Get order with payment agreement
  // Try direct payment_agreement_id first (one-time orders), then via subscription (recurring orders)
  const { data: order, error: orderError } = await adminClient
    .from('orders')
    .select('*, payment_agreements(*), subscriptions(payment_agreement_id, customer_id, id)')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // 2. Resolve payment agreement - either directly on order or through subscription
  let providerAgreementId: string | null = null;
  const customerId: string = order.customer_id;

  const directAgreement = order.payment_agreements as Record<string, string> | null;
  const subscription = order.subscriptions as Record<string, string> | null;

  if (directAgreement?.provider_agreement_id) {
    // Order has direct payment agreement (both one-time and recurring orders)
    providerAgreementId = directAgreement.provider_agreement_id;
  } else if (subscription?.payment_agreement_id) {
    // Fallback: look up through subscription's payment agreement
    const { getPaymentAgreementById } = await import('@/lib/database/payment-agreements');
    const agreement = await getPaymentAgreementById(subscription.payment_agreement_id);
    providerAgreementId = agreement?.provider_agreement_id || null;
  }

  if (!providerAgreementId) {
    throw new Error('No Vipps agreement found for order');
  }

  // 3. Create payment record
  const payment = await createPayment({
    customer_id: customerId,
    order_id: orderId,
    payment_type: 'one_time',
    amount_ore: amountOre,
    payment_provider: 'vipps',
  });

  if (!payment) {
    throw new Error('Failed to create payment record');
  }

  // 4. Create Vipps charge (due in 1 day minimum per Vipps requirement)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 1);
  const dueDateString = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

  const vipps = createVippsRecurringClient();
  const result = await vipps.createCharge(providerAgreementId, {
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
      vipps_agreement_id: providerAgreementId,
      vipps_charge_id: result.chargeId,
    },
  });

  return payment.id;
}
