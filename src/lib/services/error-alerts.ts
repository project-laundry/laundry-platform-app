// Error alerts — the app's error tracker. An unexpected server error is
// logged and e-mailed to every admin right away, so a failure in the payment
// or order flow is seen the same hour instead of in the next daily digest
// (or never). No third-party tracker: the alert goes through the same Resend
// transport as every other e-mail (lib/email/send.ts).
//
// Two entry points call reportError:
// - src/instrumentation.ts `onRequestError` — every error Next.js catches in
//   a page render, route handler or server action (anything unhandled).
// - the catch blocks that deliberately swallow an error so the customer or
//   Vipps is not affected (charge creation, agreement stop, next-order
//   generation, the webhook's 500 path, failed charges).
//
// Contract: NEVER throws, returns void, and must be awaited (a serverless
// function may be frozen as soon as the response is sent). The same error
// from the same source is mailed at most once per hour (Resend
// Idempotency-Key), so a retry storm is one e-mail, not hundreds. The mail
// carries the error text and stack only — never a request body or customer
// data; ids passed in `details` are the caller's choice.

import { createHash } from 'crypto';
import { getUsersByRole } from '@/lib/database/users';
import { sendEmail } from '@/lib/email/send';

/** Same default sender as the daily admin digest. */
const ALERT_DEFAULT_FROM = 'NooraCare <varsel@nooracare.no>';
const MAX_STACK_LINES = 12;

export interface ErrorAlert {
  subject: string;
  text: string;
  idempotencyKey: string;
}

function describe(error: unknown): { message: string; stack: string | null } {
  if (error instanceof Error) {
    const stack = error.stack ? error.stack.split('\n').slice(0, MAX_STACK_LINES).join('\n') : null;
    return { message: error.message || error.name, stack };
  }
  return { message: typeof error === 'string' ? error : JSON.stringify(error) ?? String(error), stack: null };
}

/** Pure: the e-mail for one error. `now` decides the one-per-hour key. */
export function buildErrorAlert(
  source: string,
  error: unknown,
  details: Record<string, string | number | null | undefined> = {},
  now: Date = new Date()
): ErrorAlert {
  const { message, stack } = describe(error);
  const lines = [
    `Kilde: ${source}`,
    `Feil: ${message}`,
    `Tidspunkt: ${now.toISOString()}`,
    ...Object.entries(details)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => `${key}: ${value}`),
  ];
  if (stack) lines.push('', stack);
  lines.push('', 'Samme feil varsles høyst én gang i timen. Se Vercel → Logs for hele forløpet.');

  const fingerprint = createHash('sha256').update(`${source}|${message}`).digest('hex').slice(0, 16);
  return {
    subject: `NooraCare feil: ${source}`,
    text: lines.join('\n'),
    idempotencyKey: `error-alert/${fingerprint}/${now.toISOString().slice(0, 13)}`,
  };
}

/** Log the error and e-mail it to every admin. Never throws. */
export async function reportError(
  source: string,
  error: unknown,
  details: Record<string, string | number | null | undefined> = {}
): Promise<void> {
  try {
    console.error(`[Error alert] ${source}:`, error);

    const recipients = (await getUsersByRole('admin'))
      .filter((user) => user.deleted_at === null)
      .map((user) => user.email);
    if (recipients.length === 0) {
      console.error('[Error alert] No admin users — alert not sent');
      return;
    }

    const alert = buildErrorAlert(source, error, details);
    const result = await sendEmail({
      from: process.env.ADMIN_DIGEST_FROM || ALERT_DEFAULT_FROM,
      to: recipients,
      subject: alert.subject,
      text: alert.text,
      idempotencyKey: alert.idempotencyKey,
    });
    if (!result.ok) {
      console.error(`[Error alert] Not sent ${alert.idempotencyKey}: ${result.error}`);
    }
  } catch (alertError) {
    console.error('[Error alert] Failed to report an error:', alertError);
  }
}
