import { describe, it, expect, vi } from 'vitest';
import { RATE_LIMIT_MESSAGE, WEAK_PASSWORD_MESSAGE } from './signup-errors';
import {
  INVALID_EMAIL_MESSAGE,
  RESET_LINK_EXPIRED_MESSAGE,
  RESET_REQUEST_FAILED_MESSAGE,
  SAME_PASSWORD_MESSAGE,
  UPDATE_PASSWORD_FAILED_MESSAGE,
  getResetRequestErrorMessage,
  getUpdatePasswordErrorMessage,
} from './password-reset';

// The helpers log raw Supabase errors; keep test output quiet.
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('getResetRequestErrorMessage', () => {
  it('maps e-mail and request rate limits to the shared rate-limit message', () => {
    expect(getResetRequestErrorMessage({ code: 'over_email_send_rate_limit', message: 'x' })).toBe(
      RATE_LIMIT_MESSAGE
    );
    expect(getResetRequestErrorMessage({ code: 'over_request_rate_limit', message: 'x' })).toBe(
      RATE_LIMIT_MESSAGE
    );
  });

  it('maps validation failures to the invalid e-mail message', () => {
    expect(getResetRequestErrorMessage({ code: 'validation_failed', message: 'x' })).toBe(
      INVALID_EMAIL_MESSAGE
    );
    expect(getResetRequestErrorMessage({ code: 'email_address_invalid', message: 'x' })).toBe(
      INVALID_EMAIL_MESSAGE
    );
  });

  it('falls back to the generic message for anything else', () => {
    expect(getResetRequestErrorMessage({ message: 'boom' })).toBe(RESET_REQUEST_FAILED_MESSAGE);
    expect(getResetRequestErrorMessage({ code: 'unexpected_failure', message: 'boom' })).toBe(
      RESET_REQUEST_FAILED_MESSAGE
    );
  });
});

describe('getUpdatePasswordErrorMessage', () => {
  it('tells the user the password must differ from the old one', () => {
    expect(getUpdatePasswordErrorMessage({ code: 'same_password', message: 'x' })).toBe(
      SAME_PASSWORD_MESSAGE
    );
  });

  it('reuses the signup weak-password message', () => {
    expect(getUpdatePasswordErrorMessage({ code: 'weak_password', message: 'x' })).toBe(
      WEAK_PASSWORD_MESSAGE
    );
  });

  it('treats a missing or expired session as an expired link', () => {
    expect(getUpdatePasswordErrorMessage({ code: 'session_expired', message: 'x' })).toBe(
      RESET_LINK_EXPIRED_MESSAGE
    );
    expect(getUpdatePasswordErrorMessage({ code: 'session_not_found', message: 'x' })).toBe(
      RESET_LINK_EXPIRED_MESSAGE
    );
    expect(getUpdatePasswordErrorMessage({ message: 'Auth session missing!' })).toBe(
      RESET_LINK_EXPIRED_MESSAGE
    );
  });

  it('maps request rate limits and falls back to the generic message', () => {
    expect(getUpdatePasswordErrorMessage({ code: 'over_request_rate_limit', message: 'x' })).toBe(
      RATE_LIMIT_MESSAGE
    );
    expect(getUpdatePasswordErrorMessage({ message: 'boom' })).toBe(UPDATE_PASSWORD_FAILED_MESSAGE);
  });
});
