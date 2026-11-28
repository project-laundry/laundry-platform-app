// How the laundry is washed and how the customer packs it — the ONE place the
// wash temperatures and the packing texts live. The customer reads them on
// order step 1, the success page and in the pickup reminder e-mail; the
// cleaner reads the same rule on the wash step.

/** Everything is washed at this temperature unless the customer asks for
 *  something else in the wash instructions. */
export const DEFAULT_WASH_TEMPERATURE = 30;

/** Bedding sets are always washed on their own at this temperature. */
export const BEDDING_WASH_TEMPERATURE = 60;

export const WASH_INSTRUCTIONS_MAX_LENGTH = 500;

/** Customer: the packing box on order step 1 — kept short for phones. The
 *  headline rule is the box's subtitle, the field label carries "unless you
 *  ask for something else". */
export const PACKING_RULE = 'Hver pose vaskes for seg.';
export const PACKING_GUIDE: string[] = [
  'Bland gjerne klær og håndklær i samme pose.',
  'Legg sengetøy i en egen pose.',
  `Vi vasker på ${DEFAULT_WASH_TEMPERATURE} grader, sengetøy på ${BEDDING_WASH_TEMPERATURE}.`,
];

export const WASH_INSTRUCTIONS_LABEL = 'Ønsker du noe annet? (valgfritt)';
export const WASH_INSTRUCTIONS_PLACEHOLDER = 'F.eks. håndklær på 60 grader';

/** Customer: one sentence for after the order is placed (success page,
 *  pickup reminder e-mail, the order page). */
export const WASH_RULE_CUSTOMER_TEXT = `Vi vasker på ${DEFAULT_WASH_TEMPERATURE} grader hvis du ikke har bedt om noe annet. Sengetøy vaskes for seg på ${BEDDING_WASH_TEMPERATURE} grader.`;

/** Cleaner: the same rule on the wash step. */
export const WASH_RULE_CLEANER_TEXT = `Vask hver pose for seg – ikke bland poser. Vask på ${DEFAULT_WASH_TEMPERATURE} grader hvis kunden ikke har bedt om noe annet. Sengetøy vaskes på ${BEDDING_WASH_TEMPERATURE} grader.`;

/** Norwegian, customer-facing error for a wash instruction, or null. */
export function washInstructionsError(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string' || value.length > WASH_INSTRUCTIONS_MAX_LENGTH) {
    return `Vaskeinstruksjoner kan ikke være mer enn ${WASH_INSTRUCTIONS_MAX_LENGTH} tegn`;
  }
  return null;
}
