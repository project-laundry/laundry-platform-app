// API Route: Vipps Webhook Handler
// POST /api/webhooks/vipps
//
// Authentication: HMAC-SHA256 signature verification (requires VIPPS_WEBHOOK_SECRET env var)
// See: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/
//
// Handles Vipps webhook events according to official Vipps Recurring API specification:
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
import crypto from 'crypto';
import { captureVippsCharge, captureVippsEPayment } from '@/lib/payments/vipps/service';
import {
  getSubscriptionByAgreementId,
  activateSubscription,
  activateOneTimeSubscription,
  getSubscriptionPlanById,
} from '@/lib/database/subscriptions';
import {
  getPaymentByAgreementAndCharge,
  getPaymentById,
  getPaymentByReference,
  authorizePayment,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  updatePaymentWithMetadata,
  getPaymentForSubscription,
} from '@/lib/database/payments';
import { findAvailableCleanerForSubscription } from '@/lib/database/cleaners';
import { generateOrdersForSubscription } from '@/lib/services/order-generation';
import { updateOrderStatus } from '@/lib/database/orders';

// =============================================================================
// TYPES (Official Vipps API Contract)
// =============================================================================

// ========== RECURRING API TYPES ==========

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

// ========== EPAYMENT API TYPES ==========

// ePayment webhook event types
type VippsEPaymentEvent =
  | 'epayments.payment.created.v1'
  | 'epayments.payment.aborted.v1'
  | 'epayments.payment.expired.v1'
  | 'epayments.payment.cancelled.v1'
  | 'epayments.payment.captured.v1'
  | 'epayments.payment.refunded.v1'
  | 'epayments.payment.authorized.v1'
  | 'epayments.payment.terminated.v1';

// ePayment webhook payload (from official Vipps documentation)
interface VippsEPaymentWebhookBody {
  msn: string;
  reference: string; // Merchant's unique payment reference
  pspReference: string; // Vipps internal payment reference
  name: 'CREATED' | 'ABORTED' | 'EXPIRED' | 'CANCELLED' | 'CAPTURED' | 'REFUNDED' | 'AUTHORIZED' | 'TERMINATED';
  eventType?: VippsEPaymentEvent; // May or may not be present
  amount: {
    value: number; // Amount in øre/cents
    currency: string;
  };
  timestamp: string;
  idempotencyKey?: string;
  success: boolean;
  shippingDetails?: {
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      country?: string;
      postalCode?: string;
    };
    shippingMethodId?: string;
  };
  userDetails?: {
    userId?: string;
    email?: string;
    phoneNumber?: string;
  };
  sub?: string; // User identifier if profile.scope was requested
}

// Union type for all webhook payloads
type VippsWebhookBody = VippsChargeWebhookBody | VippsAgreementWebhookBody | VippsEPaymentWebhookBody;

// =============================================================================
// WEBHOOK UTILITIES
// =============================================================================

/**
 * Type guard to check if webhook is a Recurring API charge event
 */
function isRecurringChargeWebhook(body: VippsWebhookBody): body is VippsChargeWebhookBody {
  return 'chargeId' in body && 'agreementId' in body;
}

/**
 * Type guard to check if webhook is a Recurring API agreement event
 */
function isRecurringAgreementWebhook(body: VippsWebhookBody): body is VippsAgreementWebhookBody {
  return 'agreementId' in body && 'agreementUUID' in body && !('chargeId' in body);
}

/**
 * Type guard to check if webhook is an ePayment API event
 */
function isEPaymentWebhook(body: VippsWebhookBody): body is VippsEPaymentWebhookBody {
  return 'reference' in body && 'pspReference' in body && 'name' in body;
}

// =============================================================================
// WEBHOOK AUTHENTICATION
// =============================================================================

/**
 * Validate webhook request from Vipps using HMAC-SHA256 signature
 *
 * Vipps webhooks use HMAC-SHA256 for authentication:
 * 1. Verify content hash (x-ms-content-sha256)
 * 2. Construct signed string from method, path, and headers
 * 3. Verify HMAC signature
 *
 * See: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/
 */
