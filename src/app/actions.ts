'use server';

import { addWaitlistSignup } from '@/lib/database/waitlist';
import { EMAIL_RE } from '@/lib/utils/email';
import type { WaitlistAudience, WaitlistCity } from '@/types/database';

export type WaitlistResult = { ok: true } | { ok: false; error: string };

const AUDIENCES: WaitlistAudience[] = ['customer', 'cleaner'];
const CITIES: WaitlistCity[] = ['bergen', 'oslo'];

/**
 * Public waitlist signup from the coming-soon pages. No role guard — the
 * visitor is anonymous. Submitting the form is the consent: the form states
 * right under the button that we send one email when we open and nothing
 * else (GDPR art. 6(1)(a)); we only store the email, audience and city.
 */
export async function joinWaitlistAction(input: {
  email: string;
  audience: WaitlistAudience;
  city: WaitlistCity;
}): Promise<WaitlistResult> {
  const email = input.email.trim().toLowerCase();

  if (!EMAIL_RE.test(email) || email.length > 255) {
    return { ok: false, error: 'Skriv inn en gyldig e-postadresse' };
  }
  if (!AUDIENCES.includes(input.audience) || !CITIES.includes(input.city)) {
    return { ok: false, error: 'Velg Bergen eller Oslo' };
  }

  const saved = await addWaitlistSignup({ email, audience: input.audience, city: input.city });
  if (!saved) {
    return { ok: false, error: 'Noe gikk galt. Prøv igjen om litt.' };
  }
  return { ok: true };
}
