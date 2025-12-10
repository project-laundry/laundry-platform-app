// API Route: Vipps Webhook Handler
// POST /api/webhooks/vipps
//
// Handles Vipps webhook events for RESERVE_CAPTURE flow:
// 1. CHARGE_UPDATED (RESERVED) → Authorize payment → Capture charge
// 2. CHARGE_UPDATED (CHARGED) → Complete payment → Activate subscription → Generate orders
// 3. CHARGE_UPDATED (FAILED) → Mark payment as failed
// 4. AGREEMENT_UPDATED (STOPPED) → Cancel subscription

import { NextRequest, NextResponse } from 'next/server';
import { createVippsClient } from '@/lib/payments/vipps/client';
import { captureVippsCharge } from '@/lib/payments/vipps/service';
import {
  getSubscriptionByAgreementId,
  activateSubscription,
  activateOneTimeSubscription,
  getSubscriptionPlanById,
} from '@/lib/database/subscriptions';
import {
  getPaymentByAgreementAndCharge,
  authorizePayment,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  updatePaymentWithMetadata,
} from '@/lib/database/payments';
import { findAvailableCleanerForSubscription } from '@/lib/database/cleaners';
import { generateOrdersForSubscription } from '@/lib/services/order-generation';
import type { VippsPaymentMetadata } from '@/types/database';

// =============================================================================
// TYPES
// =============================================================================

interface VippsWebhookBody {
  msn: string; // Merchant serial number
  timestamp: string;
  event: 'CHARGE_CREATED' | 'CHARGE_UPDATED' | 'AGREEMENT_UPDATED';
  agreementId: string;
  chargeId?: string;
}

// =============================================================================
// WEBHOOK AUTHENTICATION
// =============================================================================

/**
 * Validate webhook request from Vipps
 * Vipps sends Authorization header with Basic auth
 */
