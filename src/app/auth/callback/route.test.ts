import { describe, it, expect, beforeEach, vi } from 'vitest';

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { verifyOtp, exchangeCodeForSession } })),
}));

import { GET } from './route';

// The route logs Supabase errors; keep test output quiet.
vi.spyOn(console, 'error').mockImplementation(() => {});

const ORIGIN = 'https://test.nooracare.no';

/** Call the handler with a query string (including the leading `?`). */
const get = (query: string) => GET(new Request(`${ORIGIN}/auth/callback${query}`));

const location = (res: Response) => res.headers.get('location');

const customer = { id: 'user-1', user_metadata: { role: 'customer' } };
const cleaner = { id: 'user-2', user_metadata: { role: 'cleaner' } };

beforeEach(() => {
  vi.clearAllMocks();
  verifyOtp.mockResolvedValue({ data: { user: customer, session: {} }, error: null });
  exchangeCodeForSession.mockResolvedValue({ data: { user: customer, session: {} }, error: null });
});

describe('GET /auth/callback — token_hash links', () => {
  it('verifies the OTP and redirects to /dashboard by default', async () => {
    const res = await get('?token_hash=abc&type=signup');

    expect(verifyOtp).toHaveBeenCalledWith({ type: 'signup', token_hash: 'abc' });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
    expect(location(res)).toBe(`${ORIGIN}/dashboard`);
  });

  it('honors a same-site ?next= and ignores an unsafe one', async () => {
    expect(location(await get('?token_hash=abc&type=signup&next=%2Forders%2Fconfirm'))).toBe(
      `${ORIGIN}/orders/confirm`
    );
    expect(location(await get('?token_hash=abc&type=signup&next=https%3A%2F%2Fevil.example'))).toBe(
      `${ORIGIN}/dashboard`
    );
    expect(location(await get('?token_hash=abc&type=signup&next=%2F%2Fevil.example'))).toBe(
      `${ORIGIN}/dashboard`
    );
  });

  it('sends a newly confirmed cleaner to onboarding', async () => {
    verifyOtp.mockResolvedValue({ data: { user: cleaner, session: {} }, error: null });

    expect(location(await get('?token_hash=abc&type=signup'))).toBe(`${ORIGIN}/bli-renser/business`);
  });

  it('redirects to /auth/error when the link is missing or cannot be verified', async () => {
    expect(location(await get(''))).toBe(`${ORIGIN}/auth/error`);
    expect(verifyOtp).not.toHaveBeenCalled();

    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'otp_expired', message: 'Token has expired' },
    });
    expect(location(await get('?token_hash=abc&type=signup'))).toBe(`${ORIGIN}/auth/error`);
  });
});

describe('GET /auth/callback — password recovery', () => {
  it('sends a recovery link to the reset page regardless of role or ?next=', async () => {
    expect(location(await get('?token_hash=abc&type=recovery'))).toBe(`${ORIGIN}/auth/reset-password`);
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });

    verifyOtp.mockResolvedValue({ data: { user: cleaner, session: {} }, error: null });
    expect(location(await get('?token_hash=abc&type=recovery&next=%2Fdashboard'))).toBe(
      `${ORIGIN}/auth/reset-password`
    );
  });

  it('accepts the PKCE ?code= variant and recognises recovery from ?next=', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { user: cleaner, session: {} }, error: null });

    const res = await get('?code=c1&next=%2Fauth%2Freset-password');

    expect(exchangeCodeForSession).toHaveBeenCalledWith('c1');
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(location(res)).toBe(`${ORIGIN}/auth/reset-password`);
  });

  it('sends a broken recovery link back to the forgot page, not /auth/error', async () => {
    verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'otp_expired', message: 'Token has expired' },
    });
    expect(location(await get('?token_hash=abc&type=recovery'))).toBe(
      `${ORIGIN}/auth/forgot-password?expired=1`
    );

    exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'validation_failed', message: 'code verifier missing' },
    });
    expect(location(await get('?code=c1&next=%2Fauth%2Freset-password'))).toBe(
      `${ORIGIN}/auth/forgot-password?expired=1`
    );
  });

  it('prefers token_hash over code when both are present', async () => {
    await get('?token_hash=abc&type=recovery&code=c1');

    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
});
