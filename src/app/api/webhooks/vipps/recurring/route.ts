// API Route: Vipps Recurring API Webhook Handler
// POST /api/webhooks/vipps/recurring
//
// Authentication: HMAC-SHA256 signature verification (requires VIPPS_WEBHOOK_SECRET env var)
// See: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/
//
// Handles Vipps Recurring API webhook events:
//
// CHARGE EVENTS:
// - recurring.charge-reserved.v1 → Authorize payment → Capture charge
// - recurring.charge-captured.v1 → Complete payment → Activate subscription → Generate orders
// - recurring.charge-canceled.v1 → Mark payment as canceled
// - recurring.charge-refunded.v1 → Process refund
// - recurring.charge-failed.v1 → Mark payment as failed
// - recurring.charge-creation-failed.v1 → Handle charge creation failure
//
// AGREEMENT EVENTS:
// - recurring.agreement-activated.v1 → Agreement accepted by user
// - recurring.agreement-rejected.v1 → Agreement rejected by user
// - recurring.agreement-stopped.v1 → Cancel subscription
// - recurring.agreement-expired.v1 → Handle expired agreement

import { NextRequest, NextResponse } from 'next/server';
import { validateVippsWebhook, getVippsWebhookSecret } from '@/lib/payments/vipps/webhook-auth';
import {
  getSubscriptionByAgreementId,
  activateSubscription,
  activateOneTimeSubscription,
  activateSubscriptionOnAgreementActivation,
  getSubscriptionPlanById,
} from '@/lib/database/subscriptions';
import {
  getPaymentByAgreementAndCharge,
  authorizePayment,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  updatePaymentWithMetadata,
  getPaymentForSubscription,
} from '@/lib/database/payments';


// =============================================================================
// TYPES (Official Vipps API Contract)
// =============================================================================

// Charge webhook event types
type VippsChargeEvent =
  | 'recurring.charge-reserved.v1'
  | 'recurring.charge-captured.v1'
  | 'recurring.charge-canceled.v1'
  | 'recurring.charge-refunded.v1'
  | 'recurring.charge-failed.v1'
  | 'recurring.charge-creation-failed.v1';

// Agreement webhook event types
type VippsAgreementEvent =
  | 'recurring.agreement-activated.v1'
  | 'recurring.agreement-rejected.v1'
  | 'recurring.agreement-stopped.v1'
  | 'recurring.agreement-expired.v1';

// Charge webhook payload (from official Vipps documentation)
interface VippsChargeWebhookBody {
  agreementId: string;
  chargeExternalId?: string;
  chargeId: string;
  amount: number;
  chargeType: 'RECURRING' | 'INITIAL' | 'UNSCHEDULED';
  eventType: VippsChargeEvent;
  currency: 'DKK' | 'NOK' | 'EUR';
  occurred: string;
  amountCaptured?: number;
  amountCanceled?: number;
  amountRefunded?: number;
  failureCode?: number;
  failureReason?: string;
  msn: string;
}

// Agreement webhook payload (from official Vipps documentation)
interface VippsAgreementWebhookBody {
  agreementId: string;
  agreementUUID: string;
  agreementExternalId?: string;
  eventType: VippsAgreementEvent;
  occurred: string;
  actor?: 'MERCHANT' | 'USER' | 'ADMIN';
  msn: string;
}

// Union type for all recurring webhook payloads
type VippsRecurringWebhookBody = VippsChargeWebhookBody | VippsAgreementWebhookBody;

// =============================================================================
// WEBHOOK UTILITIES
// =============================================================================

/**
 * Type guard to check if webhook is a Recurring API charge event
 */
function isRecurringChargeWebhook(body: VippsRecurringWebhookBody): body is VippsChargeWebhookBody {
  return 'chargeId' in body && 'agreementId' in body;
}

/**
 * Type guard to check if webhook is a Recurring API agreement event
 */
function isRecurringAgreementWebhook(body: VippsRecurringWebhookBody): body is VippsAgreementWebhookBody {
  return 'agreementId' in body && 'agreementUUID' in body && !('chargeId' in body);
}


// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * Vipps Recurring API webhook endpoint
 *
 * Handles webhooks from Vipps Recurring API (recurring payments, agreements)
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Get webhook secret (tries VIPPS_WEBHOOK_SECRET_RECURRING first, falls back to VIPPS_WEBHOOK_SECRET)
    const webhookSecret = getVippsWebhookSecret('recurring');

    // Validate webhook authenticity using HMAC signature
    if (!validateVippsWebhook(request, rawBody, webhookSecret, '[Vipps Recurring Webhook]')) {
      console.error('[Vipps Recurring Webhook] Invalid authentication');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook body
    const body: VippsRecurringWebhookBody = JSON.parse(rawBody);

    console.log('[Vipps Recurring Webhook] Received webhook');
    console.log('[Vipps Recurring Webhook] Payload:', JSON.stringify(body, null, 2));

    // Route to appropriate handler based on webhook type
    if (isRecurringChargeWebhook(body)) {
      // Recurring API charge webhooks
      await handleRecurringChargeWebhook(body);
    } else if (isRecurringAgreementWebhook(body)) {
      // Recurring API agreement webhooks
      await handleRecurringAgreementWebhook(body);
    } else {
      console.warn('[Vipps Recurring Webhook] Unknown webhook type');
      console.warn('[Vipps Recurring Webhook] Body:', JSON.stringify(body, null, 2));
    }

    // Always return 200 OK to acknowledge webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vipps Recurring Webhook] Error processing webhook:', error);
    console.error('[Vipps Recurring Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Return 200 OK to prevent webhook retries for errors
    // Vipps will retry on non-200 responses, but these are likely permanent errors
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 }
    );
  }
}

