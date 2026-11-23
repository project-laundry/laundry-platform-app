// Staff e-mail sending — «Nytt oppdrag» to the assigned cleaner and the
// admin alerts («Ny ordre», «Ordre venter på tildeling», «Ny renser venter på
// godkjenning»). Loads the order or the cleaner, builds the e-mail
// (lib/email/staff-emails.ts) and sends it through Resend (lib/email/send.ts).
//
// Same contract as lib/services/customer-emails.ts: every function NEVER
// throws and returns void. The callers are the Vipps webhook and the
// admin's/cleaner's server actions, and a lost e-mail must never fail an
// order or make Vipps retry. Resend's Idempotency-Key (24 h) makes a repeated
// call for the same event a no-op. Plain module, not a server action: it only
// runs behind the verified webhook and the role-guarded callers.

import { COMPANY } from '@/lib/config/company';
import { getCleanerWithUserById } from '@/lib/database/cleaners';
import { getOrderForStaffEmail } from '@/lib/database/orders';
import { sendToAdmins } from '@/lib/email/admin-mail';
import { CUSTOMER_EMAIL_FROM, sendEmail } from '@/lib/email/send';
import {
  buildAdminNewCleanerEmail,
  buildAdminNewOrderEmail,
  buildAdminOrderUnassignedEmail,
  buildCleanerNewOrderEmail,
  buildCleanerOrderMovedEmail,
  buildCleanerPickupRescheduledEmail,
  type StaffTextEmail,
} from '@/lib/email/staff-emails';
import type { CustomerEmail } from '@/lib/email/customer-emails';

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

/** One e-mail to one cleaner — same sender and reply-to as «Nytt oppdrag». */
async function deliverToCleaner(
  to: string,
  email: CustomerEmail,
  idempotencyKey: string
): Promise<void> {
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
}

/**
 * Tells the cleaner side that a pickup date was moved. Called after the write
 * by updateOrderPickupDateAction (customer) and updateOrderDetailsAction
 * (admin). `before` is the order row as the action read it BEFORE the write:
 * the old date, the cleaner who held the order, and the updated_at that
 * identifies the changed row version (bumped by a trigger on every update).
 * The order is re-read here.
 *
 * - No cleaner held the order, or the date did not change → nothing.
 * - Same cleaner still holds it → «Ny hentedato» to that cleaner (skipped
 *   unless the order is pickup_scheduled).
 * - Another cleaner holds it now (the customer moved the pickup to a weekday
 *   the previous cleaner does not work) → «Oppdraget er flyttet» to the
 *   previous cleaner, then «Nytt oppdrag» to the new one.
 *
 * Idempotency keys end in before.updated_at, like the customer's
 * pickup-rescheduled key: every real change has its own key, so A → B → A
 * within Resend's 24 h window is three e-mails, while a repeated call for the
 * same change is one.
 */
export async function sendCleanerPickupRescheduledEmails(
  orderId: string,
  before: { scheduled_date: string; cleaner_id: string | null; updated_at: string }
): Promise<void> {
  try {
    if (!before.cleaner_id) return; // nobody to tell

    const url = appUrl();
    if (!url) return;

    const order = await getOrderForStaffEmail(orderId);
    if (!order) {
      console.error(`[Staff e-mail] Order ${orderId} not found — new-pickup-date e-mail to the cleaner skipped`);
      return;
    }
    if (order.scheduled_date === before.scheduled_date) {
      return; // same date saved again — nothing changed
    }

    if (order.cleaner_id === before.cleaner_id) {
      if (order.status !== 'pickup_scheduled' || !order.cleaner) {
        console.error(
          `[Staff e-mail] Order ${orderId} is ${order.status}, not pickup_scheduled — new-pickup-date e-mail to the cleaner skipped`
        );
        return;
      }
      await deliverToCleaner(
        order.cleaner.user.email,
        buildCleanerPickupRescheduledEmail(
          order,
          { previousPickupDate: before.scheduled_date },
          { appUrl: url }
        ),
        `cleaner-pickup-rescheduled/${order.id}/${order.cleaner_id}/${before.updated_at}`
      );
      return;
    }

    // The order left the previous cleaner.
    const previousCleaner = await getCleanerWithUserById(before.cleaner_id);
    if (previousCleaner) {
      await deliverToCleaner(
        previousCleaner.user.email,
        buildCleanerOrderMovedEmail(
          {
            orderNumber: order.order_number,
            previousPickupDate: before.scheduled_date,
            cleanerFullName: previousCleaner.user.full_name,
          },
          { appUrl: url }
        ),
        `cleaner-order-moved/${order.id}/${before.cleaner_id}/${before.updated_at}`
      );
    } else {
      console.error(
        `[Staff e-mail] Cleaner ${before.cleaner_id} not found — order-moved e-mail for ${orderId} skipped`
      );
    }

    // «Nytt oppdrag» to whoever holds the order now. Never throws; skips
    // itself when the order has no cleaner or is not pickup_scheduled.
    await sendCleanerNewOrderEmail(orderId);
  } catch (error) {
    console.error(`[Staff e-mail] New-pickup-date e-mails to the cleaner for ${orderId} failed:`, error);
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

/**
 * «Ny renser venter på godkjenning» to every admin. Called once by
 * createCleanerProfileAction right after the cleaners row is inserted.
 * Keyed on the cleaner id.
 */
export async function sendAdminNewCleanerEmail(cleanerId: string): Promise<void> {
  try {
    const url = appUrl();
    if (!url) return;

    const cleaner = await getCleanerWithUserById(cleanerId);
    if (!cleaner) {
      console.error(`[Staff e-mail] Cleaner ${cleanerId} not found — new-cleaner e-mail to admins skipped`);
      return;
    }

    await deliverToAdmins(
      buildAdminNewCleanerEmail(
        {
          id: cleaner.id,
          display_name: cleaner.display_name,
          full_name: cleaner.user?.full_name ?? '',
          base_city: cleaner.base_city,
          business_type: cleaner.business_type,
        },
        { appUrl: url }
      ),
      `admin-new-cleaner/${cleaner.id}`
    );
  } catch (error) {
    console.error(`[Staff e-mail] New-cleaner e-mail to admins for ${cleanerId} failed:`, error);
  }
}
