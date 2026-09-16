// Maps signup outcomes to Norwegian messages. Shared by the customer
// (/auth/signup) and cleaner (/bli-renser/signup) forms.
//
// Supabase Auth hides WHICH constraint failed inside the handle_new_user
// trigger (the client only ever sees "Database error saving new user"),
// so the pages run checkSignupAvailabilityAction first; the mapping below
// is the fallback for races and for auth users with no public.users row.

export const EMAIL_TAKEN_MESSAGE =
  'E-postadressen er allerede registrert. Logg inn i stedet.';

export const PHONE_TAKEN_MESSAGE =
  'Telefonnummeret er allerede registrert. Har du konto fra før? Logg inn i stedet.';

export const EMAIL_AND_PHONE_TAKEN_MESSAGE =
  'E-postadressen og telefonnummeret er allerede registrert. Logg inn i stedet.';

const TRIGGER_FAILURE_MESSAGE =
  'Kunne ikke opprette kontoen. Telefonnummeret eller e-postadressen kan allerede være i bruk. Har du konto fra før? Logg inn i stedet.';

const WEAK_PASSWORD_MESSAGE = 'Passordet er for svakt. Velg et lengre eller mer variert passord.';

const RATE_LIMIT_MESSAGE = 'For mange forsøk. Vent litt og prøv igjen.';

const GENERIC_MESSAGE = 'Kunne ikke opprette kontoen. Prøv igjen om litt.';

/** Result of checkSignupAvailabilityAction → message for the error box, or null if nothing is taken. */
export function getTakenFieldsMessage(availability: {
  emailTaken: boolean;
  phoneTaken: boolean;
}): string | null {
  if (availability.emailTaken && availability.phoneTaken) return EMAIL_AND_PHONE_TAKEN_MESSAGE;
  if (availability.emailTaken) return EMAIL_TAKEN_MESSAGE;
  if (availability.phoneTaken) return PHONE_TAKEN_MESSAGE;
  return null;
}

/**
 * Structural subset of supabase-js's AuthResponse — enough to decide, and
 * trivial to construct in tests.
 */
export interface SignUpOutcome {
  data: { user: { identities?: unknown[] } | null };
  error: { code?: string; message: string } | null;
}

/**
 * Message for the error box after supabase.auth.signUp, or null on success.
 *
 * - A fake user with identities [] is what Supabase returns for an already
 *   registered e-mail when e-mail confirmation is on (no error is set).
 * - 'user_already_exists' is the same situation when confirmation is off.
 * - 'unexpected_failure' / "Database error …" is a trigger failure: the
 *   only remaining causes after client validation are unique violations.
 */
export function getSignUpErrorMessage(outcome: SignUpOutcome): string | null {
  const { data, error } = outcome;

  if (!error) {
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return EMAIL_TAKEN_MESSAGE;
    }
    return null;
  }

  console.error('Signup failed:', error);

  if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) {
    return EMAIL_TAKEN_MESSAGE;
  }
  if (error.code === 'unexpected_failure' || /database error/i.test(error.message)) {
    return TRIGGER_FAILURE_MESSAGE;
  }
  if (error.code === 'weak_password') {
    return WEAK_PASSWORD_MESSAGE;
  }
  if (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return RATE_LIMIT_MESSAGE;
  }
  return GENERIC_MESSAGE;
}