// =============================================================================
// WEBHOOK ROUTERS
// =============================================================================

/**
 * Route Recurring API charge webhooks to appropriate handlers
 */
async function handleRecurringChargeWebhook(body: VippsChargeWebhookBody): Promise<void> {
  const { eventType, agreementId } = body;

  console.log(`[Vipps Recurring Webhook] Charge event: ${eventType} for agreement ${agreementId}`);

  // Get subscription by agreement ID
  const subscription = await getSubscriptionByAgreementId(agreementId);

  if (!subscription) {
    console.error(`[Vipps Recurring Webhook] Subscription not found for agreement ${agreementId}`);
    return; // Return silently - subscription may have been deleted
  }

  // Route to appropriate handler
  switch (eventType) {    
    case 'recurring.charge-captured.v1':
      await handleChargeCaptured(body, subscription);
      break;

    case 'recurring.charge-canceled.v1':
      await handleChargeCanceled(body, subscription);
      break;

    case 'recurring.charge-refunded.v1':
      await handleChargeRefunded(body, subscription);
      break;

    case 'recurring.charge-failed.v1':
      await handleChargeFailed(body, subscription);
      break;

    case 'recurring.charge-creation-failed.v1':
      await handleChargeCreationFailed(body, subscription);
      break;

    default:
      console.log(`[Vipps Recurring Webhook] Unknown charge event: ${eventType}`);
  }
}

/**
 * Route Recurring API agreement webhooks to appropriate handlers
 */
async function handleRecurringAgreementWebhook(body: VippsAgreementWebhookBody): Promise<void> {
  const { eventType, agreementId } = body;

  console.log(`[Vipps Recurring Webhook] Agreement event: ${eventType} for agreement ${agreementId}`);

  // Get subscription by agreement ID
  const subscription = await getSubscriptionByAgreementId(agreementId);

  if (!subscription) {
    console.error(`[Vipps Recurring Webhook] Subscription not found for agreement ${agreementId}`);
    return; // Return silently - subscription may have been deleted
  }

  // Route to appropriate handler
  switch (eventType) {
    case 'recurring.agreement-activated.v1':
      await handleAgreementActivated(body, subscription);
      break;

    case 'recurring.agreement-rejected.v1':
      await handleAgreementRejected(body, subscription);
      break;

    case 'recurring.agreement-stopped.v1':
      await handleAgreementStopped(body, subscription);
      break;

    case 'recurring.agreement-expired.v1':
      await handleAgreementExpired(body, subscription);
      break;

    default:
      console.log(`[Vipps Recurring Webhook] Unknown agreement event: ${eventType}`);
  }
}

// =============================================================================
// CHARGE EVENT HANDLERS
// =============================================================================

/**
 * Handle recurring.charge-captured.v1
 *
 * Charge was captured (payment completed). Activate subscription and generate orders.
 */
