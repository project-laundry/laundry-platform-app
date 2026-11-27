// Delivery when nobody is home — the one delivery question every order must
// answer at checkout (/orders/pickup). Pure and client-safe: used by the order
// flow, the customer's order page, the cleaner's delivery step, the admin
// order page, the price e-mail and the server-side validation.

import type { DeliveryIfAbsent } from '@/types/database';

/** Max length of the optional delivery note (orders_delivery_instructions_length). */
export const DELIVERY_INSTRUCTIONS_MAX_LENGTH = 500;

/** Short label of the question (summary rows, the order page, the admin page). */
export const DELIVERY_QUESTION = 'Hvis du ikke er hjemme ved levering';

/** The two choices as cards (order flow step 2 and the customer's order page). */
export const DELIVERY_IF_ABSENT_OPTIONS: readonly {
  value: DeliveryIfAbsent;
  title: string;
  subtitle: string;
}[] = [
  { value: 'leave_at_door', title: 'Sett tøyet utenfor døra', subtitle: 'Du trenger ikke være hjemme' },
  { value: 'other', title: 'Annet', subtitle: 'Skriv hva vi skal gjøre' },
];

/** Label and placeholder of the note field, shown only when «Annet» is chosen. */
export const DELIVERY_NOTE_LABEL = 'Hva skal vi gjøre?';
export const DELIVERY_NOTE_PLACEHOLDER = 'F.eks. sett posen i boden, eller lever til naboen i 2. etasje …';

const CUSTOMER_LABELS: Record<DeliveryIfAbsent, string> = {
  leave_at_door: 'Sett tøyet utenfor døra',
  other: 'Annet',
};

const CLEANER_TEXTS: Record<DeliveryIfAbsent, string> = {
  leave_at_door: 'Sett tøyet utenfor døra.',
  other: 'Følg kundens beskjed om levering.',
};

const EMAIL_SENTENCES: Record<DeliveryIfAbsent, string> = {
  leave_at_door: 'Hvis du ikke er hjemme, setter renseren tøyet utenfor døra, slik du har valgt.',
  other: 'Hvis du ikke er hjemme, følger renseren beskjeden din om levering.',
};

export function isDeliveryIfAbsent(value: unknown): value is DeliveryIfAbsent {
  return value === 'leave_at_door' || value === 'other';
}

/**
 * The note to store with the choice: the trimmed text for «Annet», null for
 * every other choice (the note field is only shown for «Annet»).
 */
export function deliveryNote(ifAbsent: unknown, instructions: unknown): string | null {
  if (ifAbsent !== 'other' || typeof instructions !== 'string') return null;
  return instructions.trim() || null;
}

/** The choice as the customer and the admin read it; «Ikke valgt» when there is none. */
export function deliveryIfAbsentLabel(value: unknown): string {
  return isDeliveryIfAbsent(value) ? CUSTOMER_LABELS[value] : 'Ikke valgt';
}

/** The instruction the cleaner reads on the order page. */
export function deliveryCleanerText(value: unknown): string {
  return isDeliveryIfAbsent(value)
    ? CLEANER_TEXTS[value]
    : 'Kunden har ikke valgt hva som skal skje hvis ingen er hjemme. Ring kunden før du setter tøyet igjen.';
}

/** The sentence about the choice in the «Prisen er satt» e-mail. */
export function deliveryEmailSentence(value: DeliveryIfAbsent): string {
  return EMAIL_SENTENCES[value];
}

/**
 * The ONE validation rule for the delivery choice and note — used by the
 * checkout (validateCheckoutInput) and by updateOrderDeliveryAction.
 * Returns a Norwegian, customer-facing error, or null when the input is fine.
 */
export function deliveryInputError(ifAbsent: unknown, instructions: unknown): string | null {
  if (!isDeliveryIfAbsent(ifAbsent)) {
    return 'Velg hva vi gjør hvis du ikke er hjemme ved levering';
  }
  if (
    instructions != null &&
    (typeof instructions !== 'string' || instructions.length > DELIVERY_INSTRUCTIONS_MAX_LENGTH)
  ) {
    return `Beskjed om levering kan ikke være mer enn ${DELIVERY_INSTRUCTIONS_MAX_LENGTH} tegn`;
  }
  if (ifAbsent === 'other' && !deliveryNote(ifAbsent, instructions)) {
    return 'Skriv hva vi skal gjøre hvis du ikke er hjemme';
  }
  return null;
}
