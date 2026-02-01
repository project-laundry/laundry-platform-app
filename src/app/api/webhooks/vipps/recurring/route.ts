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
  updatePaymentWithMetadata,
} from '@/lib/database/payments';
import { createOrder } from '@/lib/database/orders';
import { addDays, toISODateString, getWeekdayFromDate, getNextOccurrenceOfWeekday } from '@/lib/utils/date';
import { DAYS_PICKUP_TO_DELIVERY } from '@/lib/config/order-timing';
import type { OrderStatus, PaymentAgreement, SubscriptionOrderDefaults } from '@/types/database';


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
    throw new Error(`Payment not found for captured charge ${chargeId}`);
  }

  // Update payment to captured
  await capturePaymentWithMetadata(payment.id, {
    vipps_agreement_id: agreementId,
    vipps_charge_id: chargeId,
    vipps_status: 'CHARGED',
    vipps_amount: amount,
    vipps_amount_captured: amountCaptured,
    vipps_currency: currency,
    captured_at: occurred,
  });

  console.log(`[Vipps Recurring Webhook] Payment ${payment.id} marked as captured`);

  // That's it! No order generation or next charge creation.
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

  // Update payment status to canceled
  await updatePaymentWithMetadata(payment.id, {
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
  webhook: VippsChargeWebhookBody
): Promise<void> {
  const { chargeId, agreementId, amountRefunded, occurred } = webhook;

  console.log(`[Vipps Recurring Webhook] Charge refunded: ${chargeId} (${(amountRefunded || 0)/100} refunded)`);

  // Find payment record
  const payment = await getPaymentByReference(chargeId);

  if (!payment) {
    console.warn(`[Vipps Recurring Webhook] Payment not found for refunded charge ${chargeId}`);
    return;
  }

  // Update payment status to refunded
  await updatePaymentWithMetadata(payment.id, {
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
 * 1. Activates the payment agreement
 * 2. If linked subscription exists: activate it and generate first order
 * 3. If no subscription (one-time order): generate order directly from payment agreement metadata
 */
async function handleAgreementActivated(
  webhook: VippsAgreementWebhookBody,
  paymentAgreement: PaymentAgreement
): Promise<void> {
  const { agreementId } = webhook;

  console.log(`[Vipps Recurring Webhook] Agreement activated: ${agreementId}`);

  // 1. Activate payment agreement
  const activatedAgreement = await activatePaymentAgreement(paymentAgreement.id);
  if (!activatedAgreement) {
    throw new Error(`Failed to activate payment agreement ${paymentAgreement.id}`);
  }

  console.log(`[Vipps Recurring Webhook] Payment agreement ${paymentAgreement.id} activated`);

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
 * Handle subscription activation and first order generation (recurring orders)
 */
async function handleSubscriptionActivation(
  paymentAgreement: PaymentAgreement,
  subscription: { id: string; customer_id: string; order_defaults: unknown }
): Promise<void> {
  // Activate subscription
  const activatedSubscription = await activateSubscriptionOnAgreementActivation(subscription.id);

  if (!activatedSubscription) {
    throw new Error(`Failed to activate subscription ${subscription.id} on agreement activation`);
  }

  console.log(`[Vipps Recurring Webhook] Subscription ${subscription.id} activated`);

  // Generate first order
  try {
    const orderDefaults = activatedSubscription.order_defaults as SubscriptionOrderDefaults;
    if (!orderDefaults?.initial_address) {
      throw new Error('No order_defaults found in subscription');
    }

    await generateFirstOrder(
      activatedSubscription.customer_id,
      orderDefaults,
      activatedSubscription.id,
      paymentAgreement.id,
    );
  } catch (error) {
    console.error(`[Vipps Recurring Webhook] Failed to generate first order for subscription:`, error);
    // Don't throw - subscription is already activated
  }
}

/**
 * Handle one-time order creation (no subscription)
 */
async function handleOneTimeOrderCreation(
  paymentAgreement: PaymentAgreement
): Promise<void> {
  console.log(`[Vipps Recurring Webhook] No linked subscription - creating one-time order`);

  try {
    // Read order_defaults from payment agreement metadata
    const metadata = paymentAgreement.provider_metadata as { order_defaults?: SubscriptionOrderDefaults } | null;
    const orderDefaults = metadata?.order_defaults;

    if (!orderDefaults?.initial_address) {
      throw new Error('No order_defaults found in payment agreement metadata');
    }

    await generateFirstOrder(
      paymentAgreement.customer_id,
      orderDefaults,
      null, // no subscription_id
      paymentAgreement.id,
    );
  } catch (error) {
    console.error(`[Vipps Recurring Webhook] Failed to generate one-time order:`, error);
    // Don't throw - payment agreement is already activated
  }
}

/**
 * Generate the first order from order defaults
 * Used by both subscription and one-time order flows
 */
async function generateFirstOrder(
  customerId: string,
  orderDefaults: SubscriptionOrderDefaults,
  subscriptionId: string | null,
  paymentAgreementId: string,
): Promise<void> {
  const address = orderDefaults.initial_address;
  const defaultCleanerId = orderDefaults.default_cleaner_id;
  const needsIroning = orderDefaults.default_needs_ironing;

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

  const orderStatus: OrderStatus = defaultCleanerId
    ? 'pickup_scheduled'
    : 'pending_assignment';

  const order = await createOrder({
    customer_id: customerId,
    subscription_id: subscriptionId,
    payment_agreement_id: paymentAgreementId,
    cleaner_id: defaultCleanerId,
    status: orderStatus,
    street: address.street,
    postal_code: address.postal_code,
    city: address.city,
    country: address.country,
    special_instructions_address: address.special_instructions,
    scheduled_date: toISODateString(pickupDate),
    delivery_date: toISODateString(deliveryDate),
    special_instructions: orderDefaults.special_instructions,
    needs_ironing: needsIroning,
    total_cost_ore: null,
  });

  if (order) {
    console.log(`[Vipps Recurring Webhook] Order ${order.order_number} created (pickup: ${order.scheduled_date}, subscription: ${subscriptionId || 'none'})`);
  } else {
    console.error(`[Vipps Recurring Webhook] Failed to create order`);
  }
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

  // Stop payment agreement
  await stopPaymentAgreement(paymentAgreement.id);

  // Cancel linked subscription if exists
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription) {
    await cancelSubscription(subscription.id, occurred, 'Agreement rejected by user');
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

  // Stop payment agreement
  await stopPaymentAgreement(paymentAgreement.id);

  // Cancel linked subscription if exists and is active
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription && subscription.status === 'active') {
    await cancelSubscription(
      subscription.id,
      occurred,
      `Agreement stopped by ${actor || 'user'}`
    );

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

  // Expire payment agreement
  await expirePaymentAgreement(paymentAgreement.id);

  // Expire linked subscription if exists
  const subscription = await getSubscriptionByPaymentAgreementId(paymentAgreement.id);
  if (subscription) {
    await expireSubscription(subscription.id);
  }
}
