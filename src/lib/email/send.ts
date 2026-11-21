// Resend transport — the ONE place the app talks to Resend. Plain fetch
// against POST https://api.resend.com/emails (no SDK), shared by the admin
// digest cron and the customer e-mails (lib/services/customer-emails.ts).
//
// Never throws: a missing key, a Resend rejection or a network error is
// logged and returned as { ok: false } so the caller decides what to do —
// the digest answers 502, the customer e-mails just give up.

const RESEND_SEND_URL = 'https://api.resend.com/emails';

/** Sender of every customer-facing e-mail — the same mailbox the Supabase Auth mails use. */
export const CUSTOMER_EMAIL_FROM = 'NooraCare <no-reply@nooracare.no>';

export interface EmailMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string[];
  /**
   * Resend suppresses a second send with the same key for 24 h. Format
   * `<event>/<entity id>` (e.g. `order-confirmation/<order.id>`), max 256
   * chars. This is what makes webhook retries and double-taps safe.
   */
  idempotencyKey?: string;
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY is not set — e-mail not sent:', message.subject);
    return { ok: false, error: 'RESEND_API_KEY is not set' };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  if (message.idempotencyKey) {
    headers['Idempotency-Key'] = message.idempotencyKey;
  }

  try {
    const response = await fetch(RESEND_SEND_URL, {
      method: 'POST',
      headers,
      // JSON.stringify drops undefined keys, so html/reply_to only appear when given.
      body: JSON.stringify({
        from: message.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[Email] Resend rejected the e-mail (${response.status}):`, body);
      return { ok: false, error: `Resend responded ${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error('[Email] Could not reach Resend:', error);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
