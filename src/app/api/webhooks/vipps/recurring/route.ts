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
// - recurring.charge-captured.v1 → Complete payment
// - recurring.charge-canceled.v1 → Mark payment as canceled
// - recurring.charge-refunded.v1 → Process refund
// - recurring.charge-failed.v1 → Mark payment as failed
// - recurring.charge-creation-failed.v1 → Handle charge creation failure
//
// AGREEMENT EVENTS:
// - recurring.agreement-activated.v1 → Agreement accepted by user → Activate payment agreement + subscription (if any) → Generate first order
//   (idempotent: status-guarded updates + first-order existence check, because Vipps delivers at-least-once)
//
// RESPONSE CODES: 401 bad signature; 200 for anything a retry can never fix (unknown
// agreement/charge, malformed body, activation of a stopped agreement); 500 when a
// handler throws on a transient failure (DB write returned null, lost activation race)
// so Vipps retries with its backoff (2 s ×4, 60 s, 120 s, hourly, daily, up to 7 days).
// Vipps holds back later webhooks until it gets a 200, so never 5xx a permanent error.
// - recurring.agreement-rejected.v1 → Agreement rejected by user → Stop payment agreement + cancel subscription (if any)
// - recurring.agreement-stopped.v1 → Agreement stopped by user/merchant/admin → Stop payment agreement + cancel subscription (if any)
// - recurring.agreement-expired.v1 → Agreement expired → Expire payment agreement + expire subscription (if any)