function isValidVippsWebhook(request: NextRequest, body: string): boolean {
  // Get webhook secret from environment
  const webhookSecret = process.env.VIPPS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[Vipps Webhook] VIPPS_WEBHOOK_SECRET not configured');
    return false;
  }

  // Get required headers
  const authHeader = request.headers.get('authorization');
  const contentHashHeader = request.headers.get('x-ms-content-sha256');
  const dateHeader = request.headers.get('x-ms-date');
  const hostHeader = request.headers.get('host');

  if (!authHeader || !contentHashHeader || !dateHeader || !hostHeader) {
    console.error('[Vipps Webhook] Missing required headers');
    return false;
  }

  // 1. Verify content hash
  const expectedContentHash = crypto
    .createHash('sha256')
    .update(body)
    .digest('base64');

  if (contentHashHeader !== expectedContentHash) {
    console.error('[Vipps Webhook] Content hash mismatch');
    return false;
  }

  // 2. Construct signed string
  // Format: METHOD\nPATH_AND_QUERY\nx-ms-date;host;x-ms-content-sha256
  const url = new URL(request.url);
  const pathAndQuery = url.pathname + url.search;

  const signedString =
    `${request.method}\n` +
    `${pathAndQuery}\n` +
    `${dateHeader};${hostHeader};${contentHashHeader}`;

  // 3. Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedString)
    .digest('base64');

  const expectedAuth = `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${expectedSignature}`;

  // 4. Compare with provided authorization header
  if (authHeader !== expectedAuth) {
    console.error('[Vipps Webhook] Signature verification failed');
    console.error('[Vipps Webhook] Expected:', expectedAuth);
    console.error('[Vipps Webhook] Received:', authHeader);
    return false;
  }

  return true;
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * Vipps webhook endpoint
 *
 * Handles webhooks from both:
 * - Vipps Recurring API (recurring payments, agreements)
 * - Vipps ePayment API (one-time payments)
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Validate webhook authenticity using HMAC signature
    if (!isValidVippsWebhook(request, rawBody)) {
      console.error('[Vipps Webhook] Invalid authentication');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook body
    const body: VippsWebhookBody = JSON.parse(rawBody);

    console.log('[Vipps Webhook] Received webhook');
    console.log('[Vipps Webhook] Payload:', JSON.stringify(body, null, 2));

    // Route to appropriate handler based on webhook type
    if (isEPaymentWebhook(body)) {
      // ePayment API webhooks (one-time payments)
      await handleEPaymentWebhook(body);
    } else if (isRecurringChargeWebhook(body)) {
      // Recurring API charge webhooks
      await handleRecurringChargeWebhook(body);
    } else if (isRecurringAgreementWebhook(body)) {
      // Recurring API agreement webhooks
      await handleRecurringAgreementWebhook(body);
    } else {
      console.warn('[Vipps Webhook] Unknown webhook type');
      console.warn('[Vipps Webhook] Body:', JSON.stringify(body, null, 2));
    }

    // Always return 200 OK to acknowledge webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vipps Webhook] Error processing webhook:', error);
    console.error('[Vipps Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

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

  console.log(`[Vipps Webhook] Recurring charge event: ${eventType} for agreement ${agreementId}`);

  // Get subscription by agreement ID
  const subscription = await getSubscriptionByAgreementId(agreementId);

  if (!subscription) {
    console.error(`[Vipps Webhook] Subscription not found for agreement ${agreementId}`);
    return; // Return silently - subscription may have been deleted
  }

  // Route to appropriate handler
  switch (eventType) {
    case 'recurring.charge-reserved.v1':
      await handleChargeReserved(body, subscription);
      break;

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
      console.log(`[Vipps Webhook] Unknown charge event: ${eventType}`);
  }
}

/**
 * Route Recurring API agreement webhooks to appropriate handlers
 */
async function handleRecurringAgreementWebhook(body: VippsAgreementWebhookBody): Promise<void> {
  const { eventType, agreementId } = body;

  console.log(`[Vipps Webhook] Recurring agreement event: ${eventType} for agreement ${agreementId}`);

  // Get subscription by agreement ID
  const subscription = await getSubscriptionByAgreementId(agreementId);

  if (!subscription) {
    console.error(`[Vipps Webhook] Subscription not found for agreement ${agreementId}`);
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
      console.log(`[Vipps Webhook] Unknown agreement event: ${eventType}`);
  }
}

/**
 * Route ePayment API webhooks to appropriate handlers
 */
async function handleEPaymentWebhook(body: VippsEPaymentWebhookBody): Promise<void> {
  const { name, reference, pspReference } = body;

  console.log(`[Vipps Webhook] ePayment event: ${name} for reference ${reference}`);

  // Route to appropriate handler based on event name
  switch (name) {
    case 'CREATED':
      await handleEPaymentCreated(body);
      break;

    case 'AUTHORIZED':
      await handleEPaymentAuthorized(body);
      break;

    case 'CAPTURED':
      await handleEPaymentCaptured(body);
      break;

    case 'REFUNDED':
      await handleEPaymentRefunded(body);
      break;

    case 'CANCELLED':
      await handleEPaymentCancelled(body);
      break;

    case 'ABORTED':
      await handleEPaymentAborted(body);
      break;

    case 'EXPIRED':
      await handleEPaymentExpired(body);
      break;

    case 'TERMINATED':
      await handleEPaymentTerminated(body);
      break;

    default:
      console.log(`[Vipps Webhook] Unknown ePayment event: ${name}`);
  }
}

// =============================================================================
// CHARGE EVENT HANDLERS
// =============================================================================

/**
 * Handle recurring.charge-reserved.v1
 *
 * Charge was reserved (funds held). This is the first step in RESERVE_CAPTURE flow.
 * We immediately trigger capture to complete the payment.
 */
async function handleChargeReserved(
  webhook: VippsChargeWebhookBody,
  subscription: any
): Promise<void> {
  const { chargeId, agreementId, amount, currency, occurred } = webhook;

  console.log(`[Vipps Webhook] Charge reserved: ${chargeId} (${amount/100} ${currency})`);

  // Find or create payment record
  let payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    // Payment not found - might be initial charge, try to find by subscription
    console.warn(`[Vipps Webhook] Payment not found for charge ${chargeId}, finding by subscription`);
    const fallbackPayment = await getPaymentForSubscription(subscription.id);

    if (!fallbackPayment) {
      throw new Error(`Payment not found for charge ${chargeId}`);
    }

    // Update payment with charge metadata
    await updatePaymentWithMetadata(fallbackPayment.id, chargeId, {
      vipps_agreement_id: agreementId,
      vipps_charge_id: chargeId,
      vipps_status: 'RESERVED',
      vipps_amount: amount,
      vipps_currency: currency,
      occurred,
    });

    payment = fallbackPayment;
  }

  // Mark payment as authorized
  await authorizePayment(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'RESERVED',
    vipps_amount: amount,
    vipps_currency: currency,
    reserved_at: occurred,
  });

  // Immediately capture the reserved amount (automatic capture)
  try {
    const plan = await getSubscriptionPlanById(subscription.plan_id);
    await captureVippsCharge(
      agreementId,
      chargeId,
      amount,
      plan ? `${plan.name} - Payment capture` : 'Subscription payment capture'
    );

    console.log(`[Vipps Webhook] Capture triggered for charge ${chargeId}`);
    // Webhook will fire again with recurring.charge-captured.v1
  } catch (captureError) {
    console.error(`[Vipps Webhook] Capture failed:`, captureError);
    throw captureError;
  }
}

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

  console.log(`[Vipps Webhook] Charge captured: ${chargeId} (${(amountCaptured || amount)/100} ${currency})`);

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

  // Activate subscription if it's pending payment
  if (subscription.status === 'pending_payment') {
    console.log(`[Vipps Webhook] Activating new subscription ${subscription.id}`);

    // Get subscription plan
    const plan = await getSubscriptionPlanById(subscription.plan_id);

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Find available cleaner
    const availableCleaners = await findAvailableCleanerForSubscription(subscription);
    const cleanerId = availableCleaners.length > 0 ? availableCleaners[0].id : null;

    // Activate subscription
    let activatedSubscription;
    if (plan.billing_period === 'one_time') {
      activatedSubscription = await activateOneTimeSubscription(subscription.id, cleanerId);
    } else {
      activatedSubscription = await activateSubscription(subscription.id, cleanerId);
    }

    if (!activatedSubscription) {
      throw new Error('Failed to activate subscription');
    }

    console.log(`[Vipps Webhook] Subscription ${subscription.id} activated`);

    // Generate orders
    await generateOrdersForSubscription(
      activatedSubscription,
      plan,
      {
        street: subscription.delivery_street,
        postal_code: subscription.delivery_postal_code,
        city: subscription.delivery_city,
        country: subscription.delivery_country,
        special_instructions: subscription.delivery_special_instructions,
      }
    );

    console.log(`[Vipps Webhook] Initial orders generated for subscription ${subscription.id}`);
  } else {
    // Recurring charge succeeded - generate next batch of orders
    console.log(`[Vipps Webhook] Recurring charge succeeded for subscription ${subscription.id}`);

    const plan = await getSubscriptionPlanById(subscription.plan_id);

    if (plan) {
      await generateOrdersForSubscription(
        subscription,
        plan,
        {
          street: subscription.delivery_street,
          postal_code: subscription.delivery_postal_code,
          city: subscription.delivery_city,
          country: subscription.delivery_country,
          special_instructions: subscription.delivery_special_instructions,
        }
      );

      console.log(`[Vipps Webhook] Recurring orders generated for subscription ${subscription.id}`);
    }
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

  console.log(`[Vipps Webhook] Charge canceled: ${chargeId} (${(amountCanceled || 0)/100} canceled)`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for canceled charge ${chargeId}`);
    return;
  }

  // Update payment status to canceled
  // TODO: Add cancelPaymentWithMetadata function to payments.ts
  await updatePaymentWithMetadata(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'CANCELLED',
    vipps_amount_canceled: amountCanceled,
    canceled_at: occurred,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} marked as canceled`);
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

  console.log(`[Vipps Webhook] Charge refunded: ${chargeId} (${(amountRefunded || 0)/100} refunded)`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for refunded charge ${chargeId}`);
    return;
  }

  // Update payment status to refunded
  // TODO: Add refundPaymentWithMetadata function to payments.ts
  await updatePaymentWithMetadata(payment.id, chargeId, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'REFUNDED',
    vipps_amount_refunded: amountRefunded,
    refunded_at: occurred,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} marked as refunded`);
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

  console.error(`[Vipps Webhook] Charge failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Find payment record
  let payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    // Try to find by subscription
    payment = await getPaymentForSubscription(subscription.id);

    if (!payment) {
      console.error(`[Vipps Webhook] No payment found for failed charge ${chargeId}`);
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

  console.log(`[Vipps Webhook] Payment ${payment.id} marked as failed`);

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

  console.error(`[Vipps Webhook] Charge creation failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Log the error for investigation
  console.error('[Vipps Webhook] Charge creation failure details:', {
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
 */
async function handleAgreementActivated(
  webhook: VippsAgreementWebhookBody,
  subscription: any
): Promise<void> {
  const { agreementId, occurred } = webhook;

  console.log(`[Vipps Webhook] Agreement activated: ${agreementId}`);

  // Agreement is now active - this usually happens before first charge
  // Update subscription metadata to track activation
  // TODO: Update subscription with agreement activation timestamp if needed

  console.log(`[Vipps Webhook] Agreement ${agreementId} is active for subscription ${subscription.id}`);
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

  console.log(`[Vipps Webhook] Agreement rejected: ${agreementId}`);

  // User rejected the agreement - subscription should remain in pending state
  // No action needed as subscription is already pending payment

  console.warn(`[Vipps Webhook] Agreement ${agreementId} rejected by user for subscription ${subscription.id}`);
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

  console.log(`[Vipps Webhook] Agreement stopped: ${agreementId} by ${actor || 'unknown'}`);

  if (subscription.status === 'active') {
    // Cancel the subscription
    console.log(`[Vipps Webhook] Cancelling subscription ${subscription.id} due to stopped agreement`);

    // TODO: Implement cancelSubscription function in subscriptions.ts
    // await cancelSubscription(subscription.id, `Vipps agreement stopped by ${actor || 'user'}`);
    console.warn('[Vipps Webhook] Subscription cancellation not yet implemented');

    // NOTE: According to Vipps docs:
    // - RESERVED charges are NOT automatically cancelled (merchant can still capture)
    // - PENDING/DUE charges are cancelled
    // - New future charges will result in an error
  } else {
    console.log(`[Vipps Webhook] Agreement stopped but subscription ${subscription.id} is ${subscription.status}`);
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

  console.log(`[Vipps Webhook] Agreement expired: ${agreementId}`);

  // Agreement has expired - should stop creating new charges
  console.log(`[Vipps Webhook] Agreement ${agreementId} expired for subscription ${subscription.id}`);

  // TODO: Update subscription status or end date as needed
  // TODO: Consider if any cleanup is needed for expired agreements
}

// =============================================================================
// EPAYMENT EVENT HANDLERS
// =============================================================================

/**
 * Handle epayments.payment.created.v1
 *
 * Payment session was created.
 */
async function handleEPaymentCreated(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, amount } = webhook;

  console.log(`[Vipps Webhook] ePayment created: ${reference} (${amount.value/100} ${amount.currency})`);

  // Payment created - this is just notification that payment session started
  // No action needed yet - wait for AUTHORIZED or CAPTURED event
}

/**
 * Handle epayments.payment.authorized.v1
 *
 * Payment was authorized (funds reserved, not yet captured).
 */
async function handleEPaymentAuthorized(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, amount, timestamp, success } = webhook;

  console.log(`[Vipps Webhook] ePayment authorized: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps Webhook] ePayment authorization failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment to authorized
  await authorizePayment(payment.id, pspReference, {
    vipps_reference: reference,
    vipps_psp_reference: pspReference,
    vipps_status: 'AUTHORIZED',
    vipps_amount: amount.value,
    vipps_currency: amount.currency,
    authorized_at: timestamp,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} authorized - triggering auto-capture`);

  // Auto-capture immediately (same pattern as Recurring API)
  try {
    await captureVippsEPayment(reference, amount.value);
    console.log(`[Vipps Webhook] Auto-capture triggered for payment ${payment.id}`);
  } catch (error) {
    console.error(`[Vipps Webhook] Auto-capture failed for payment ${payment.id}:`, error);
    // Note: Capture webhook will handle the final status update
  }
}

/**
 * Handle epayments.payment.captured.v1
 *
 * Payment was captured (payment completed successfully).
 * Updates order status from pending_payment to pending_assignment/pickup_scheduled.
 */
async function handleEPaymentCaptured(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, amount, timestamp, success } = webhook;

  console.log(`[Vipps Webhook] ePayment captured: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps Webhook] ePayment capture failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment to captured
  await capturePaymentWithMetadata(payment.id, pspReference, {
    vipps_psp_reference: pspReference,
    vipps_status: 'CAPTURED',
    vipps_amount: amount.value,
    vipps_currency: amount.currency,
    captured_at: timestamp,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} captured successfully`);

  // If payment is for an order, update order status from pending_payment
  if (payment.order_id) {
    // Update order status to pending_assignment (will be auto-assigned later)
    await updateOrderStatus(payment.order_id, 'pending_assignment');
    console.log(`[Vipps Webhook] Order ${payment.order_id} status updated to pending_assignment`);
  }
}

/**
 * Handle epayments.payment.refunded.v1
 *
 * Payment was refunded (full or partial refund).
 */
async function handleEPaymentRefunded(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, amount, timestamp, success } = webhook;

  console.log(`[Vipps Webhook] ePayment refunded: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps Webhook] ePayment refund failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with refund info
  await updatePaymentWithMetadata(payment.id, pspReference, {
    vipps_psp_reference: pspReference,
    vipps_status: 'REFUNDED',
    vipps_amount_refunded: amount.value,
    vipps_currency: amount.currency,
    refunded_at: timestamp,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} refunded`);
}

/**
 * Handle epayments.payment.cancelled.v1
 *
 * Payment was cancelled by user or merchant.
 */
async function handleEPaymentCancelled(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps Webhook] ePayment cancelled: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with cancellation info
  await updatePaymentWithMetadata(payment.id, pspReference, {
    vipps_psp_reference: pspReference,
    vipps_status: 'CANCELLED',
    canceled_at: timestamp,
  });

  console.log(`[Vipps Webhook] Payment ${payment.id} cancelled`);
}

