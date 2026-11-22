// Staff e-mail sending — «Nytt oppdrag» to the assigned cleaner and the two
// admin alerts («Ny ordre», «Ordre venter på tildeling»). Loads the order,
// builds the e-mail (lib/email/staff-emails.ts) and sends it through Resend
// (lib/email/send.ts).
//
// Same contract as lib/services/customer-emails.ts: every function NEVER
// throws and returns void. The callers are the Vipps webhook and the
// admin's/cleaner's server actions, and a lost e-mail must never fail an
// order or make Vipps retry. Resend's Idempotency-Key (24 h) makes a repeated
// call for the same event a no-op. Plain module, not a server action: it only
// runs behind the verified webhook and the role-guarded callers.

import { COMPANY } from '@/lib/config/company';
import { getOrderForStaffEmail } from '@/lib/database/orders';
import { sendToAdmins } from '@/lib/email/admin-mail';
import { CUSTOMER_EMAIL_FROM, sendEmail } from '@/lib/email/send';
import {
  buildAdminNewOrderEmail,
  buildAdminOrderUnassignedEmail,
  buildCleanerNewOrderEmail,
  type StaffTextEmail,
} from '@/lib/email/staff-emails';

function appUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) {
    console.error('[Staff e-mail] NEXT_PUBLIC_APP_URL is not set — e-mail skipped');
    return null;
  }
  return url;
}

/** One plain-text e-mail per admin user — the same recipients as the digest. */
async function deliverToAdmins(email: StaffTextEmail, idempotencyKey: string): Promise<void> {
  const { recipients, sent } = await sendToAdmins({ ...email, idempotencyKey });
  if (recipients === 0) {
    console.error(`[Staff e-mail] No admin users — ${idempotencyKey} not sent`);
  } else if (sent < recipients) {
    console.error(`[Staff e-mail] ${idempotencyKey}: only ${sent} of ${recipients} admin(s) reached`);
  } else {
    console.log(`[Staff e-mail] Sent ${idempotencyKey} to ${recipients} admin(s)`);
  }
}

/**
 * «Nytt oppdrag» to the cleaner who holds the order right now. Called after
 * the first order is created (Vipps webhook), after an admin assignment or
 * re-assignment (assignCleanerAction) and after an automatic re-assignment
 * (declineCleanerOrder). The order is re-read here, so the mail always goes
 * to the current cleaner. An order without a cleaner is skipped silently.
 *
 * Idempotency key: order id + cleaner id + assigned_at. assigned_at is
 * re-stamped on every assignment, so A → B → A within Resend's 24 h window
 * is three e-mails, while a repeated call for the same assignment is one.
 */
export async function sendCleanerNewOrderEmail(orderId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForStaffEmail(orderId);
    if (!order) {
      console.error(`[Staff e-mail] Order ${orderId} not found — new-order e-mail to the cleaner skipped`);
      return;
    }
    if (!order.cleaner_id || !order.cleaner) {
      console.log(`[Staff e-mail] Order ${orderId} has no cleaner — nothing to send to a cleaner`);
      return;
    }
    if (order.status !== 'pickup_scheduled') {
      // Declined again, cancelled or already picked up since the assignment.
      console.error(
        `[Staff e-mail] Order ${orderId} is ${order.status}, not pickup_scheduled — new-order e-mail to the cleaner skipped`
      );
      return;
    }

    const to = order.cleaner.user.email;
    const idempotencyKey = `cleaner-new-order/${order.id}/${order.cleaner_id}/${order.assigned_at ?? 'none'}`;
    const email = buildCleanerNewOrderEmail(order, { appUrl: url });
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
      console.log(`[Staff e-mail] Sent ${idempotencyKey} to ${to}`);
    } else {
      console.error(`[Staff e-mail] Not sent ${idempotencyKey} to ${to}: ${result.error}`);
    }
  } catch (error) {
    console.error(`[Staff e-mail] New-order e-mail to the cleaner for ${orderId} failed:`, error);
  }
}

/**
 * «Ny ordre» to every admin. Called once per FIRST order by the Vipps
 * agreement-activated webhook, right after the order is inserted (the
 * duplicate-delivery branch never gets there). Keyed on the order id.
 */
export async function sendAdminNewOrderEmail(orderId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForStaffEmail(orderId);
    if (!order) {
      console.error(`[Staff e-mail] Order ${orderId} not found — new-order e-mail to admins skipped`);
      return;
    }

    await deliverToAdmins(
      buildAdminNewOrderEmail(order, { appUrl: url }),
      `admin-new-order/${order.id}`
    );
  } catch (error) {
    console.error(`[Staff e-mail] New-order e-mail to admins for ${orderId} failed:`, error);
  }
}

/**
 * «Ordre venter på tildeling» to every admin. Called by declineCleanerOrder
 * when a cleaner declined and no other cleaner took the order.
 * `declinedByName` is the display name of the cleaner who declined. Skipped
 * when the order is no longer pending_assignment (someone assigned or
 * cancelled it in the meantime). Keyed on order id + number of declines, so
 * each decline that ends without a cleaner alerts once.
 */
export async function sendAdminOrderUnassignedEmail(
  orderId: string,
  declinedByName: string
): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const order = await getOrderForStaffEmail(orderId);
    if (!order) {
      console.error(`[Staff e-mail] Order ${orderId} not found — waiting-for-assignment e-mail skipped`);
      return;
    }
    if (order.status !== 'pending_assignment') {
      console.log(
        `[Staff e-mail] Order ${orderId} is ${order.status}, not pending_assignment — waiting-for-assignment e-mail skipped`
      );
      return;
    }

    const declineCount = (order.declined_by_cleaner_ids ?? []).length;
    await deliverToAdmins(
      buildAdminOrderUnassignedEmail(order, { declinedByName }, { appUrl: url }),
      `admin-order-unassigned/${order.id}/${declineCount}`
    );
  } catch (error) {
    console.error(`[Staff e-mail] Waiting-for-assignment e-mail for ${orderId} failed:`, error);
  }
}
