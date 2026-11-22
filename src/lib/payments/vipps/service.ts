// Vipps Service Layer
// High-level functions that orchestrate Vipps API calls with database operations

import { createVippsRecurringClient } from "./recurring-client";
import {
  createPayment,
  failPaymentWithMetadata,
  updatePayment,
} from "@/lib/database/payments";
import { hasLivePayment, isOrphanPendingPayment } from "@/lib/utils/payment-status";
import type { Payment } from "@/types/database";
import { reportError } from "@/lib/services/error-alerts";

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
    // Where Vipps sends the customer to manage the agreement (redirects to
    // /dashboard for one-time orders, which have no subscription).
    merchantAgreementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`,
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
 *    (on failure: payment marked 'failed' with the error, then rethrown)
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
  let result: { chargeId: string };
  try {
    result = await vipps.createCharge(providerAgreementId, {
      amount: amountOre,
      description,
      due: dueDateString,
      retryDays: 3,
      transactionType: 'DIRECT_CAPTURE',
    });
  } catch (error) {
    // The payment row already exists (step 3). Leaving it `pending` with no
    // provider_reference would hide the failure from admins and block the
    // deferred agreement stop, so mark it failed with the Vipps error first.
    const reason = error instanceof Error ? error.message : String(error);
    await failPaymentWithMetadata(payment.id, `Vipps charge creation failed: ${reason}`, {
      vipps_agreement_id: providerAgreementId,
      vipps_status: 'CREATION_FAILED',
    });
    throw error;
  }

  // 5. Update payment with charge ID
  await updatePayment(payment.id, {
    provider_reference: result.chargeId,
    provider_metadata: {
      vipps_agreement_id: providerAgreementId,
      vipps_charge_id: result.chargeId,
    },
  });

  return payment.id;
}

// =============================================================================
// DEFERRED AGREEMENT STOP - SUBSCRIPTION CANCELLED WITH AN IN-FLIGHT ORDER
// =============================================================================

/**
 * Stop the Vipps agreement for a subscription that was cancelled while an
 * order was still in-flight. The stop was deferred so the cleaner could still
 * charge for that order; call this once the final order is settled
 * (charge captured, or finished with a 0 total).
 *
 * Safe to call unconditionally: no-op unless the subscription is cancelled,
 * its agreement is still active, no active orders remain, AND no Vipps charge
 * for the subscription's orders is still un-settled — stopping the agreement
 * would cancel a pending charge (see the webhook handler's comment). When it
 * defers for a pending charge, the charge-captured webhook re-triggers it.
 * Never throws.
 */
export async function stopVippsAgreementForCancelledSubscription(
  subscriptionId: string
): Promise<void> {
  try {
    const { getSubscriptionById } = await import('@/lib/database/subscriptions');
    const subscription = await getSubscriptionById(subscriptionId);
    if (!subscription || subscription.status !== 'cancelled' || !subscription.payment_agreement_id) {
      return;
    }

    const { getPaymentAgreementById, stopPaymentAgreement } = await import('@/lib/database/payment-agreements');
    const agreement = await getPaymentAgreementById(subscription.payment_agreement_id);
    if (!agreement || agreement.status !== 'active') {
      return; // already stopped (or never activated) — idempotency guard
    }

    const { getActiveOrdersBySubscriptionId } = await import('@/lib/database/orders');
    const activeOrders = await getActiveOrdersBySubscriptionId(subscriptionId);
    if (activeOrders.length > 0) {
      return; // another order still needs to be charged
    }

    const { hasUnsettledVippsPaymentForSubscription } = await import('@/lib/database/payments');
    if (await hasUnsettledVippsPaymentForSubscription(subscriptionId)) {
      // A charge is still pending/authorized — stopping the agreement would
      // cancel it. The charge-captured webhook calls this function again once
      // the charge settles (payment is marked captured before that call).
      return;
    }

    console.log(`[stopVippsAgreementForCancelledSubscription] Stopping agreement ${agreement.provider_agreement_id} for cancelled subscription ${subscriptionId}`);
    const vipps = createVippsRecurringClient();
    await vipps.stopAgreement(agreement.provider_agreement_id);
    await stopPaymentAgreement(agreement.id);
  } catch (error) {
    // Both call sites are post-payment cleanup — never let this break them.
    await reportError('Vipps-avtale ble ikke stoppet (oppsagt abonnement)', error, { subscription: subscriptionId });
  }
}

// =============================================================================
// ONE-TIME ORDER AGREEMENT STOP - ORDER CANCELLED, OR COMPLETED WITH NOTHING TO CHARGE
// =============================================================================

/**
 * Stop the Vipps agreement of a one-time order (no subscription) once nothing
 * more will be charged on it:
 * - the order was cancelled (customer or admin; only possible before pickup,
 *   so no charge exists), or
 * - the order is completed and its money is settled: a 0 kr total (100 % promo,
 *   no charge and therefore no charge-captured webhook), or a captured/refunded
 *   payment (second chance when the stop in the charge-captured webhook failed).
 *
 * Safe to call unconditionally: no-op for subscription orders, orders without
 * an agreement, orders that are neither cancelled nor completed, and agreements
 * that are not active (already stopped — idempotency guard). It also refuses:
 * - while a Vipps charge for the order is still pending/authorized — stopping
 *   the agreement would cancel that charge; the charge-captured webhook stops
 *   the agreement once it settles (same rule as the subscription stop above,
 *   orphan pending rows do not count);
 * - for a completed order with a price above 0 and no live payment (the charge
 *   failed) — the admin's «Belast på nytt» needs the agreement active.
 * Never throws: a failed stop is logged and must never fail the cancellation
 * or the completion that called it.
 */
export async function stopVippsAgreementForOneTimeOrder(orderId: string): Promise<void> {
  try {
    const { getOrderById } = await import('@/lib/database/orders');
    const order = await getOrderById(orderId);
    if (!order || order.subscription_id || !order.payment_agreement_id) {
      return; // subscription order, manual order, or unknown order
    }
    if (order.status !== 'cancelled' && order.status !== 'completed') {
      return; // still in progress — the agreement is needed for its charge
    }

    const { getPaymentAgreementById, stopPaymentAgreement } = await import('@/lib/database/payment-agreements');
    const agreement = await getPaymentAgreementById(order.payment_agreement_id);
    if (!agreement || agreement.status !== 'active') {
      return; // already stopped (or never activated) — idempotency guard
    }

    // Read the order's payments here instead of through getPaymentsByOrderId:
    // that helper returns [] on a query error, which would read as "nothing to
    // wait for" and stop the agreement under a pending charge. Fail safe instead.
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const { data, error: paymentsError } = await createAdminClient()
      .from('payments')
      .select('status, provider_reference, created_at, payment_provider')
      .eq('order_id', orderId);
    if (paymentsError || !data) {
      console.error('[stopVippsAgreementForOneTimeOrder] Could not read payments, not stopping:', paymentsError);
      return;
    }
    const payments = data as Pick<Payment, 'status' | 'provider_reference' | 'created_at' | 'payment_provider'>[];

    const hasUnsettledVippsPayment = payments.some(
      (payment) =>
        payment.payment_provider === 'vipps' &&
        (payment.status === 'authorized' ||
          (payment.status === 'pending' && !isOrphanPendingPayment(payment)))
    );
    if (hasUnsettledVippsPayment) {
      return; // the charge-captured webhook stops the agreement once it settles
    }

    if (order.status === 'completed') {
      if (order.total_cost_ore === null) {
        return; // no price on a completed order: unknown state, leave it to an admin
      }
      if (order.total_cost_ore > 0 && !hasLivePayment(payments)) {
        return; // not paid yet — «Belast på nytt» needs the agreement active
      }
    }

    console.log(`[stopVippsAgreementForOneTimeOrder] Stopping agreement ${agreement.provider_agreement_id} for ${order.status} one-time order ${orderId}`);
    const vipps = createVippsRecurringClient();
    await vipps.stopAgreement(agreement.provider_agreement_id);
    const stopped = await stopPaymentAgreement(agreement.id);
    if (!stopped) {
      await reportError(
        'Vipps-avtale stoppet hos Vipps, men ikke i databasen',
        new Error(`payment_agreements ${agreement.id} could not be marked stopped`),
        { ordre: orderId }
      );
    }
  } catch (error) {
    await reportError('Vipps-avtale ble ikke stoppet (enkeltbestilling)', error, { ordre: orderId });
  }
}
