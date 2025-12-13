// API Route: Vipps ePayment API Webhook Handler
// POST /api/webhooks/vipps/epayment
//
// Authentication: HMAC-SHA256 signature verification (requires VIPPS_WEBHOOK_SECRET env var)
// See: https://developer.vippsmobilepay.com/docs/APIs/webhooks-api/
//
// Handles Vipps ePayment API webhook events for one-time payments:
//
// PAYMENT EVENTS:
// - epayments.payment.created.v1 → Payment session created
// - epayments.payment.authorized.v1 → Payment authorized (funds reserved) → Auto-capture
// - epayments.payment.captured.v1 → Payment captured → Update order status
// - epayments.payment.refunded.v1 → Payment refunded
// - epayments.payment.cancelled.v1 → Payment cancelled by user/merchant
// - epayments.payment.aborted.v1 → Payment aborted by user
// - epayments.payment.expired.v1 → Payment session expired
// - epayments.payment.terminated.v1 → Payment terminated

import { NextRequest, NextResponse } from 'next/server';
import { validateVippsWebhook, getVippsWebhookSecret } from '@/lib/payments/vipps/webhook-auth';
import { captureVippsEPayment } from '@/lib/payments/vipps/service';
import {
  getPaymentByReference,
  authorizePayment,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  updatePaymentWithMetadata,
} from '@/lib/database/payments';
import { updateOrderStatus } from '@/lib/database/orders';

// =============================================================================
// TYPES (Official Vipps API Contract)
// =============================================================================

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

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * Vipps ePayment API webhook endpoint
 *
 * Handles webhooks from Vipps ePayment API (one-time payments)
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Get webhook secret (tries VIPPS_WEBHOOK_SECRET_EPAYMENT first, falls back to VIPPS_WEBHOOK_SECRET)
    const webhookSecret = getVippsWebhookSecret('epayment');

    // Validate webhook authenticity using HMAC signature
    if (!validateVippsWebhook(request, rawBody, webhookSecret, '[Vipps ePayment Webhook]')) {
      console.error('[Vipps ePayment Webhook] Invalid authentication');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook body
    const body: VippsEPaymentWebhookBody = JSON.parse(rawBody);

    console.log('[Vipps ePayment Webhook] Received webhook');
    console.log('[Vipps ePayment Webhook] Payload:', JSON.stringify(body, null, 2));

    // Route to appropriate handler based on event name
    const { name, reference } = body;

    console.log(`[Vipps ePayment Webhook] Event: ${name} for reference ${reference}`);

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
        console.log(`[Vipps ePayment Webhook] Unknown event: ${name}`);
    }

    // Always return 200 OK to acknowledge webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vipps ePayment Webhook] Error processing webhook:', error);
    console.error('[Vipps ePayment Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Return 200 OK to prevent webhook retries for errors
    // Vipps will retry on non-200 responses, but these are likely permanent errors
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 }
    );
  }
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

  console.log(`[Vipps ePayment Webhook] Payment created: ${reference} (${amount.value/100} ${amount.currency})`);

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

  console.log(`[Vipps ePayment Webhook] Payment authorized: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps ePayment Webhook] Authorization failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment to authorized
  await authorizePayment(payment.id, {
    vipps_reference: reference,
    vipps_psp_reference: pspReference,
    vipps_status: 'AUTHORIZED',
    vipps_amount: amount.value,
    vipps_currency: amount.currency,
    authorized_at: timestamp,
  });

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} authorized - triggering auto-capture`);

  // Auto-capture immediately (same pattern as Recurring API)
  try {
    await captureVippsEPayment(reference, amount.value);
    console.log(`[Vipps ePayment Webhook] Auto-capture triggered for payment ${payment.id}`);
  } catch (error) {
    console.error(`[Vipps ePayment Webhook] Auto-capture failed for payment ${payment.id}:`, error);
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

  console.log(`[Vipps ePayment Webhook] Payment captured: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps ePayment Webhook] Capture failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment to captured
  await capturePaymentWithMetadata(payment.id, {
    vipps_psp_reference: pspReference,
    vipps_status: 'CAPTURED',
    vipps_amount: amount.value,
    vipps_currency: amount.currency,
    captured_at: timestamp,
  });

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} captured successfully`);

  // If payment is for an order, update order status from pending_payment
  if (payment.order_id) {
    // Check if cleaner is already assigned during order creation
    const { getOrderById } = await import('@/lib/database/orders');
    const order = await getOrderById(payment.order_id);

    // If cleaner already assigned, move to pickup_scheduled; otherwise pending_assignment
    const newStatus = order?.cleaner_id ? 'pickup_scheduled' : 'pending_assignment';
    await updateOrderStatus(payment.order_id, newStatus);
    console.log(`[Vipps ePayment Webhook] Order ${payment.order_id} status updated to ${newStatus}`);
  }
}

/**
 * Handle epayments.payment.refunded.v1
 *
 * Payment was refunded (full or partial refund).
 */
async function handleEPaymentRefunded(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, amount, timestamp, success } = webhook;

  console.log(`[Vipps ePayment Webhook] Payment refunded: ${reference} (${amount.value/100} ${amount.currency})`);

  if (!success) {
    console.error(`[Vipps ePayment Webhook] Refund failed for ${reference}`);
    return;
  }

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.error(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with refund info
  await updatePaymentWithMetadata(payment.id, {
    vipps_psp_reference: pspReference,
    vipps_status: 'REFUNDED',
    vipps_amount_refunded: amount.value,
    vipps_currency: amount.currency,
    refunded_at: timestamp,
  });

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} refunded`);
}

/**
 * Handle epayments.payment.cancelled.v1
 *
 * Payment was cancelled by user or merchant.
 */
async function handleEPaymentCancelled(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps ePayment Webhook] Payment cancelled: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
    return;
  }

  // Update payment with cancellation info
  await updatePaymentWithMetadata(payment.id, {
    vipps_psp_reference: pspReference,
    vipps_status: 'CANCELLED',
    canceled_at: timestamp,
  });

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} cancelled`);
}

/**
 * Handle epayments.payment.aborted.v1
 *
 * Payment was aborted by user (user cancelled during payment flow).
 */
async function handleEPaymentAborted(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps ePayment Webhook] Payment aborted: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
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

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} aborted by user`);
}

/**
 * Handle epayments.payment.expired.v1
 *
 * Payment session expired (user didn't complete payment in time).
 */
async function handleEPaymentExpired(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps ePayment Webhook] Payment expired: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
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

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} expired`);
}

/**
 * Handle epayments.payment.terminated.v1
 *
 * Payment was terminated (ended without completion).
 */
async function handleEPaymentTerminated(webhook: VippsEPaymentWebhookBody): Promise<void> {
  const { reference, pspReference, timestamp } = webhook;

  console.log(`[Vipps ePayment Webhook] Payment terminated: ${reference}`);

  // Find payment record
  const payment = await getPaymentByReference(reference);

  if (!payment) {
    console.warn(`[Vipps ePayment Webhook] Payment not found for reference ${reference}`);
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

  console.log(`[Vipps ePayment Webhook] Payment ${payment.id} terminated`);
}
