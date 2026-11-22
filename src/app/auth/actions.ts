'use server';

import { findTakenSignupFields } from '@/lib/database/users';
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit';

export interface SignupAvailability {
  emailTaken: boolean;
  phoneTaken: boolean;
}

/**
 * Pre-check run by the signup forms (customer + cleaner) before
 * supabase.auth.signUp. Public — the caller is logged out by definition,
 * so there is no role guard. `phone` must be the exact value the page
 * will put in signup metadata (`+47` + 8 digits); `email` is normalised
 * here the same way Supabase Auth normalises it before storing.
 *
 * Rate limited per IP (#118): the answer says whether an e-mail or phone
 * number is registered. A limited caller is told "nothing is taken" — the
 * signup then goes to Supabase Auth, which rejects a duplicate itself.
 */
export async function checkSignupAvailabilityAction(input: {
  email: string;
  phone: string;
}): Promise<SignupAvailability> {
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  if (!email || !phone) {
    return { emailTaken: false, phoneTaken: false };
  }

  if (await isRateLimited('signup-check', await clientIp())) {
    return { emailTaken: false, phoneTaken: false };
  }

  return findTakenSignupFields(email, phone);
}