function isValidVippsWebhook(authHeader: string | null): boolean {
  if (!authHeader) {
    return false;
  }

  // Expected format: "Basic base64(client_id:client_secret)"
  const expectedAuth = `Basic ${Buffer.from(
    `${process.env.VIPPS_CLIENT_ID}:${process.env.VIPPS_CLIENT_SECRET}`
  ).toString('base64')}`;

  return authHeader === expectedAuth;
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

/**
 * Vipps webhook endpoint
 *
 * Handles payment status updates for RESERVE_CAPTURE flow
 */
export async function POST(request: NextRequest) {
  try {
    // Validate webhook authenticity
    const authHeader = request.headers.get('authorization');

    if (!isValidVippsWebhook(authHeader)) {
      console.error('Invalid Vipps webhook authentication');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse webhook body
    const body: VippsWebhookBody = await request.json();
    const { event, agreementId, chargeId } = body;

    console.log(`[Vipps Webhook] Received event: ${event} for agreement ${agreementId}`);

    // Get subscription by agreement ID
    const subscription = await getSubscriptionByAgreementId(agreementId);

    if (!subscription) {
      console.error(`[Vipps Webhook] Subscription not found for agreement ${agreementId}`);
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Initialize Vipps client
    const vipps = createVippsClient();

    // Handle different webhook events
    switch (event) {
      case 'CHARGE_UPDATED':
        if (!chargeId) {
          return NextResponse.json(
            { error: 'Missing chargeId for CHARGE_UPDATED event' },
            { status: 400 }
          );
        }

        await handleChargeUpdated(
          vipps,
          subscription,
          agreementId,
          chargeId
        );
        break;

      case 'AGREEMENT_UPDATED':
        await handleAgreementUpdated(
          vipps,
          subscription,
          agreementId
        );
        break;

      default:
        console.log(`[Vipps Webhook] Ignoring event: ${event}`);
    }

    // Always return 200 OK to acknowledge webhook
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vipps Webhook] Error:', error);

    // Return 200 OK to prevent webhook retries for permanent errors
    // Log the error for manual investigation
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 200 } // Return 200 to prevent Vipps from retrying
    );
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle CHARGE_UPDATED event (RESERVE_CAPTURE flow)
 *
 * Flow:
 * 1. RESERVED → Authorize payment → Trigger capture
 * 2. CHARGED → Update payment → Activate subscription → Generate orders
 * 3. FAILED → Mark payment as failed
 */
async function handleChargeUpdated(
  vipps: ReturnType<typeof createVippsClient>,
  subscription: any,
  agreementId: string,
  chargeId: string
): Promise<void> {
  // Fetch charge details from Vipps
  const charge = await vipps.getCharge(agreementId, chargeId);

  console.log(`[Vipps Webhook] Charge ${chargeId} status: ${charge.status}`);

  // Find payment record
  const payment = await getPaymentByAgreementAndCharge(agreementId, chargeId);

  if (!payment) {
    // Payment not found - might be initial charge, try to find by agreement ID only
    console.warn(`[Vipps Webhook] Payment not found for charge ${chargeId}, attempting to find by subscription`);

    // Get the most recent payment for this subscription
    const { getPaymentForSubscription } = await import('@/lib/database/payments');
    const fallbackPayment = await getPaymentForSubscription(subscription.id);

    if (!fallbackPayment) {
      throw new Error(`Payment not found for charge ${chargeId}`);
    }

    // Update this payment with charge metadata
    await updatePaymentWithMetadata(fallbackPayment.id, chargeId, {
      vipps_agreement_id: agreementId,
      vipps_charge_id: chargeId,
    });

    // Use this payment for subsequent operations
    await handleChargeStatus(charge, fallbackPayment.id, subscription);
    return;
  }

  // Handle charge status
  await handleChargeStatus(charge, payment.id, subscription);
}

/**
 * Handle specific charge status (RESERVED, CHARGED, FAILED)
 */
async function handleChargeStatus(
  charge: any,
  paymentId: string,
  subscription: any
): Promise<void> {
  const metadata: VippsPaymentMetadata = {
    vipps_agreement_id: charge.id,
    vipps_charge_id: charge.id,
    vipps_transaction_id: charge.transactionId,
    vipps_status: charge.status,
  };

  switch (charge.status) {
    case 'RESERVED':
      // Step 1: Payment reserved - authorize and trigger capture
      console.log(`[Vipps Webhook] Payment reserved, authorizing and capturing...`);

      // Mark payment as authorized
      await authorizePayment(paymentId, charge.id, {
        ...metadata,
        reserved_at: new Date().toISOString(),
      });

      // Immediately capture the reserved amount (automatic capture)
      try {
        const plan = await getSubscriptionPlanById(subscription.plan_id);
        await captureVippsCharge(
          metadata.vipps_agreement_id!,
          charge.id,
          charge.amount,
          plan ? `${plan.name} - Payment capture` : 'Subscription payment capture'
        );

        console.log(`[Vipps Webhook] Capture triggered for charge ${charge.id}`);
        // Webhook will fire again with CHARGED status
      } catch (captureError) {
        console.error(`[Vipps Webhook] Capture failed:`, captureError);
        throw captureError;
      }
      break;

    case 'CHARGED':
      // Step 2: Payment captured successfully - activate subscription and generate orders
      console.log(`[Vipps Webhook] Payment captured, activating subscription...`);

      // Update payment to captured
      await capturePaymentWithMetadata(paymentId, charge.id, {
        ...metadata,
        captured_at: new Date().toISOString(),
      });

      // Activate subscription if it's pending payment
      if (subscription.status === 'pending_payment') {
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
          activatedSubscription = await activateOneTimeSubscription(
            subscription.id,
            cleanerId
          );
        } else {
          activatedSubscription = await activateSubscription(
            subscription.id,
            cleanerId
          );
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

        console.log(`[Vipps Webhook] Orders generated for subscription ${subscription.id}`);
      } else {
        // Recurring charge succeeded - generate next batch of orders
        console.log(`[Vipps Webhook] Recurring charge succeeded, generating orders...`);

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
      break;

    case 'FAILED':
      // Payment failed
      console.error(`[Vipps Webhook] Payment failed for charge ${charge.id}`);

      await failPaymentWithMetadata(
        paymentId,
        'Vipps charge failed',
        metadata
      );

      // TODO: Send customer notification about failed payment
      // TODO: Handle retry logic or subscription pausing after multiple failures
      break;

    default:
      console.log(`[Vipps Webhook] Ignoring charge status: ${charge.status}`);
  }
}

/**
 * Handle AGREEMENT_UPDATED event
 */
async function handleAgreementUpdated(
  vipps: ReturnType<typeof createVippsClient>,
  subscription: any,
  agreementId: string
): Promise<void> {
  // Fetch agreement details
  const agreement = await vipps.getAgreement(agreementId);

  console.log(`[Vipps Webhook] Agreement ${agreementId} status: ${agreement.status}`);

  // Handle agreement status changes
  if (agreement.status === 'STOPPED' && subscription.status === 'active') {
    // Customer stopped agreement - cancel subscription
    console.log(`[Vipps Webhook] Cancelling subscription ${subscription.id} due to stopped agreement`);

    // TODO: Implement cancelSubscription function
    // await cancelSubscription(subscription.id, 'Customer stopped Vipps agreement');
    console.warn('[Vipps Webhook] Subscription cancellation not yet implemented');
  }
}
