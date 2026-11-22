import { describe, it, expect, vi } from 'vitest';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { RATE_LIMIT_MESSAGE } from './signup-errors';
import {
  EMAIL_NOT_CONFIRMED_MESSAGE,
  INVALID_CREDENTIALS_MESSAGE,
  LOGIN_FAILED_MESSAGE,
  RESEND_FAILED_MESSAGE,
  getResendConfirmationErrorMessage,
  getSignInErrorMessage,
  isEmailNotConfirmedError,
} from './login-errors';

// The helpers log raw Supabase errors; keep test output quiet.
vi.spyOn(console, 'error').mockImplementation(() => {});

describe('getSignInErrorMessage', () => {
  it('maps wrong credentials to one message that does not say which field is wrong', () => {
    expect(
      getSignInErrorMessage({ code: 'invalid_credentials', status: 400, message: 'x' })
    ).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(INVALID_CREDENTIALS_MESSAGE).toBe('Feil e-post eller passord.');
  });

  it('recognises wrong credentials by the English message when the code is missing', () => {
    expect(getSignInErrorMessage({ status: 400, message: 'Invalid login credentials' })).toBe(
      INVALID_CREDENTIALS_MESSAGE
    );
  });

  it('tells an unconfirmed user to open the confirmation e-mail', () => {
    expect(
      getSignInErrorMessage({ code: 'email_not_confirmed', status: 400, message: 'x' })
    ).toBe(EMAIL_NOT_CONFIRMED_MESSAGE);
    expect(getSignInErrorMessage({ status: 400, message: 'Email not confirmed' })).toBe(
      EMAIL_NOT_CONFIRMED_MESSAGE
    );
  });

  it('maps rate limits by code and by HTTP 429', () => {
    expect(
      getSignInErrorMessage({ code: 'over_request_rate_limit', status: 429, message: 'x' })
    ).toBe(RATE_LIMIT_MESSAGE);
    expect(getSignInErrorMessage({ status: 429, message: 'Too Many Requests' })).toBe(
      RATE_LIMIT_MESSAGE
    );
  });

  it('falls back to the generic message for network, server and unknown errors', () => {
    expect(getSignInErrorMessage({ status: 0, message: 'Failed to fetch' })).toBe(
      LOGIN_FAILED_MESSAGE
    );
    expect(getSignInErrorMessage({ status: 503, message: 'Service Unavailable' })).toBe(
      LOGIN_FAILED_MESSAGE
    );
    expect(getSignInErrorMessage({ code: 'user_banned', status: 400, message: 'User is banned' })).toBe(
      LOGIN_FAILED_MESSAGE
    );
    expect(getSignInErrorMessage({ message: 'boom' })).toBe(LOGIN_FAILED_MESSAGE);
  });

  it('accepts the real supabase-js error classes and never returns their English text', () => {
    const wrongPassword = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials');
    const offline = new AuthRetryableFetchError('Failed to fetch', 0);

    expect(getSignInErrorMessage(wrongPassword)).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(getSignInErrorMessage(offline)).toBe(LOGIN_FAILED_MESSAGE);
  });
});

describe('isEmailNotConfirmedError', () => {
  it('is true only for the unconfirmed e-mail error', () => {
    expect(isEmailNotConfirmedError({ code: 'email_not_confirmed', message: 'x' })).toBe(true);
    expect(isEmailNotConfirmedError({ message: 'Email not confirmed' })).toBe(true);
    expect(isEmailNotConfirmedError({ code: 'invalid_credentials', message: 'x' })).toBe(false);
    expect(isEmailNotConfirmedError({ status: 0, message: 'Failed to fetch' })).toBe(false);
  });
});

describe('getResendConfirmationErrorMessage', () => {
  it('maps the e-mail send limit and HTTP 429 to the rate-limit message', () => {
    expect(
      getResendConfirmationErrorMessage({
        code: 'over_email_send_rate_limit',
        status: 429,
        message: 'x',
      })
    ).toBe(RATE_LIMIT_MESSAGE);
    expect(getResendConfirmationErrorMessage({ status: 429, message: 'x' })).toBe(
      RATE_LIMIT_MESSAGE
    );
  });

  it('falls back to the generic resend message for anything else', () => {
    expect(getResendConfirmationErrorMessage({ status: 0, message: 'Failed to fetch' })).toBe(
      RESEND_FAILED_MESSAGE
    );
    expect(getResendConfirmationErrorMessage({ message: 'boom' })).toBe(RESEND_FAILED_MESSAGE);
  });
});
