// Maps login-page failures to Norwegian messages (/auth/login). Pure
// functions so the mapping can be unit-tested; the page passes supabase-js's
// AuthError in as-is. The page must never show `error.message` — Supabase
// writes it in English ("Invalid login credentials").

import { RATE_LIMIT_MESSAGE } from './signup-errors';

/** One message for a wrong e-mail AND a wrong password — never say which. */
export const INVALID_CREDENTIALS_MESSAGE = 'Feil e-post eller passord.';

export const EMAIL_NOT_CONFIRMED_MESSAGE =
  'E-postadressen din er ikke bekreftet ennå. Åpne e-posten vi sendte deg og trykk på lenken, eller send den på nytt under.';

/** Network failure, server error and everything unknown. */
export const LOGIN_FAILED_MESSAGE = 'Noe gikk galt. Prøv igjen om litt.';

export const RESEND_FAILED_MESSAGE = 'Kunne ikke sende e-posten. Prøv igjen om litt.';

/**
 * Structural subset of supabase-js's AuthError — trivial to construct in
 * tests. `code` is missing on errors raised before a response arrived
 * (network failure: status 0, no code).
 */
export interface LoginErrorLike {
  code?: string;
  status?: number;
  message: string;
}

function isRateLimited(error: LoginErrorLike): boolean {
  return (
    error.status === 429 ||
    error.code === 'over_request_rate_limit' ||
    error.code === 'over_email_send_rate_limit'
  );
}

/** True when the sign-in was refused because the e-mail is not confirmed (the page then offers "send på nytt"). */
export function isEmailNotConfirmedError(error: LoginErrorLike): boolean {
  return error.code === 'email_not_confirmed' || /email not confirmed/i.test(error.message);
}

/** Message for the error box after supabase.auth.signInWithPassword failed. */
export function getSignInErrorMessage(error: LoginErrorLike): string {
  console.error('Login failed:', error);

  if (isEmailNotConfirmedError(error)) {
    return EMAIL_NOT_CONFIRMED_MESSAGE;
  }
  if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
    return INVALID_CREDENTIALS_MESSAGE;
  }
  if (isRateLimited(error)) {
    return RATE_LIMIT_MESSAGE;
  }
  return LOGIN_FAILED_MESSAGE;
}

/** Message under the "send på nytt" button after supabase.auth.resend failed. */
export function getResendConfirmationErrorMessage(error: LoginErrorLike): string {
  console.error('Resending the confirmation e-mail failed:', error);

  if (isRateLimited(error)) {
    return RATE_LIMIT_MESSAGE;
  }
  return RESEND_FAILED_MESSAGE;
}
