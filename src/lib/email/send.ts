// Resend transport — the ONE place the app talks to Resend. Plain fetch
// against POST https://api.resend.com/emails (no SDK), shared by the admin
// digest cron and the customer e-mails (lib/services/customer-emails.ts).
//
// Never throws: a missing key, a Resend rejection or a network error is
// logged and returned as { ok: false } so the caller decides what to do —
// the digest answers 502, the customer e-mails just give up.
//
// Invented test addresses (seed data, test runs) are never sent: they
// hard-bounce or are rejected, and staging shares the nooracare.no sending
// domain with production, so every bounce hurts real customer mail. A
// skipped address is { ok: true, skipped: true } — a success for every
// caller, because nothing went wrong. Supabase Auth mails go through SMTP,
// not through this file, and are not covered.

const RESEND_SEND_URL = 'https://api.resend.com/emails';

/** Domains (and their subdomains) that can never be a real mailbox: the
 *  RFC 2606 example domains, and test.no, which old seed data used. */
const UNDELIVERABLE_DOMAINS = ['example.com', 'example.org', 'example.net', 'test.no'];

/** Reserved top-level domains (RFC 2606 / RFC 6761). */
const UNDELIVERABLE_TLDS = ['test', 'example', 'invalid', 'localhost'];

/**
 * True for an address that can never be a real mailbox. Pure. Seed scripts
 * use `delivered+<label>@resend.dev` instead, which this lets through.
 */
export function isUndeliverableTestAddress(address: string): boolean {
  const at = address.lastIndexOf('@');
  if (at === -1) return false;
  // Tolerates the "Name <a@b.no>" form: drop a trailing ">" and whitespace.
  const domain = address
    .slice(at + 1)
    .replace(/[>\s]+$/, '')
    .toLowerCase();

  if (UNDELIVERABLE_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`))) {
    return true;
  }
  return UNDELIVERABLE_TLDS.some((tld) => domain === tld || domain.endsWith(`.${tld}`));
}

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

/** `skipped` is set when every recipient was a test address and nothing was sent. */
export type SendEmailResult = { ok: true; skipped?: true } | { ok: false; error: string };

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Email] RESEND_API_KEY is not set — e-mail not sent:', message.subject);
    return { ok: false, error: 'RESEND_API_KEY is not set' };
  }

  const recipients = message.to.filter((address) => !isUndeliverableTestAddress(address));
  if (recipients.length < message.to.length) {
    const skipped = message.to.filter((address) => isUndeliverableTestAddress(address));
    console.log(`[Email] Test address, not sent to ${skipped.join(', ')}: ${message.subject}`);
  }
  if (recipients.length === 0) {
    return { ok: true, skipped: true };
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
        to: recipients,
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
