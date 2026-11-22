// One plain-text e-mail to every admin user (`users.role = 'admin'`, not
// deleted) — the recipients of the daily digest, the order alerts and the
// error alerts. Each admin gets their OWN message: with all admins on one
// message, a single bouncing or suppressed address makes Resend suppress the
// mail for everyone, and the operational mail silently stops.
//
// Never throws. Returns how many admins there are and how many sends Resend
// accepted, so the caller decides what a partial failure means.

import { getUsersByRole } from '@/lib/database/users';
import { sendEmail } from '@/lib/email/send';

/** Default sender of every admin mail; override with ADMIN_DIGEST_FROM. */
export const ADMIN_MAIL_DEFAULT_FROM = 'NooraCare <varsel@nooracare.no>';

export interface AdminMailResult {
  recipients: number;
  sent: number;
}

export async function sendToAdmins(message: {
  subject: string;
  text: string;
  /** Per-event key; the admin's user id is appended so each admin's copy is deduplicated on its own. */
  idempotencyKey?: string;
}): Promise<AdminMailResult> {
  const admins = (await getUsersByRole('admin')).filter((user) => user.deleted_at === null);

  let sent = 0;
  for (const admin of admins) {
    const result = await sendEmail({
      from: process.env.ADMIN_DIGEST_FROM || ADMIN_MAIL_DEFAULT_FROM,
      to: [admin.email],
      subject: message.subject,
      text: message.text,
      idempotencyKey: message.idempotencyKey ? `${message.idempotencyKey}/${admin.id}` : undefined,
    });
    if (result.ok) sent += 1;
  }
  return { recipients: admins.length, sent };
}
