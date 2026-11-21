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
import { buildOrderConfirmationEmail, type CustomerEmail } from '@/lib/email/customer-emails';
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