import { NextRequest, NextResponse } from 'next/server';
import { validateVippsWebhook, getVippsWebhookSecret } from '@/lib/payments/vipps/webhook-auth';
import {
  getPaymentAgreementByProviderId,
  activatePaymentAgreement,
  stopPaymentAgreement,
  expirePaymentAgreement,
  getSubscriptionByPaymentAgreementId,
} from '@/lib/database/payment-agreements';
import {
  activateSubscriptionOnAgreementActivation,
  cancelSubscription,
  expireSubscription,
} from '@/lib/database/subscriptions';
import {
  getPaymentByReference,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  cancelPaymentWithMetadata,
  refundPaymentWithMetadata,
} from '@/lib/database/payments';
import { cancelVippsAgreement, stopVippsAgreementForCancelledSubscription } from '@/lib/payments/vipps/service';
import { createOrder, getOrderByPaymentAgreementId } from '@/lib/database/orders';
import { buildOrderData } from '@/lib/services/order-generation';
import { recordPromoRedemption } from '@/lib/database/promo-codes';
import { addDays, toISODateString, getWeekdayFromDate, getNextOccurrenceOfWeekday } from '@/lib/utils/date';
import { DAYS_PICKUP_TO_DELIVERY } from '@/lib/config/order-timing';
import type { PaymentAgreement, SubscriptionOrderDefaults, OrderPromo } from '@/types/database';


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

    // Parse webhook body. A body that isn't JSON can never be processed, so it
    // is acknowledged (200) instead of being retried for 7 days.
    let body: VippsRecurringWebhookBody;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Vipps Recurring Webhook] Malformed JSON body:', rawBody);
      return NextResponse.json({ success: false, error: 'Malformed body' }, { status: 200 });
    }

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

    // 200 OK acknowledges the webhook; Vipps stops retrying this event.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vipps Recurring Webhook] Error processing webhook:', error);
    console.error('[Vipps Recurring Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // 500 makes Vipps retry (see RESPONSE CODES at the top of this file).
    // Handlers only throw on failures a retry can fix; permanent conditions
    // return normally and are acknowledged with 200 above.
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
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

  // Get payment agreement by provider agreement ID
  const paymentAgreement = await getPaymentAgreementByProviderId(agreementId);

  if (!paymentAgreement) {
    console.error(`[Vipps Recurring Webhook] Payment agreement not found for agreement ${agreementId}`);
    return; // Return silently - agreement may have been deleted
  }

  // Route to appropriate handler
  switch (eventType) {
    case 'recurring.charge-captured.v1':
      await handleChargeCaptured(body);
      break;

    case 'recurring.charge-canceled.v1':
      await handleChargeCanceled(body);
      break;

    case 'recurring.charge-refunded.v1':
      await handleChargeRefunded(body);
      break;

    case 'recurring.charge-failed.v1':
      await handleChargeFailed(body);
      break;

    case 'recurring.charge-creation-failed.v1':
      await handleChargeCreationFailed(body, paymentAgreement);
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

  // Get payment agreement by provider agreement ID
  const paymentAgreement = await getPaymentAgreementByProviderId(agreementId);

  if (!paymentAgreement) {
    console.error(`[Vipps Recurring Webhook] Payment agreement not found for agreement ${agreementId}`);
    return; // Return silently - agreement may have been deleted
  }

  // Route to appropriate handler
  switch (eventType) {
    case 'recurring.agreement-activated.v1':
      await handleAgreementActivated(body, paymentAgreement);
      break;

    case 'recurring.agreement-rejected.v1':
      await handleAgreementRejected(body, paymentAgreement);
      break;

    case 'recurring.agreement-stopped.v1':
      await handleAgreementStopped(body, paymentAgreement);
      break;

    case 'recurring.agreement-expired.v1':
      await handleAgreementExpired(body, paymentAgreement);
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
 * Charge was captured (payment completed).
 * With FLEXIBLE pricing, charges are created per-order after cleaner calculates price.
 * This handler only marks the payment as captured - no order generation or next charge creation.
 */
async function handleChargeCaptured(
  webhook: VippsChargeWebhookBody
): Promise<void> {
  const { chargeId, agreementId, amount, amountCaptured, currency, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge captured: ${chargeId} (${(amountCaptured || amount)/100} ${currency})`);

  // Find payment record
  const payment = await getPaymentByReference(chargeId);

  if (!payment) {
    // No payment row carries this charge id (e.g. a charge created outside the
    // app). A retry can't change that, so acknowledge instead of throwing —
    // a 5xx here would make Vipps retry for 7 days and hold back later webhooks.
    console.error(`[Vipps Recurring Webhook] Payment not found for captured charge ${chargeId}`);
    return;
  }

  // Update payment to captured
  const captured = await capturePaymentWithMetadata(payment.id, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'CHARGED',
    vipps_amount: amount,
    vipps_amount_captured: amountCaptured,
    vipps_currency: currency,
    captured_at: occurred,
  });
  if (!captured) {
    throw new Error(`Failed to mark payment ${payment.id} as captured`);
  }

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} marked as captured`);

  // For one-time orders, stop the agreement now that the charge is captured.
  // A one-time agreement has no linked subscription. It is safe to stop here:
  // the only charge is already CHARGED, and stopping only cancels PENDING/DUE/RESERVED charges.
  // (We must NOT stop earlier, e.g. at charge creation, or the still-pending charge would be cancelled.)
  // For a recurring subscription that was cancelled while this order was in-flight, this is the
  // deferred stop's other trigger: the last charge just cleared, so stop the agreement now.
  try {
    const paymentAgreement = await getPaymentAgreementByProviderId(agreementId);

    if (paymentAgreement && paymentAgreement.status === 'active') {
      const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);

      if (!subscription) {
        console.log(`[Vipps Recurring Webhook] One-time order charged - stopping agreement ${agreementId}`);
        await cancelVippsAgreement(agreementId);
        await stopPaymentAgreement(paymentAgreement.id);
      } else if (subscription.status === 'cancelled') {
        console.log(`[Vipps Recurring Webhook] Final charge captured for cancelled subscription ${subscription.id} - stopping agreement`);
        await stopVippsAgreementForCancelledSubscription(subscription.id);
      }
    }
  } catch (error) {
    // Don't fail the captured-payment handler if cleanup fails - the payment is already secured.
    // The agreement can be stopped manually if needed.
    console.error('[Vipps Recurring Webhook] Failed to stop one-time agreement after capture:', error);
  }

  // Orders are generated when agreement is activated.
  // Charges are created by cleaners after calculating price per order.
}

/**
 * Handle recurring.charge-canceled.v1
 *
 * Charge was fully or partially cancelled.
 */
async function handleChargeCanceled(
  webhook: VippsChargeWebhookBody
): Promise<void> {
  const { chargeId, agreementId, amountCanceled, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge canceled: ${chargeId} (${(amountCanceled || 0)/100} canceled)`);

  // Find payment record
  const payment = await getPaymentByReference(chargeId);

  if (!payment) {
    console.warn(`[Vipps Recurring Webhook] Payment not found for canceled charge ${chargeId}`);
    return;
  }

  // Flip the row to cancelled (and stamp cancelled_at); the Vipps details go in metadata.
  await cancelPaymentWithMetadata(payment.id, {
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
 * Charge was fully or partially refunded. The status only becomes 'refunded'
 * on a full refund; a partial refund keeps 'captured' but records the amount.
 */
async function handleChargeRefunded(
  webhook: VippsChargeWebhookBody
): Promise<void> {
  const { chargeId, agreementId, amount, amountRefunded, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge refunded: ${chargeId} (${(amountRefunded || 0)/100} refunded)`);

  // Find payment record
  const payment = await getPaymentByReference(chargeId);

  if (!payment) {
    console.warn(`[Vipps Recurring Webhook] Payment not found for refunded charge ${chargeId}`);
    return;
  }

  // Vipps reports the refunded total; fall back to the charge amount if absent.
  const refundedOre = amountRefunded ?? amount;
  const fullRefund = refundedOre >= payment.amount_ore;

  await refundPaymentWithMetadata(payment.id, refundedOre, fullRefund, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'REFUNDED',
    vipps_amount_refunded: amountRefunded,
    refunded_at: occurred,
  });

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} ${fullRefund ? 'marked as refunded' : 'partially refunded'}`);
}

/**
 * Handle recurring.charge-failed.v1
 *
 * Charge failed and will no longer be retried by Vipps.
 */
async function handleChargeFailed(
  webhook: VippsChargeWebhookBody
): Promise<void> {
  const { chargeId, agreementId, failureReason, failureCode, occurred } = webhook;

  console.error(`[Vipps Recurring Webhook] Charge failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Find payment record by charge ID
  const payment = await getPaymentByReference(chargeId);

  if (!payment) {
    console.error(`[Vipps Recurring Webhook] Payment not found for failed charge ${chargeId}`);
    return;
  }

  // Mark payment as failed
  const failed = await failPaymentWithMetadata(
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
  if (!failed) {
    throw new Error(`Failed to mark payment ${payment.id} as failed`);
  }

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
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { chargeId, agreementId, failureReason, failureCode } = webhook;

  console.error(`[Vipps Recurring Webhook] Charge creation failed: ${chargeId} - ${failureReason} (code: ${failureCode})`);

  // Log the error for investigation
  console.error('[Vipps Recurring Webhook] Charge creation failure details:', {
    agreementId,
    chargeId,
    failureCode,
    failureReason,
    paymentAgreementId: paymentAgreement.id,
  });

  // TODO: Send admin notification about charge creation failure
}

// =============================================================================
// AGREEMENT EVENT HANDLERS
// =============================================================================

/**
 * Handle recurring.agreement-activated.v1
 *
 * Agreement was accepted/activated by the user.
 * 1. Activates the payment agreement (guarded on status = 'pending')
 * 2. If linked subscription exists: activate it (guarded) and generate first order
 * 3. If no subscription (one-time order): generate order directly from payment agreement metadata
 *
 * Idempotent: Vipps delivers at-least-once and two deliveries can overlap.
 * - pending  → guarded activate; if the update touches no row (a concurrent
 *              delivery won, or the write failed) throw: Vipps retries ~2 s
 *              later and that retry lands in one of the branches below.
 * - active   → duplicate/retry: skip activation, still make sure the first
 *              order exists (an earlier attempt may have died before creating it).
 * - stopped/expired → cancelled from our side while still pending (or by
 *              Vipps): ignore, never resurrect.
 */
async function handleAgreementActivated(
  webhook: VippsAgreementWebhookBody,
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { agreementId } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement activated: ${agreementId}`);

  // 1. Activate payment agreement (status-guarded)
  if (paymentAgreement.status === 'pending') {
    const activatedAgreement = await activatePaymentAgreement(paymentAgreement.id);
    if (!activatedAgreement) {
      throw new Error(
        `Payment agreement ${paymentAgreement.id} was not activated (no longer pending, or the update failed) — leaving it to the Vipps retry`
      );
    }
    console.log(`[Vipps Recurring Webhook] Payment agreement ${paymentAgreement.id} activated`);
  } else if (paymentAgreement.status === 'active') {
    console.log(`[Vipps Recurring Webhook] Payment agreement ${paymentAgreement.id} already active (duplicate delivery) — ensuring the first order exists`);
  } else {
    console.log(`[Vipps Recurring Webhook] Payment agreement ${paymentAgreement.id} is ${paymentAgreement.status} — ignoring activation`);
    return;
  }

  // 2. Check if there's a linked subscription
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);

  if (subscription) {
    // RECURRING ORDER: Activate subscription and generate first order
    await handleSubscriptionActivation(paymentAgreement, subscription);
  } else {
    // ONE-TIME ORDER: Generate order directly from payment agreement metadata
    await handleOneTimeOrderCreation(paymentAgreement);
  }
}

/**
 * Handle subscription activation and first order generation (recurring orders).
 * Status-guarded like the agreement: pending_payment → activate; active →
 * duplicate, skip; anything else (cancelled/expired/paused) → no order.
 * Errors propagate so the route answers 500 and Vipps retries.
 */
async function handleSubscriptionActivation(
  paymentAgreement: PaymentAgreement,
  subscription: { id: string; customer_id: string; status: string; order_defaults: unknown }
): Promise<void> {
  if (subscription.status === 'pending_payment') {
    const activatedSubscription = await activateSubscriptionOnAgreementActivation(subscription.id);
    if (!activatedSubscription) {
      throw new Error(
        `Subscription ${subscription.id} was not activated (no longer pending_payment, or the update failed) — leaving it to the Vipps retry`
      );
    }
    console.log(`[Vipps Recurring Webhook] Subscription ${subscription.id} activated`);
  } else if (subscription.status === 'active') {
    console.log(`[Vipps Recurring Webhook] Subscription ${subscription.id} already active (duplicate delivery)`);
  } else {
    console.log(`[Vipps Recurring Webhook] Subscription ${subscription.id} is ${subscription.status} — not generating an order`);
    return;
  }

  // Generate first order
  const orderDefaults = subscription.order_defaults as SubscriptionOrderDefaults | null;
  if (!orderDefaults?.initial_address) {
    throw new Error(`No order_defaults found in subscription ${subscription.id}`);
  }

  await generateFirstOrder(
    subscription.customer_id,
    orderDefaults,
    subscription.id,
    paymentAgreement.id,
    readPromoFromAgreement(paymentAgreement),
  );
}

/**
 * Handle one-time order creation (no subscription).
 * Errors propagate so the route answers 500 and Vipps retries.
 */
async function handleOneTimeOrderCreation(
  paymentAgreement: PaymentAgreement
): Promise<void> {
  console.log(`[Vipps Recurring Webhook] No linked subscription - creating one-time order`);

  // Read order_defaults from payment agreement metadata
  const metadata = paymentAgreement.provider_metadata as { order_defaults?: SubscriptionOrderDefaults } | null;
  const orderDefaults = metadata?.order_defaults;

  if (!orderDefaults?.initial_address) {
    throw new Error(`No order_defaults found in payment agreement ${paymentAgreement.id} metadata`);
  }

  await generateFirstOrder(
    paymentAgreement.customer_id,
    orderDefaults,
    null, // no subscription_id
    paymentAgreement.id,
    readPromoFromAgreement(paymentAgreement),
  );
}

/**
 * Read the locked promo snapshot (if any) from a payment agreement's metadata.
 * Stored at checkout for both recurring and one-time orders.
 */
function readPromoFromAgreement(paymentAgreement: PaymentAgreement): OrderPromo | null {
  const metadata = paymentAgreement.provider_metadata as { promo?: OrderPromo } | null;
  return metadata?.promo ?? null;
}

/**
 * Generate the first order from order defaults
 * Used by both subscription and one-time order flows.
 *
 * Idempotent: the first order is the one that carries payment_agreement_id
 * (rolling-window orders don't), so an existing order for this agreement means
 * an earlier delivery already got here — skip the insert and only make sure
 * the (idempotent) promo redemption is recorded.
 */
async function generateFirstOrder(
  customerId: string,
  orderDefaults: SubscriptionOrderDefaults,
  subscriptionId: string | null,
  paymentAgreementId: string,
  promo: OrderPromo | null,
): Promise<void> {
  const existingOrder = await getOrderByPaymentAgreementId(paymentAgreementId);
  if (existingOrder) {
    if (promo) {
      await recordPromoRedemption({
        promoCodeId: promo.promo_code_id,
        customerId,
        paymentAgreementId,
        orderId: existingOrder.id,
      });
    }
    console.log(`[Vipps Recurring Webhook] First order ${existingOrder.order_number} already exists for payment agreement ${paymentAgreementId} — skipping`);
    return;
  }

  // Calculate first pickup date
  const storedDate = new Date(orderDefaults.first_pickup_date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let pickupDate: Date;

  if (storedDate >= now) {
    pickupDate = storedDate;
    console.log(`[Vipps Recurring Webhook] Using user's chosen first pickup date: ${toISODateString(pickupDate)}`);
  } else {
    // Safety fallback: if stored date has passed
    const weekday = getWeekdayFromDate(orderDefaults.first_pickup_date);
    pickupDate = getNextOccurrenceOfWeekday(new Date(), weekday);
    console.log(`[Vipps Recurring Webhook] Stored date passed, using next ${weekday}: ${toISODateString(pickupDate)}`);
  }

  const deliveryDate = addDays(pickupDate, DAYS_PICKUP_TO_DELIVERY);

  // Use the shared builder so the first order's field mapping (address,
  // coordinates, service prefs) stays identical to the rolling-window orders.
  const order = await createOrder(
    buildOrderData(orderDefaults, {
      customerId,
      subscriptionId,
      paymentAgreementId,
      pickupDate,
      deliveryDate,
      promo,
    })
  );

  if (!order) {
    // createOrder already logged the Supabase error. Throw so the route answers
    // 500 and Vipps retries; the existence check above makes the retry safe.
    throw new Error(`Failed to create first order for payment agreement ${paymentAgreementId}`);
  }

  // Record the redemption now that a first order exists (committed customer).
  // Idempotent via UNIQUE(promo_code_id, customer_id) — safe on webhook retries.
  if (promo) {
    await recordPromoRedemption({
      promoCodeId: promo.promo_code_id,
      customerId,
      paymentAgreementId,
      orderId: order.id,
    });
  }
  console.log(`[Vipps Recurring Webhook] Order ${order.order_number} created (pickup: ${order.scheduled_date}, subscription: ${subscriptionId || 'none'}${promo ? `, promo: ${promo.code}` : ''})`);
}

