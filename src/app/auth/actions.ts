'use server';

import { findTakenSignupFields } from '@/lib/database/users';

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

  return findTakenSignupFields(email, phone);
}
