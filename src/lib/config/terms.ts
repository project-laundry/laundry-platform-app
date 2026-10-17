// Version of the sales terms (/salgsvilkar) the customer accepts at checkout.
//
// Bump this ISO date (YYYY-MM-DD) whenever the text on /salgsvilkar changes.
// It is stamped into payment_agreements.provider_metadata.terms_consent by
// createSubscriptionAction, so a later terms change can be detected per
// agreement, and /salgsvilkar renders it as its "Sist oppdatert" date so the
// page and the stored version can never drift apart.
export const TERMS_VERSION = '2026-10-17';

/** Render an ISO date version the Norwegian way: '2026-10-17' → '17.10.2026'. */
export function formatTermsVersion(version: string = TERMS_VERSION): string {
  const [year, month, day] = version.split('-');
  return `${day}.${month}.${year}`;
}