/**
 * Handle recurring.agreement-rejected.v1
 *
 * Agreement was rejected by the user (user declined to approve).
 */
async function handleAgreementRejected(
  webhook: VippsAgreementWebhookBody,
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { agreementId, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement rejected: ${agreementId}`);

  // Stop payment agreement (re-runnable: a retry just re-stamps stopped_at)
  const stopped = await stopPaymentAgreement(paymentAgreement.id);
  if (!stopped) {
    throw new Error(`Failed to stop payment agreement ${paymentAgreement.id}`);
  }

  // Cancel linked subscription if exists
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription) {
    const cancelled = await cancelSubscription(subscription.id, occurred, 'Agreement rejected by user');
    if (!cancelled) {
      throw new Error(`Failed to cancel subscription ${subscription.id}`);
    }
  }
}

/**
 * Handle recurring.agreement-stopped.v1
 *
 * Agreement was stopped (by user, merchant, or admin).
 */
async function handleAgreementStopped(
  webhook: VippsAgreementWebhookBody,
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { agreementId, actor, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement stopped: ${agreementId} by ${actor || 'unknown'}`);

  // If actor is MERCHANT, we stopped it ourselves (user cancelled from our dashboard)
  // Database updates were already handled, so just acknowledge the webhook
  if (actor === 'MERCHANT') {
    console.log(`[Vipps Recurring Webhook] Agreement stopped by MERCHANT - database already updated, skipping`);
    return;
  }

  // Stop payment agreement (re-runnable: a retry just re-stamps stopped_at)
  const stopped = await stopPaymentAgreement(paymentAgreement.id);
  if (!stopped) {
    throw new Error(`Failed to stop payment agreement ${paymentAgreement.id}`);
  }

  // Cancel linked subscription if exists and is active
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription && subscription.status === 'active') {
    const cancelled = await cancelSubscription(
      subscription.id,
      occurred,
      `Agreement stopped by ${actor || 'user'}`
    );
    if (!cancelled) {
      throw new Error(`Failed to cancel subscription ${subscription.id}`);
    }

    // NOTE: According to Vipps docs:
    // - RESERVED charges are NOT automatically cancelled (merchant can still capture)
    // - PENDING/DUE charges are cancelled
    // - New future charges will result in an error
  }
}

/**
 * Handle recurring.agreement-expired.v1
 *
 * Agreement has expired (reached end date).
 */
async function handleAgreementExpired(
  webhook: VippsAgreementWebhookBody,
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { agreementId } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement expired: ${agreementId}`);

  // Expire payment agreement (re-runnable)
  const expired = await expirePaymentAgreement(paymentAgreement.id);
  if (!expired) {
    throw new Error(`Failed to expire payment agreement ${paymentAgreement.id}`);
  }

  // Expire linked subscription if exists
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription) {
    const expiredSubscription = await expireSubscription(subscription.id);
    if (!expiredSubscription) {
      throw new Error(`Failed to expire subscription ${subscription.id}`);
    }
  }
}
