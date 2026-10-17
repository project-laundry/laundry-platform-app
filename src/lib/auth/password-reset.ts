// Password-reset flow helpers shared by /auth/forgot-password,
// /auth/reset-password and /auth/callback. Pure functions so the message
// mapping can be unit-tested; the pages pass supabase-js's AuthError in
// as-is (its `code` is `string | undefined`).

import { RATE_LIMIT_MESSAGE, WEAK_PASSWORD_MESSAGE } from './signup-errors';

/** Where a recovery link ends up. The forgot page puts it in `redirectTo`
 *  (`/auth/callback?next=/auth/reset-password`) and the callback uses it to
 *  recognise a recovery link that arrives as PKCE `?code=` without a `type`. */
export const RESET_PASSWORD_PATH = '/auth/reset-password';

/** Where the callback sends a recovery link it could not verify. */
export const RESET_LINK_EXPIRED_PATH = '/auth/forgot-password?expired=1';

export const INVALID_EMAIL_MESSAGE = 'Skriv inn en gyldig e-postadresse.';

export const RESET_REQUEST_FAILED_MESSAGE = 'Kunne ikke sende e-posten. Prøv igjen om litt.';

export const RESET_LINK_EXPIRED_MESSAGE =
  'Lenken har utløpt eller er allerede brukt. Be om en ny lenke under.';

export const SAME_PASSWORD_MESSAGE = 'Det nye passordet må være forskjellig fra det gamle.';

export const UPDATE_PASSWORD_FAILED_MESSAGE =
  'Kunne ikke lagre det nye passordet. Prøv igjen om litt.';

/** Structural subset of supabase-js's AuthError — trivial to construct in tests. */
export interface AuthErrorLike {
  code?: string;
  message: string;
}

/** Message for the error strip after supabase.auth.resetPasswordForEmail failed. */
export function getResetRequestErrorMessage(error: AuthErrorLike): string {
  console.error('Password reset request failed:', error);

  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return RATE_LIMIT_MESSAGE;
  }
  if (error.code === 'validation_failed' || error.code === 'email_address_invalid') {
    return INVALID_EMAIL_MESSAGE;
  }
  return RESET_REQUEST_FAILED_MESSAGE;
}

/** Message for the error strip after supabase.auth.updateUser({ password }) failed. */
export function getUpdatePasswordErrorMessage(error: AuthErrorLike): string {
  console.error('Password update failed:', error);

  if (error.code === 'same_password') {
    return SAME_PASSWORD_MESSAGE;
  }
  if (error.code === 'weak_password') {
    return WEAK_PASSWORD_MESSAGE;
  }
  if (
    error.code === 'session_expired' ||
    error.code === 'session_not_found' ||
    /session missing/i.test(error.message)
  ) {
    return RESET_LINK_EXPIRED_MESSAGE;
  }
  if (error.code === 'over_request_rate_limit') {
    return RATE_LIMIT_MESSAGE;
  }
  return UPDATE_PASSWORD_FAILED_MESSAGE;
}