/**
 * Handle epayments.payment.aborted.v1
 *
 * Payment was aborted by user (user cancelled during payment flow).
 */
async function handleEPaymentAborted(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps Webhook] ePayment aborted: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with abort info
  await failPaymentWithMetadata(
    payment.id,
    'Payment aborted by user',
    {
      vipps_psp_reference: pspReference,
      vipps_status: 'ABORTED',
      aborted_at: timestamp,
    }
  );

  console.log(`[Vipps Webhook] Payment ${payment.id} aborted by user`);
}

/**
 * Handle epayments.payment.expired.v1
 *
 * Payment session expired (user didn't complete payment in time).
 */
async function handleEPaymentExpired(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps Webhook] ePayment expired: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with expiration info
  await failPaymentWithMetadata(
    payment.id,
    'Payment session expired',
    {
      vipps_psp_reference: pspReference,
      vipps_status: 'EXPIRED',
      expired_at: timestamp,
    }
  );

  console.log(`[Vipps Webhook] Payment ${payment.id} expired`);
}

/**
 * Handle epayments.payment.terminated.v1
 *
 * Payment was terminated (ended without completion).
 */
async function handleEPaymentTerminated(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps Webhook] ePayment terminated: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with termination info
  await failPaymentWithMetadata(
    payment.id,
    'Payment terminated',
    {
      vipps_psp_reference: pspReference,
      vipps_status: 'TERMINATED',
      terminated_at: timestamp,
    }
  );

  console.log(`[Vipps Webhook] Payment ${payment.id} terminated`);
}