async function handleChargeCaptured(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, amount, amountCaptured, currency, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge captured: ${chargeId} (${(amountCaptured || amount)/100} ${currency})`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    throw new Error(`Payment not found for captured charge ${chargeId}`);
  }

  // Update payment to captured
  await capturePaymentWithMetadata(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'CHARGED',
    vipps_amount: amount,
    vipps_amount_captured: amountCaptured,
    vipps_currency: currency,
    captured_at: occurred,
  });

  // Get subscription plan
    const plan = await getSubscriptionPlanById(subscription.plan_id);

    if (!plan) {
      throw new Error('Subscription plan not found');
    }
}

/**
 * Handle recurring.charge-canceled.v1
 *
 * Charge was fully or partially cancelled.
 */
async function handleChargeCanceled(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, amountCanceled, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge canceled: ${chargeId} (${(amountCanceled || 0)/100} canceled)`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    console.warn(`[Vipps Recurring Webhook] Payment not found for canceled charge ${chargeId}`);
    return;
  }

  // Update payment status to canceled
  await updatePaymentWithMetadata(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'CANCELLED',
    vipps_amount_canceled: amountCanceled,
    canceled_at: occurred,
  });

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} marked as canceled`);
}

/**
 * Handle recurring.charge-refunded.v1
 *
 * Charge was fully or partially refunded.
 */
async function handleChargeRefunded(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, amountRefunded, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge refunded: ${chargeId} (${(amountRefunded || 0)/100} refunded)`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    console.warn(`[Vipps Recurring Webhook] Payment not found for refunded charge ${chargeId}`);
    return;
  }

  // Update payment status to refunded
  await updatePaymentWithMetadata(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'REFUNDED',
    vipps_amount_refunded: amountRefunded,
    refunded_at: occurred,
  });

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} marked as refunded`);
  // TODO: Consider reversing subscription/order status if initial payment was refunded
}

/**
 * Handle recurring.charge-failed.v1
 *
 * Charge failed and will no longer be retried by Vipps.
 */
async function handleChargeFailed(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, failureReason, failureCode, occurred } = webhook;

  console.error(`[Vipps Recurring Webhook] Charge failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Find payment record
  let payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    // Try to find by subscription
    payment = await getPaymentForSubscription(subscription.id);

    if (!payment) {
      console.error(`[Vipps Recurring Webhook] No payment found for failed charge ${chargeId}`);
      return;
    }
  }

  // Mark payment as failed
  await failPaymentWithMetadata(
    payment.id,
    failureReason || `Charge failed (code: ${failureCode})`,
    {
      vipps_agreement_id: agreementId,
      vipps_charge_id: chargeId,
      vipps_status: 'FAILED',
      vipps_failure_code: failureCode,
      vipps_failure_reason: failureReason,
      failed_at: occurred,
    }
  );

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} marked as failed`);

  // TODO: Send customer notification about failed payment
  // TODO: Handle retry logic or subscription pausing after multiple failures
}

/**
 * Handle recurring.charge-creation-failed.v1
 *
 * Charge failed to be created asynchronously (async validation failed).
 */
async function handleChargeCreationFailed(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, failureReason, failureCode } = webhook;

  console.error(`[Vipps Recurring Webhook] Charge creation failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Log the error for investigation
  console.error('[Vipps Recurring Webhook] Charge creation failure details:', {
    agreementId,
    chargeId,
    failureCode,
    failureReason,
    subscriptionId: subscription.id,
  });

  // TODO: Send admin notification about charge creation failure
  // TODO: Determine if subscription needs to be paused/cancelled based on failure type
}

// =============================================================================
// AGREEMENT EVENT HANDLERS
// =============================================================================

/**
 * Handle recurring.agreement-activated.v1
 *
 * Agreement was accepted/activated by the user.
 * Activates the subscription with status='active', started_at=now, expires_at=one month from now
 */
async function handleAgreementActivated(
  webhook: VippsAgreementWebhookBody,
  subscription: any
): Promise<void> {
  const { agreementId, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement activated: ${agreementId}`);

  // Activate subscription when agreement is activated
  const activatedSubscription = await activateSubscriptionOnAgreementActivation(subscription.id);

  if (!activatedSubscription) {
    throw new Error(`Failed to activate subscription ${subscription.id} on agreement activation`);
  }

  console.log(`[Vipps Recurring Webhook] Subscription ${subscription.id} activated with status='active', started_at=${activatedSubscription.started_at}, expires_at=${activatedSubscription.expires_at}`);
}

/**
 * Handle recurring.agreement-rejected.v1
 *
 * Agreement was rejected by the user (user declined to approve).
 */
async function handleAgreementRejected(
  webhook: VippsAgreementWebhookBody,
  subscription: any
): Promise<void> {
  const { agreementId, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement rejected: ${agreementId}`);

  // User rejected the agreement - subscription should remain in pending state
  // No action needed as subscription is already pending payment

  console.warn(`[Vipps Recurring Webhook] Agreement ${agreementId} rejected by user for subscription ${subscription.id}`);
  // TODO: Consider sending notification to user or admin
}

/**
 * Handle recurring.agreement-stopped.v1
 *
 * Agreement was stopped (by user, merchant, or admin).
 */
async function handleAgreementStopped(
  webhook: VippsAgreementWebhookBody,
  subscription: any
): Promise<void> {
  const { agreementId, actor, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement stopped: ${agreementId} by ${actor || 'unknown'}`);

  if (subscription.status === 'active') {
    // Cancel the subscription
    console.log(`[Vipps Recurring Webhook] Cancelling subscription ${subscription.id} due to stopped agreement`);

    // TODO: Implement cancelSubscription function in subscriptions.ts
    // await cancelSubscription(subscription.id, `Vipps agreement stopped by ${actor || 'user'}`);
    console.warn('[Vipps Recurring Webhook] Subscription cancellation not yet implemented');

    // NOTE: According to Vipps docs:
    // - RESERVED charges are NOT automatically cancelled (merchant can still capture)
    // - PENDING/DUE charges are cancelled
    // - New future charges will result in an error
  } else {
    console.log(`[Vipps Recurring Webhook] Agreement stopped but subscription ${subscription.id} is ${subscription.status}`);
  }
}

/**
 * Handle recurring.agreement-expired.v1
 *
 * Agreement has expired (reached end date).
 */
async function handleAgreementExpired(
  webhook: VippsAgreementWebhookBody,
  subscription: any
): Promise<void> {
  const { agreementId, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement expired: ${agreementId}`);

  // Agreement has expired - should stop creating new charges
  console.log(`[Vipps Recurring Webhook] Agreement ${agreementId} expired for subscription ${subscription.id}`);

  // TODO: Update subscription status or end date as needed
  // TODO: Consider if any cleanup is needed for expired agreements
}
