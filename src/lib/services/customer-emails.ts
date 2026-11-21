// Customer e-mail sending — loads what each e-mail needs, builds it
// (lib/email/customer-emails.ts) and sends it through Resend (lib/email/send.ts).
//
// Every function here NEVER throws and returns void: the callers are the
// Vipps webhook and the cleaner's/admin's server actions, and a lost e-mail
// must never fail an order transition or make Vipps retry a webhook. Problems
// are logged with the order/payment id (find them in the Vercel logs; the
// Resend dashboard is the delivery log). Resend's Idempotency-Key (24 h)
// makes a repeated call for the same entity a no-op, so webhook retries and
// double-taps cannot send twice. Plain module, not a server action: it only
// runs behind the role-guarded callers.

import { COMPANY } from '@/lib/config/company';
import { getOrderForCustomerEmail, type OrderForCustomerEmail } from '@/lib/database/orders';
import {
  buildOrderConfirmationEmail,
  buildOrderDeliveredEmail,
  buildPaymentFailedEmail,
  buildPriceReceiptEmail,
  type CustomerEmail,
} from '@/lib/email/customer-emails';
import { getPaymentById, getPaymentsByOrderId } from '@/lib/database/payments';
import { CUSTOMER_EMAIL_FROM, sendEmail } from '@/lib/email/send';

function appUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    console.error('[Customer e-mail] NEXT_PUBLIC_APP_URL is not set — e-mail skipped');
    return null;
  }
  return url;
}

async function deliver(
  order: OrderForCustomerEmail,
  email: CustomerEmail,
  idempotencyKey: string
): Promise<void> {
  const to = order.customer.user.email;
  const result = await sendEmail({
    from: CUSTOMER_EMAIL_FROM,
    to: [to],
    replyTo: [COMPANY.email],
    subject: email.subject,
    text: email.text,
    html: email.html,
    idempotencyKey,
  });
  if (result.ok) {
    console.log(`[Customer e-mail] Sent ${idempotencyKey} to ${to}`);
  } else {
    console.error(`[Customer e-mail] Not sent ${idempotencyKey} to ${to}: ${result.error}`);
  }
}

/**
 * #23 — order confirmation. Called by the Vipps agreement-activated webhook
 * right after the first order is inserted (both subscription and one-time).
 */
export async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForCustomerEmail(orderId);
    if (!order) {
      console.error(`[Customer e-mail] Order ${orderId} not found — confirmation skipped`);
      return;
    }

    await deliver(
      order,
      buildOrderConfirmationEmail(order, { appUrl: url }),
      `order-confirmation/${order.id}`
    );
  } catch (error) {
    console.error(`[Customer e-mail] Order confirmation for ${orderId} failed:`, error);
  }
}

/**
 * #26 — price set + receipt. Called by markOrderReadyAndCharge right after
 * the Vipps charge is created (`paymentId` = the new payments row) and by
 * retryChargeAction for a re-charge. `paymentId` is null for a 0-total order
 * that is never charged. One e-mail per created charge: the idempotency key
 * is the payment id (or the order id when nothing is charged).
 */
export async function sendPriceReceiptEmail(
  orderId: string,
  paymentId: string | null
): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForCustomerEmail(orderId);
    if (!order) {
      console.error(`[Customer e-mail] Order ${orderId} not found — price receipt skipped`);
      return;
    }

    const payment = paymentId ? await getPaymentById(paymentId) : null;
    if (paymentId && !payment) {
      // The charge exists; the e-mail still goes out, just without the Vipps reference.
      console.error(`[Customer e-mail] Payment ${paymentId} not found — sending receipt without reference`);
    }

    await deliver(
      order,
      buildPriceReceiptEmail(order, payment, { appUrl: url }),
      `price-receipt/${paymentId ?? `order-${order.id}`}`
    );
  } catch (error) {
    console.error(`[Customer e-mail] Price receipt for ${orderId} failed:`, error);
  }
}

/**
 * #28 — payment failed. Called by the Vipps charge-failed and
 * charge-creation-failed webhook handlers after the payment row is marked
 * `failed`. Keyed on the payment id, so a redelivered webhook sends nothing.
 */
export async function sendPaymentFailedEmail(paymentId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const payment = await getPaymentById(paymentId);
    if (!payment || !payment.order_id) {
      console.error(`[Customer e-mail] Payment ${paymentId} has no order — payment-failed e-mail skipped`);
      return;
    }

    const order = await getOrderForCustomerEmail(payment.order_id);
    if (!order) {
      console.error(`[Customer e-mail] Order ${payment.order_id} not found — payment-failed e-mail skipped`);
      return;
    }

    await deliver(
      order,
      buildPaymentFailedEmail(order, payment, { appUrl: url }),
      `payment-failed/${payment.id}`
    );
  } catch (error) {
    console.error(`[Customer e-mail] Payment-failed e-mail for ${paymentId} failed:`, error);
  }
}

/**
 * #27 — laundry delivered. Called by completeDeliveredOrder after the guarded
 * transition to `completed` (cleaner «Levert til kunden», admin «Marker som
 * levert», dormant driver delivery stop). One e-mail per order: an order is
 * completed once, and the key is the order id.
 */
export async function sendOrderDeliveredEmail(orderId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForCustomerEmail(orderId);
    if (!order) {
      console.error(`[Customer e-mail] Order ${orderId} not found — delivered e-mail skipped`);
      return;
    }

    // [] when the order was never charged (0 total) or the read failed (logged
    // there) — the e-mail then simply carries no payment line.
    const payments = await getPaymentsByOrderId(order.id);

    await deliver(
      order,
      buildOrderDeliveredEmail(order, payments, { appUrl: url }),
      `order-delivered/${order.id}`
    );
  } catch (error) {
    console.error(`[Customer e-mail] Delivered e-mail for ${orderId} failed:`, error);
  }
}
