// The customer e-mails and which of them a customer may turn off
// (/dashboard/settings/emails). Pure. The choices are stored in
// customers.email_preferences; only `false` is meaningful, a missing key means
// "send it". The senders in lib/services/customer-emails.ts ask wantsEmail().

export type CustomerEmailKind =
  | 'order_confirmation'
  | 'cleaner_confirmed'
  | 'pickup_reminder'
  | 'picked_up'
  | 'price_receipt'
  | 'payment_failed'
  | 'delivered'
  | 'evaluation'
  | 'cancelled'
  | 'rescheduled';

export interface CustomerEmailKindInfo {
  id: CustomerEmailKind;
  label: string;
  description: string;
  /** False = always sent: it confirms the agreement, the amount charged or a change to it. */
  optional: boolean;
}

/** In the order a customer meets them. */
export const CUSTOMER_EMAIL_KINDS: CustomerEmailKindInfo[] = [
  { id: 'order_confirmation', label: 'Bestillingsbekreftelse', description: 'Når du har bestilt.', optional: false },
  { id: 'cleaner_confirmed', label: 'Renseren din er på plass', description: 'Når en renser er tildelt en bestilling som ventet.', optional: true },
  { id: 'pickup_reminder', label: 'Påminnelse om henting', description: 'Kvelden før vi henter.', optional: true },
  { id: 'picked_up', label: 'Tøyet er hentet', description: 'Når renseren har hentet tøyet.', optional: true },
  { id: 'price_receipt', label: 'Pris og kvittering', description: 'Når prisen er satt og betalingen sendes til Vipps.', optional: false },
  { id: 'payment_failed', label: 'Betalingen gikk ikke gjennom', description: 'Hvis Vipps ikke får trukket beløpet.', optional: false },
  { id: 'delivered', label: 'Tøyet er levert', description: 'Når tøyet er levert tilbake.', optional: true },
  { id: 'evaluation', label: 'Spørsmål om hvordan det gikk', description: 'Dagen etter at tøyet er levert.', optional: true },
  { id: 'cancelled', label: 'Bestillingen er kansellert', description: 'Når en bestilling blir kansellert.', optional: false },
  { id: 'rescheduled', label: 'Ny hentedato', description: 'Når hentedatoen blir endret.', optional: false },
];

export type EmailPreferences = Partial<Record<CustomerEmailKind, boolean>>;

const OPTIONAL_KINDS = CUSTOMER_EMAIL_KINDS.filter((kind) => kind.optional).map((kind) => kind.id);

/** Path of the settings page; the footer of every customer e-mail links to it. */
export const EMAIL_PREFERENCES_PATH = '/dashboard/settings/emails';

/** Whether the customer gets this kind. Always true for the kinds that cannot be turned off. */
export function wantsEmail(preferences: EmailPreferences | null | undefined, kind: CustomerEmailKind): boolean {
  if (!OPTIONAL_KINDS.includes(kind)) return true;
  return preferences?.[kind] !== false;
}

/**
 * A submitted set of choices as it is stored: exactly one boolean per optional
 * kind, everything else dropped. Null when an optional kind is missing or not
 * a boolean.
 */
export function cleanEmailPreferences(input: unknown): EmailPreferences | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;

  const preferences: EmailPreferences = {};
  for (const kind of OPTIONAL_KINDS) {
    if (typeof raw[kind] !== 'boolean') return null;
    preferences[kind] = raw[kind];
  }
  return preferences;
}
