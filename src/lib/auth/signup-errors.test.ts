import { describe, it, expect, vi } from 'vitest';
import {
  getSignUpErrorMessage,
  getTakenFieldsMessage,
  EMAIL_TAKEN_MESSAGE,
  PHONE_TAKEN_MESSAGE,
  EMAIL_AND_PHONE_TAKEN_MESSAGE,
} from './signup-errors';

// The helper logs raw Supabase errors; keep test output quiet.
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('getTakenFieldsMessage', () => {
  it('returns null when nothing is taken', () => {
    expect(getTakenFieldsMessage({ emailTaken: false, phoneTaken: false })).toBeNull();
  });

  it('names the phone when only the phone is taken', () => {
    expect(getTakenFieldsMessage({ emailTaken: false, phoneTaken: true })).toBe(PHONE_TAKEN_MESSAGE);
  });

  it('names the e-mail when only the e-mail is taken', () => {
    expect(getTakenFieldsMessage({ emailTaken: true, phoneTaken: false })).toBe(EMAIL_TAKEN_MESSAGE);
  });

  it('names both when both are taken', () => {
    expect(getTakenFieldsMessage({ emailTaken: true, phoneTaken: true })).toBe(
      EMAIL_AND_PHONE_TAKEN_MESSAGE
    );
  });
});

describe('getSignUpErrorMessage', () => {
  it('returns null for a real new user', () => {
    expect(
      getSignUpErrorMessage({
        data: { user: { identities: [{ provider: 'email' }] } },
        error: null,
      })
    ).toBeNull();
  });

  it('treats a fake user with empty identities as an already-registered e-mail', () => {
    expect(
      getSignUpErrorMessage({ data: { user: { identities: [] } }, error: null })
    ).toBe(EMAIL_TAKEN_MESSAGE);
  });

  it('maps user_already_exists to the e-mail message', () => {
    expect(
      getSignUpErrorMessage({
        data: { user: null },
        error: { code: 'user_already_exists', message: 'User already registered' },
      })
    ).toBe(EMAIL_TAKEN_MESSAGE);
  });

  it('maps a trigger failure to the "may already be in use" hint', () => {
    const message = getSignUpErrorMessage({
      data: { user: null },
      error: { code: 'unexpected_failure', message: 'Database error saving new user' },
    });

    expect(message).toContain('Telefonnummeret eller e-postadressen');
  });

  it('maps a trigger failure by message when no code is present', () => {
    const message = getSignUpErrorMessage({
      data: { user: null },
      error: { message: 'Database error saving new user' },
    });

    expect(message).toContain('Telefonnummeret eller e-postadressen');
  });

  it('maps weak_password and rate limits to Norwegian', () => {
    expect(
      getSignUpErrorMessage({
        data: { user: null },
        error: { code: 'weak_password', message: 'Password should be at least 6 characters.' },
      })
    ).toContain('Passordet');

    expect(
      getSignUpErrorMessage({
        data: { user: null },
        error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' },
      })
    ).toContain('For mange forsøk');
  });

  it('never leaks the raw English message for unknown errors', () => {
    const message = getSignUpErrorMessage({
      data: { user: null },
      error: { code: 'signup_disabled', message: 'Signups not allowed for this instance' },
    });

    expect(message).not.toContain('Signups not allowed');
    expect(message).toContain('Kunne ikke opprette kontoen');
  });
});
